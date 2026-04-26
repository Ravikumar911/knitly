import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pc from "picocolors";
import {
  describeCredentialStore,
  readStoredCredentials,
  writeStoredCredentials,
} from "../config/credentials.js";
import { loadConfig, writeConfig } from "../config/load.js";
import type { SlashcashConfig } from "../config/schema.js";
import {
  ensureStateDirs,
  resolvePaths,
  type SlashcashPaths,
} from "../config/paths.js";
import { CliError } from "../errors/format.js";
import { ensurePythonEnvReady } from "../python/env.js";
import { loadDatabase } from "../runtime/database.js";
import { loadImapClient } from "../runtime/tasks.js";
import {
  commandExists,
  runCommand,
  runInteractive,
} from "../runtime/subprocess.js";
import { installBundledSkills } from "../skills/registry.js";
import {
  FINAL_SUMMARY,
  PRE_APP_PASSWORD_INPUT,
  TOP_BANNER,
} from "../privacy/copy.js";
import {
  createClackPrompter,
  WizardCancelledError,
} from "../wizard/clack-prompter.js";
import type { WizardPrompter } from "../wizard/prompts.js";

const HOMEBREW_INSTALL_URL = "https://brew.sh/";
const APP_PASSWORD_URL = "https://myaccount.google.com/apppasswords";
const OLLAMA_FORMULA = "ollama";
const DEFAULT_CHAT_MODEL = "gemma4:latest";

type DetectResult =
  | { done: true; message?: string }
  | { done: false; message?: string };

type OnboardContext = {
  paths: SlashcashPaths;
  config: SlashcashConfig;
  dryRun: boolean;
  skipExternal: boolean;
  yes: boolean;
  nonInteractive: boolean;
  freshConfig: boolean;
  prompter: WizardPrompter;
  pendingPassword: string | null;
  credentialStore: "keychain" | "file" | null;
};

type Step = {
  id: string;
  label: string;
  detect(ctx: OnboardContext): Promise<DetectResult> | DetectResult;
  install(ctx: OnboardContext): Promise<void> | void;
  verify(ctx: OnboardContext): Promise<void> | void;
};

export async function runOnboard(
  options: {
    dryRun?: boolean;
    skipExternal?: boolean;
    yes?: boolean;
    nonInteractive?: boolean;
  } = {},
) {
  const paths = resolvePaths();
  const freshConfig = !existsSync(paths.config);
  const ctx: OnboardContext = {
    paths,
    config: loadConfig({ createIfMissing: true }),
    dryRun: options.dryRun === true,
    skipExternal: options.skipExternal === true || options.dryRun === true,
    yes: options.yes === true,
    nonInteractive: options.nonInteractive === true,
    freshConfig,
    prompter: createClackPrompter(),
    pendingPassword: null,
    credentialStore: null,
  };

  const activeState = { step: "welcome" };
  const onCancel = () => {
    console.error(
      `\nCancelled at step ${activeState.step}. Run \`slashcash doctor --fix\` to resume.`,
    );
    process.exit(130);
  };

  process.once("SIGINT", onCancel);

  try {
    ctx.prompter.intro("slashcash setup");
    if (process.env.SLASHCASH_E2E !== "1") {
      ctx.prompter.note(TOP_BANNER);
    }

    await runPipeline(ctx, buildSteps(), activeState);
    printFinalSummary(ctx);
    ctx.prompter.outro(
      `Onboarding complete. Open http://${ctx.config.server.host}:${ctx.config.server.port}.`,
    );
  } catch (error) {
    if (error instanceof WizardCancelledError) {
      process.exitCode = 130;
      return;
    }
    throw error;
  } finally {
    process.off("SIGINT", onCancel);
  }
}

function buildSteps(): Step[] {
  return [
    welcomeStep,
    stateDirStep,
    dbMigrateStep,
    gmailAccountStep,
    gmailAppPasswordStep,
    imapVerifyStep,
    localProfileStep,
    pythonEnvStep,
    bundledSkillsStep,
    kickoffSyncStep,
  ];
}

async function runPipeline(
  ctx: OnboardContext,
  steps: Step[],
  activeState: { step: string },
) {
  for (const step of steps) {
    activeState.step = step.id;
    const detected = await step.detect(ctx);
    if (detected.done) {
      console.log(
        `${pc.green("done")} ${step.label}${detected.message ? `: ${detected.message}` : ""}`,
      );
      continue;
    }

    await step.install(ctx);
    await step.verify(ctx);
    console.log(pc.green(`done ${step.label}`));
  }
}

function isSkipped(ctx: OnboardContext) {
  return ctx.skipExternal || process.env.SLASHCASH_E2E === "1";
}

const homebrewStep: Step = {
  id: "homebrew",
  label: "Homebrew",
  detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    return commandExists("brew")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install() {
    throw new CliError({
      area: "binary",
      symptom: "Homebrew is required.",
      cause: "slashcash uses Homebrew to install Ollama on macOS.",
      fix: `Install Homebrew from ${HOMEBREW_INSTALL_URL}, then rerun \`slashcash onboard\`.`,
      docs: HOMEBREW_INSTALL_URL,
    });
  },
  verify() {
    if (!commandExists("brew")) {
      throw new Error("brew is still missing from PATH.");
    }
  },
};

const welcomeStep: Step = {
  id: "welcome",
  label: "Welcome",
  detect() {
    return { done: true, message: "local Gmail + SQLite setup" };
  },
  install() {},
  verify() {},
};

const modelQuestionStep: Step = {
  id: "chat-model",
  label: "Chat model",
  detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: ctx.config.ai.chatModel };
    }
    if (!ctx.freshConfig || ctx.yes) {
      return { done: true, message: ctx.config.ai.chatModel };
    }
    return { done: false };
  },
  async install(ctx) {
    if (ctx.nonInteractive) {
      throw new CliError({
        area: "config",
        symptom: "Onboarding needs one model choice.",
        cause:
          "`--non-interactive` was passed without a saved config or `--yes`.",
        fix: "Run `slashcash onboard --yes` to accept the default model.",
      });
    }

    const model = await ctx.prompter.select({
      message: "Choose the local chat model.",
      initialValue: ctx.config.ai.chatModel || DEFAULT_CHAT_MODEL,
      options: [
        {
          value: DEFAULT_CHAT_MODEL,
          label: DEFAULT_CHAT_MODEL,
          hint: "Default multimodal Gemma 4 (larger download).",
        },
        {
          value: "gemma4:e2b",
          label: "gemma4:e2b",
          hint: "Smaller Gemma 4 build.",
        },
        {
          value: "qwen2.5:7b",
          label: "qwen2.5:7b",
          hint: "Larger and slower, usually stronger.",
        },
      ],
    });
    ctx.config.ai.chatModel = model;
    ctx.config.ai.visionModel ||= model;
    writeConfig(ctx.config);
  },
  verify(ctx) {
    if (!ctx.config.ai.chatModel.trim()) {
      throw new Error("chat model is empty.");
    }
  },
};

const ollamaInstallStep: Step = {
  id: "ollama-install",
  label: "Ollama install",
  detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    return commandExists("ollama")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install(ctx) {
    const stepSpinner = ctx.prompter.spinner();
    stepSpinner.start("Installing Ollama with Homebrew");
    const result = runCommand("brew", ["install", OLLAMA_FORMULA], {
      timeoutMs: 10 * 60_000,
    });
    if (!result.ok) {
      stepSpinner.error("brew install ollama failed");
      throw new Error(
        result.stderr || result.stdout || "brew install ollama failed.",
      );
    }
    stepSpinner.stop("Ollama installed");
  },
  verify() {
    if (!commandExists("ollama")) {
      throw new Error("ollama is still missing from PATH.");
    }
  },
};

const ollamaServiceStep: Step = {
  id: "ollama-service",
  label: "Ollama service",
  async detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    return (await isOllamaReachable(ctx.config.ai.ollamaBaseUrl, 250))
      ? { done: true, message: "reachable" }
      : { done: false };
  },
  async install(ctx) {
    const stepSpinner = ctx.prompter.spinner();
    stepSpinner.start("Starting Ollama background service");
    runCommand("brew", ["services", "start", OLLAMA_FORMULA], {
      timeoutMs: 60_000,
    });
    if (!(await isOllamaReachable(ctx.config.ai.ollamaBaseUrl, 20_000))) {
      stepSpinner.error("Ollama did not become reachable");
      throw new Error(
        "Ollama did not become reachable. Try: brew services restart ollama",
      );
    }
    stepSpinner.stop("Ollama service is reachable");
  },
  async verify(ctx) {
    if (!(await isOllamaReachable(ctx.config.ai.ollamaBaseUrl, 1_000))) {
      throw new Error("Ollama is not reachable.");
    }
  },
};

const ollamaPullStep: Step = {
  id: "ollama-pull",
  label: "Ollama model",
  detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    const list = runCommand("ollama", ["list"], { timeoutMs: 15_000 });
    if (!list.ok) return { done: false };
    return list.stdout.includes(ctx.config.ai.chatModel)
      ? { done: true, message: ctx.config.ai.chatModel }
      : { done: false };
  },
  async install(ctx) {
    const stepSpinner = ctx.prompter.spinner();
    stepSpinner.start(`Pulling ${ctx.config.ai.chatModel}`);
    const code = await runInteractive("ollama", [
      "pull",
      ctx.config.ai.chatModel,
    ]);
    if (code !== 0) {
      stepSpinner.error(`ollama pull exited with ${code}`);
      throw new Error(`ollama pull exited with ${code}.`);
    }
    stepSpinner.stop(`${ctx.config.ai.chatModel} is ready`);
  },
  verify(ctx) {
    const list = runCommand("ollama", ["list"], { timeoutMs: 15_000 });
    if (!list.ok || !list.stdout.includes(ctx.config.ai.chatModel)) {
      throw new Error(`${ctx.config.ai.chatModel} is not available in ollama.`);
    }
  },
};

const gmailAccountStep: Step = {
  id: "gmail-account",
  label: "Gmail account",
  detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    const address = ctx.config.gmail.address.trim();
    return address ? { done: true, message: address } : { done: false };
  },
  async install(ctx) {
    if (ctx.nonInteractive) {
      throw new CliError({
        area: "auth",
        symptom: "A Gmail address is required.",
        cause:
          "`--non-interactive` was passed before Gmail credentials were configured.",
        fix: "Run `slashcash onboard` interactively and enter the Gmail address you want to sync.",
      });
    }

    const address = await ctx.prompter.text({
      message: "Enter the Gmail address to sync.",
      placeholder: "you@gmail.com",
      defaultValue: ctx.config.gmail.address || undefined,
      validate(value) {
        return isEmailAddress(value)
          ? undefined
          : "Enter a valid Gmail address.";
      },
    });

    ctx.config.gmail.address = address.trim().toLowerCase();
    writeConfig(ctx.config);
  },
  verify(ctx) {
    if (!isEmailAddress(ctx.config.gmail.address)) {
      throw new Error("gmail address is empty.");
    }
  },
};

const gmailAppPasswordStep: Step = {
  id: "gmail-app-password",
  label: "Gmail app password",
  async detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }

    const credentials = await readStoredCredentials();
    if (
      credentials &&
      credentials.address === ctx.config.gmail.address.trim().toLowerCase()
    ) {
      ctx.credentialStore = credentials.store;
      return {
        done: true,
        message: describeCredentialStore(credentials.store),
      };
    }

    return { done: false };
  },
  async install(ctx) {
    if (ctx.nonInteractive) {
      throw new CliError({
        area: "auth",
        symptom: "A Gmail app password is required.",
        cause:
          "`--non-interactive` was passed before Gmail IMAP credentials were configured.",
        fix: "Run `slashcash onboard` interactively, generate an app password, and paste it into the wizard.",
        docs: APP_PASSWORD_URL,
      });
    }

    ctx.prompter.note(PRE_APP_PASSWORD_INPUT, "Gmail app password");
    const password = await ctx.prompter.password({
      message: "Paste the 16-character Gmail app password.",
      validate(value) {
        const normalized = normalizeAppPassword(value);
        return normalized.length === 16
          ? undefined
          : "Paste the full 16-character app password (spaces are okay).";
      },
    });
    ctx.pendingPassword = normalizeAppPassword(password);
  },
  verify(ctx) {
    if (!ctx.pendingPassword || ctx.pendingPassword.length !== 16) {
      throw new Error("gmail app password is not set.");
    }
  },
};

const imapVerifyStep: Step = {
  id: "imap-verify",
  label: "Gmail IMAP verify",
  async detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }

    const credentials = await readStoredCredentials();
    if (
      credentials &&
      credentials.address === ctx.config.gmail.address.trim().toLowerCase() &&
      !ctx.pendingPassword
    ) {
      ctx.credentialStore = credentials.store;
      return {
        done: true,
        message: `${ctx.config.gmail.imapServer} (${credentials.address})`,
      };
    }

    return { done: false };
  },
  async install(ctx) {
    const { verifyImapLogin } = await loadImapClient();

    while (true) {
      const stepSpinner = ctx.prompter.spinner();
      stepSpinner.start(`Verifying ${ctx.config.gmail.imapServer}`);
      const result = await verifyImapLogin({
        address: ctx.config.gmail.address,
        appPassword: ctx.pendingPassword || undefined,
      });

      if (result.ok) {
        const stored = await writeStoredCredentials({
          address: ctx.config.gmail.address,
          appPassword: ctx.pendingPassword || "",
        });
        ctx.credentialStore = stored.store;
        ctx.pendingPassword = null;
        ctx.config.gmail.passwordStore = stored.store;
        writeConfig(ctx.config);
        stepSpinner.stop(`Connected as ${stored.address}`);
        return;
      }

      stepSpinner.error(result.error.symptom);
      if (ctx.nonInteractive) {
        throw Object.assign(new Error(result.error.message), {
          area: "auth",
          symptom: result.error.symptom,
          cause: result.error.cause,
          fix: result.error.fix,
          docs: result.error.docsUrl,
        });
      }

      ctx.prompter.note(
        [
          `symptom: ${result.error.symptom}`,
          `cause: ${result.error.cause}`,
          `fix: ${result.error.fix}`,
        ].join("\n"),
        "Gmail IMAP check failed",
      );

      const retry = await ctx.prompter.confirm({
        message: "Retry with a different app password?",
        initialValue: true,
      });
      if (!retry) {
        throw Object.assign(new Error(result.error.message), {
          area: "auth",
          symptom: result.error.symptom,
          cause: result.error.cause,
          fix: result.error.fix,
          docs: result.error.docsUrl,
        });
      }

      const password = await ctx.prompter.password({
        message: "Paste a new Gmail app password.",
        validate(value) {
          const normalized = normalizeAppPassword(value);
          return normalized.length === 16
            ? undefined
            : "Paste the full 16-character app password (spaces are okay).";
        },
      });
      ctx.pendingPassword = normalizeAppPassword(password);
    }
  },
  async verify(ctx) {
    const credentials = await readStoredCredentials();
    if (!credentials) {
      throw new Error("gmail credentials were not saved.");
    }
  },
};

const stateDirStep: Step = {
  id: "state-dir",
  label: "State directory",
  detect(ctx) {
    ensureStateDirs(ctx.paths);
    return { done: true, message: ctx.paths.home };
  },
  install(ctx) {
    ensureStateDirs(ctx.paths);
  },
  verify(ctx) {
    ensureStateDirs(ctx.paths);
  },
};

const dbMigrateStep: Step = {
  id: "db-migrate",
  label: "SQLite database",
  async detect(ctx) {
    process.env.SQLITE_DB_PATH = ctx.paths.db;
    const { ensureLocalDatabase } = await loadDatabase();
    ensureLocalDatabase();
    return { done: true, message: ctx.paths.db };
  },
  async install(ctx) {
    process.env.SQLITE_DB_PATH = ctx.paths.db;
    const { ensureLocalDatabase } = await loadDatabase();
    ensureLocalDatabase();
  },
  async verify(ctx) {
    process.env.SQLITE_DB_PATH = ctx.paths.db;
    const { ensureLocalDatabase } = await loadDatabase();
    ensureLocalDatabase();
  },
};

const localProfileStep: Step = {
  id: "local-profile",
  label: "Local profile",
  async detect(ctx) {
    const email = normalizedGmailAddress(ctx);
    if (!email) {
      return { done: true, message: "local placeholder" };
    }

    process.env.SQLITE_DB_PATH = ctx.paths.db;
    const { ensureLocalDatabase, getLocalProfileIdentity, LOCAL_USER_ID } =
      await loadDatabase();
    ensureLocalDatabase();

    const profile = await getLocalProfileIdentity(LOCAL_USER_ID);
    return profile.email === email
      ? { done: true, message: email }
      : { done: false };
  },
  async install(ctx) {
    await syncLocalProfile(ctx);
  },
  async verify(ctx) {
    const email = normalizedGmailAddress(ctx);
    if (!email) {
      return;
    }

    process.env.SQLITE_DB_PATH = ctx.paths.db;
    const { ensureLocalDatabase, getLocalProfileIdentity, LOCAL_USER_ID } =
      await loadDatabase();
    ensureLocalDatabase();

    const profile = await getLocalProfileIdentity(LOCAL_USER_ID);
    if (profile.email !== email) {
      throw new Error("local profile email did not update.");
    }
  },
};

const bundledSkillsStep: Step = {
  id: "bundled-skills",
  label: "Bundled skills",
  detect() {
    installBundledSkills();
    return { done: true, message: "gmail-swiggy installed" };
  },
  install() {
    installBundledSkills();
  },
  verify() {
    installBundledSkills();
  },
};

const pythonEnvStep: Step = {
  id: "python-env",
  label: "PDF extractor",
  async detect(ctx) {
    if (
      process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED === "1" ||
      ctx.config.pdfExtractor.enabled === false
    ) {
      return { done: true, message: "disabled" };
    }

    const result = await ensurePythonEnvReady({
      config: ctx.config,
      paths: ctx.paths,
      fix: false,
    });
    if (!result.ok) {
      return { done: false };
    }

    return { done: true, message: result.runtime.pythonBin };
  },
  async install(ctx) {
    const pid = startDetachedCommand(ctx, ["doctor", "--fix", "--quick"]);
    console.log(
      pc.yellow(
        `Installing PDF extractor in the background (pid ${pid}); sync will use body-only extraction until it is ready.`,
      ),
    );
  },
  verify() {
    return;
  },
};

const kickoffSyncStep: Step = {
  id: "kickoff-sync",
  label: "Initial sync",
  detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    return { done: false };
  },
  install(ctx) {
    const pid = startDetachedCommand(ctx, ["sync", "--full"]);
    const pidPath = join(ctx.paths.home, "pid", "sync.pid");
    mkdirSync(dirname(pidPath), { recursive: true });
    writeFileSync(pidPath, `${pid}\n`, { mode: 0o600 });
  },
  verify(ctx) {
    const pidPath = join(ctx.paths.home, "pid", "sync.pid");
    if (!existsSync(pidPath)) {
      throw new Error("initial sync pid file was not written.");
    }
  },
};

function printFinalSummary(ctx: OnboardContext) {
  console.log(pc.green("Local slash.cash state is ready."));
  console.log(`home        ${ctx.paths.home}`);
  console.log(`database    ${ctx.paths.db}`);
  console.log(`skills      ${ctx.paths.skills}`);
  console.log(
    `dashboard   http://${ctx.config.server.host}:${ctx.config.server.port}`,
  );
  console.log(`assistant   ${ctx.config.assistant.provider}`);
  console.log(
    FINAL_SUMMARY({
      credentialStore: describeCredentialStore(ctx.credentialStore),
    }),
  );
}

function startDetachedCommand(ctx: OnboardContext, args: string[]) {
  const child = spawn("pnpm", ["--filter", "slashcash", "dev", "--", ...args], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      SLASHCASH_HOME: ctx.paths.home,
      SQLITE_DB_PATH: ctx.paths.db,
      SLASHCASH_ATTACHMENTS_DIR: ctx.paths.attachments,
    },
  });
  child.unref();
  return child.pid ?? 0;
}

async function isOllamaReachable(baseUrl: string, timeoutMs: number) {
  const endpoint = new URL(baseUrl);
  endpoint.pathname = "/api/tags";
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(Math.min(1_000, timeoutMs)),
      });
      if (response.ok) return true;
    } catch {
      // Retry until the outer timeout expires.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

function isEmailAddress(value: string | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function normalizeAppPassword(value: string | undefined) {
  return (value || "").replace(/\s+/g, "");
}

function normalizedGmailAddress(ctx: OnboardContext) {
  const email = ctx.config.gmail.address.trim().toLowerCase();
  return email || null;
}

async function syncLocalProfile(ctx: OnboardContext) {
  const email = normalizedGmailAddress(ctx);
  if (!email) {
    return;
  }

  process.env.SQLITE_DB_PATH = ctx.paths.db;
  const { ensureLocalDatabase, syncLocalProfileIdentity, LOCAL_USER_ID } =
    await loadDatabase();
  ensureLocalDatabase();
  await syncLocalProfileIdentity(LOCAL_USER_ID, email);
}
