import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join } from "node:path";
import type { SlashcashConfig } from "../local-state/schema";
import {
  FINAL_SUMMARY,
  PRE_APP_PASSWORD_INPUT,
  TOP_BANNER,
} from "./privacy";
import type { OnboardContext, OnboardStep } from "./pipeline";
import { OnboardError } from "./types";

const HOMEBREW_INSTALL_URL = "https://brew.sh/";
const APP_PASSWORD_URL = "https://myaccount.google.com/apppasswords";
const OLLAMA_FORMULA = "ollama";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_OLLAMA_CHAT_MODEL = "gemma4:latest";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
const DEFAULT_ANTHROPIC_CHAT_MODEL = "claude-haiku-4-5";

type AssistantProvider = SlashcashConfig["assistant"]["provider"];
type HostedAssistantProvider = Extract<
  AssistantProvider,
  "openai-compatible" | "anthropic"
>;

export function buildOnboardSteps(): OnboardStep[] {
  return [
    welcomeStep,
    assistantProviderStep,
    homebrewStep,
    ollamaInstallStep,
    ollamaServiceStep,
    modelQuestionStep,
    ollamaPullStep,
    stateDirStep,
    dbMigrateStep,
    gmailAccountStep,
    gmailAppPasswordStep,
    imapVerifyStep,
    localProfileStep,
    pythonEnvStep,
    bundledSkillsStep,
    kickoffSyncStep,
    dashboardServiceStep,
  ];
}

export function listOnboardStepIds() {
  return buildOnboardSteps().map((step) => step.id);
}

function isSkipped(ctx: OnboardContext) {
  return ctx.skipExternal || process.env.SLASHCASH_E2E === "1";
}

function isHostedAssistant(ctx: OnboardContext) {
  return isHostedAssistantProvider(ctx.config.assistant.provider);
}

function isHostedAssistantProvider(
  provider: AssistantProvider,
): provider is HostedAssistantProvider {
  return provider === "openai-compatible" || provider === "anthropic";
}

function isOllamaAssistant(ctx: OnboardContext) {
  return ctx.config.assistant.provider === "ollama-local";
}

function providerDefaults(provider: AssistantProvider) {
  if (provider === "anthropic") {
    return {
      provider,
      baseUrl: DEFAULT_ANTHROPIC_BASE_URL,
      chatModel: DEFAULT_ANTHROPIC_CHAT_MODEL,
    } as const;
  }
  if (provider === "openai-compatible") {
    return {
      provider,
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      chatModel: DEFAULT_OPENAI_CHAT_MODEL,
    } as const;
  }
  return {
    provider: "ollama-local" as const,
    baseUrl: DEFAULT_OLLAMA_BASE_URL,
    chatModel: DEFAULT_OLLAMA_CHAT_MODEL,
  };
}

function setAssistantConfig(
  ctx: OnboardContext,
  input: {
    provider: Exclude<AssistantProvider, "none">;
    baseUrl?: string;
    chatModel?: string;
  },
) {
  const defaults = providerDefaults(input.provider);
  ctx.config.assistant = {
    provider: input.provider,
    baseUrl: input.baseUrl || defaults.baseUrl,
    chatModel: input.chatModel || defaults.chatModel,
  };
  if (input.provider === "ollama-local") {
    ctx.config.ai.ollamaBaseUrl = ctx.config.assistant.baseUrl;
    ctx.config.ai.chatModel = ctx.config.assistant.chatModel;
    ctx.config.ai.visionModel ||= ctx.config.assistant.chatModel;
  }
  ctx.host.writeConfig(ctx.config);
}

async function promptToOpenAppPasswordPage(ctx: OnboardContext) {
  await ctx.ui.text({
    message: "Press Enter to open Google App Passwords in your browser.",
  });

  const stepSpinner = ctx.ui.spinner();
  stepSpinner.start("Opening Google App Passwords");
  try {
    ctx.host.openUrl(APP_PASSWORD_URL);
    stepSpinner.stop("Opened Google App Passwords");
  } catch (error) {
    stepSpinner.error("Could not open Google App Passwords");
    throw new OnboardError({
      area: "auth",
      symptom: "Could not open the Google App Passwords page.",
      cause: error instanceof Error ? error.message : String(error),
      fix: "Open https://myaccount.google.com/apppasswords in your browser, then continue setup.",
      docs: APP_PASSWORD_URL,
    });
  }
}

const welcomeStep: OnboardStep = {
  id: "welcome",
  label: "Welcome",
  detect() {
    return { done: true, message: "local Gmail + SQLite setup" };
  },
  install() {},
  verify() {},
};

const assistantProviderStep: OnboardStep = {
  id: "assistant-provider",
  label: "Assistant provider",
  async detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return {
        done: true,
        message:
          ctx.config.assistant.provider === "none"
            ? "skipped by local/E2E mode"
            : ctx.config.assistant.provider,
      };
    }

    if (ctx.config.assistant.provider !== "none" && !ctx.freshConfig) {
      const provider = ctx.config.assistant.provider;
      if (isHostedAssistantProvider(provider)) {
        const existing = await ctx.host.readAssistantCredential(provider);
        if (!existing) {
          return { done: false, message: "missing assistant API key" };
        }
      }
      return { done: true, message: provider };
    }

    if (ctx.yes) {
      if (ctx.config.assistant.provider === "none") {
        setAssistantConfig(ctx, providerDefaults("ollama-local"));
      }
      return { done: true, message: ctx.config.assistant.provider };
    }

    if (ctx.config.assistant.provider === "none") {
      return { done: false };
    }
    const provider = ctx.config.assistant.provider;
    if (isHostedAssistantProvider(provider)) {
      const existing = await ctx.host.readAssistantCredential(provider);
      if (!existing) {
        return { done: false, message: "missing assistant API key" };
      }
    }
    return { done: true, message: provider };
  },
  async install(ctx) {
    if (ctx.nonInteractive) {
      throw new OnboardError({
        area: "config",
        symptom: "Onboarding needs an assistant provider choice.",
        cause:
          "`nonInteractive` was set before the assistant provider was configured.",
        fix: "Pass yes: true to use local Ollama, or configure the assistant provider first.",
      });
    }

    const provider = await ctx.ui.select({
      message: "Where should slash.cash run extraction and chat?",
      initialValue:
        ctx.config.assistant.provider === "none"
          ? "ollama-local"
          : ctx.config.assistant.provider,
      options: [
        {
          value: "ollama-local",
          label: "Ollama",
          hint: "Runs locally with gemma4:latest.",
        },
        {
          value: "openai-compatible",
          label: "OpenAI",
          hint: "Hosted OpenAI-compatible API.",
        },
        {
          value: "anthropic",
          label: "Anthropic",
          hint: "Hosted Claude-compatible config.",
        },
      ],
    });

    setAssistantConfig(ctx, providerDefaults(provider));

    if (provider === "openai-compatible" || provider === "anthropic") {
      const existing = await ctx.host.readAssistantCredential(provider);
      if (!existing) {
        const apiKey = await ctx.ui.password({
          message:
            provider === "anthropic"
              ? "Paste the Anthropic API key."
              : "Paste the OpenAI API key.",
          validate(value) {
            return value?.trim() ? undefined : "API key is required.";
          },
        });
        await ctx.host.writeAssistantCredential({ provider, apiKey });
      }
    }
  },
  verify(ctx) {
    if (ctx.config.assistant.provider === "none") {
      throw new Error("assistant provider is not configured.");
    }
  },
};

const homebrewStep: OnboardStep = {
  id: "homebrew",
  label: "Homebrew",
  detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    if (isHostedAssistant(ctx)) {
      return { done: true, message: "hosted assistant provider" };
    }
    if (platform() !== "darwin") {
      return { done: true, message: "not required on this platform" };
    }
    return ctx.host.commandExists("brew")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install() {
    throw new OnboardError({
      area: "binary",
      symptom: "Homebrew is required.",
      cause: "slashcash uses Homebrew to install Ollama on macOS.",
      fix: `Install Homebrew from ${HOMEBREW_INSTALL_URL}, then resume setup.`,
      docs: HOMEBREW_INSTALL_URL,
    });
  },
  verify(ctx) {
    if (!ctx.host.commandExists("brew")) {
      throw new Error("brew is still missing from PATH.");
    }
  },
};

const modelQuestionStep: OnboardStep = {
  id: "chat-model",
  label: "Chat model",
  detect(ctx) {
    if (!isOllamaAssistant(ctx)) {
      return { done: true, message: ctx.config.assistant.chatModel };
    }
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: ctx.config.assistant.chatModel };
    }
    if (!ctx.freshConfig || ctx.yes) {
      return { done: true, message: ctx.config.assistant.chatModel };
    }
    return { done: false };
  },
  async install(ctx) {
    if (ctx.nonInteractive) {
      throw new OnboardError({
        area: "config",
        symptom: "Onboarding needs one model choice.",
        cause: "`nonInteractive` was set without a saved config or yes: true.",
        fix: "Pass yes: true to accept the default model.",
      });
    }

    const model = await ctx.ui.select({
      message: "Choose the local chat model.",
      initialValue: ctx.config.assistant.chatModel || DEFAULT_OLLAMA_CHAT_MODEL,
      options: [
        {
          value: DEFAULT_OLLAMA_CHAT_MODEL,
          label: DEFAULT_OLLAMA_CHAT_MODEL,
          hint: "Local Gemma 4 (multimodal).",
        },
      ],
    });
    ctx.config.assistant.chatModel = model;
    ctx.config.assistant.baseUrl ||= DEFAULT_OLLAMA_BASE_URL;
    ctx.config.ai.chatModel = model;
    ctx.config.ai.ollamaBaseUrl = ctx.config.assistant.baseUrl;
    ctx.config.ai.visionModel ||= model;
    ctx.host.writeConfig(ctx.config);
  },
  verify(ctx) {
    if (!ctx.config.assistant.chatModel.trim()) {
      throw new Error("chat model is empty.");
    }
  },
};

const ollamaInstallStep: OnboardStep = {
  id: "ollama-install",
  label: "Ollama install",
  detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    if (isHostedAssistant(ctx)) {
      return { done: true, message: "hosted assistant provider" };
    }
    return ctx.host.commandExists("ollama")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install(ctx) {
    if (platform() !== "darwin") {
      throw new OnboardError({
        area: "binary",
        symptom: "Ollama is required for the local assistant provider.",
        cause: "slash.cash could not find `ollama` in PATH.",
        fix: "Install Ollama for your platform from https://ollama.com/download, then resume setup.",
        docs: "https://ollama.com/download",
      });
    }
    const stepSpinner = ctx.ui.spinner();
    stepSpinner.start("Installing Ollama with Homebrew");
    const result = ctx.host.runCommand("brew", ["install", OLLAMA_FORMULA], {
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
  verify(ctx) {
    if (!ctx.host.commandExists("ollama")) {
      throw new Error("ollama is still missing from PATH.");
    }
  },
};

const ollamaServiceStep: OnboardStep = {
  id: "ollama-service",
  label: "Ollama service",
  async detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    if (isHostedAssistant(ctx)) {
      return { done: true, message: "hosted assistant provider" };
    }
    return (await ctx.host.isOllamaReachable(ctx.config.assistant.baseUrl, 250))
      ? { done: true, message: "reachable" }
      : { done: false };
  },
  async install(ctx) {
    const stepSpinner = ctx.ui.spinner();
    stepSpinner.start("Starting Ollama background service");
    if (platform() === "darwin" && ctx.host.commandExists("brew")) {
      ctx.host.runCommand("brew", ["services", "start", OLLAMA_FORMULA], {
        timeoutMs: 60_000,
      });
    } else {
      ctx.host.runCommand("ollama", ["serve"], { timeoutMs: 1_000 });
    }
    if (
      !(await ctx.host.isOllamaReachable(ctx.config.assistant.baseUrl, 20_000))
    ) {
      stepSpinner.error("Ollama did not become reachable");
      throw new Error(
        platform() === "darwin"
          ? "Ollama did not become reachable. Try: brew services restart ollama"
          : "Ollama did not become reachable. Start `ollama serve` and resume setup.",
      );
    }
    stepSpinner.stop("Ollama service is reachable");
  },
  async verify(ctx) {
    if (
      !(await ctx.host.isOllamaReachable(ctx.config.assistant.baseUrl, 1_000))
    ) {
      throw new Error("Ollama is not reachable.");
    }
  },
};

const ollamaPullStep: OnboardStep = {
  id: "ollama-pull",
  label: "Ollama model",
  detect(ctx) {
    if (isSkipped(ctx)) {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    if (isHostedAssistant(ctx)) {
      return { done: true, message: "hosted assistant provider" };
    }
    const list = ctx.host.runCommand("ollama", ["list"], { timeoutMs: 15_000 });
    if (!list.ok) return { done: false };
    return list.stdout.includes(ctx.config.assistant.chatModel)
      ? { done: true, message: ctx.config.assistant.chatModel }
      : { done: false };
  },
  async install(ctx) {
    const stepSpinner = ctx.ui.spinner();
    stepSpinner.start(`Pulling ${ctx.config.assistant.chatModel}`);
    const code = await ctx.host.runInteractive("ollama", [
      "pull",
      ctx.config.assistant.chatModel,
    ]);
    if (code !== 0) {
      stepSpinner.error(`ollama pull exited with ${code}`);
      throw new Error(`ollama pull exited with ${code}.`);
    }
    stepSpinner.stop(`${ctx.config.assistant.chatModel} is ready`);
  },
  verify(ctx) {
    const list = ctx.host.runCommand("ollama", ["list"], { timeoutMs: 15_000 });
    if (!list.ok || !list.stdout.includes(ctx.config.assistant.chatModel)) {
      throw new Error(
        `${ctx.config.assistant.chatModel} is not available in ollama.`,
      );
    }
  },
};

const gmailAccountStep: OnboardStep = {
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
      throw new OnboardError({
        area: "auth",
        symptom: "A Gmail address is required.",
        cause:
          "`nonInteractive` was set before Gmail credentials were configured.",
        fix: "Enter the Gmail address you want to sync during interactive setup.",
      });
    }

    const address = await ctx.ui.text({
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
    ctx.host.writeConfig(ctx.config);
  },
  verify(ctx) {
    if (!isEmailAddress(ctx.config.gmail.address)) {
      throw new Error("gmail address is empty.");
    }
  },
};

const gmailAppPasswordStep: OnboardStep = {
  id: "gmail-app-password",
  label: "Gmail app password",
  async detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }

    const credentials = await ctx.host.readStoredCredentials();
    if (
      credentials &&
      credentials.address === ctx.config.gmail.address.trim().toLowerCase()
    ) {
      ctx.credentialStore = credentials.store;
      return {
        done: true,
        message: ctx.host.describeCredentialStore(credentials.store),
      };
    }

    return { done: false };
  },
  async install(ctx) {
    if (ctx.nonInteractive) {
      throw new OnboardError({
        area: "auth",
        symptom: "A Gmail app password is required.",
        cause:
          "`nonInteractive` was set before Gmail IMAP credentials were configured.",
        fix: "Generate an app password and paste it into the setup wizard.",
        docs: APP_PASSWORD_URL,
      });
    }

    ctx.ui.note(PRE_APP_PASSWORD_INPUT, "Gmail app password");
    await promptToOpenAppPasswordPage(ctx);
    const password = await ctx.ui.password({
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

const imapVerifyStep: OnboardStep = {
  id: "imap-verify",
  label: "Gmail IMAP verify",
  async detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }

    const credentials = await ctx.host.readStoredCredentials();
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
    while (true) {
      const stepSpinner = ctx.ui.spinner();
      stepSpinner.start(`Verifying ${ctx.config.gmail.imapServer}`);
      const result = await ctx.host.verifyImapLogin({
        address: ctx.config.gmail.address,
        appPassword: ctx.pendingPassword || undefined,
      });

      if (result.ok) {
        const stored = await ctx.host.writeStoredCredentials({
          address: ctx.config.gmail.address,
          appPassword: ctx.pendingPassword || "",
        });
        ctx.credentialStore = stored.store;
        ctx.pendingPassword = null;
        ctx.config.gmail.passwordStore = stored.store;
        ctx.host.writeConfig(ctx.config);
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

      ctx.ui.note(
        [
          `symptom: ${result.error.symptom}`,
          `cause: ${result.error.cause}`,
          `fix: ${result.error.fix}`,
        ].join("\n"),
        "Gmail IMAP check failed",
      );

      const retry = await ctx.ui.confirm({
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

      await promptToOpenAppPasswordPage(ctx);
      const password = await ctx.ui.password({
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
    const credentials = await ctx.host.readStoredCredentials();
    if (!credentials) {
      throw new Error("gmail credentials were not saved.");
    }
  },
};

const stateDirStep: OnboardStep = {
  id: "state-dir",
  label: "State directory",
  detect(ctx) {
    ctx.host.ensureStateDirs(ctx.paths);
    return { done: true, message: ctx.paths.home };
  },
  install(ctx) {
    ctx.host.ensureStateDirs(ctx.paths);
  },
  verify(ctx) {
    ctx.host.ensureStateDirs(ctx.paths);
  },
};

const dbMigrateStep: OnboardStep = {
  id: "db-migrate",
  label: "SQLite database",
  async detect(ctx) {
    await ctx.host.ensureLocalDatabase(ctx.paths.db);
    return { done: true, message: ctx.paths.db };
  },
  async install(ctx) {
    await ctx.host.ensureLocalDatabase(ctx.paths.db);
  },
  async verify(ctx) {
    await ctx.host.ensureLocalDatabase(ctx.paths.db);
  },
};

const localProfileStep: OnboardStep = {
  id: "local-profile",
  label: "Local profile",
  async detect(ctx) {
    const email = normalizedGmailAddress(ctx);
    if (!email) {
      return { done: true, message: "local placeholder" };
    }

    const profileEmail = await ctx.host.getLocalProfileEmail(ctx.paths.db);
    return profileEmail === email
      ? { done: true, message: email }
      : { done: false };
  },
  async install(ctx) {
    const email = normalizedGmailAddress(ctx);
    if (!email) return;
    await ctx.host.syncLocalProfileEmail(ctx.paths.db, email);
  },
  async verify(ctx) {
    const email = normalizedGmailAddress(ctx);
    if (!email) return;

    const profileEmail = await ctx.host.getLocalProfileEmail(ctx.paths.db);
    if (profileEmail !== email) {
      throw new Error("local profile email did not update.");
    }
  },
};

const bundledSkillsStep: OnboardStep = {
  id: "bundled-skills",
  label: "Bundled skills",
  detect(ctx) {
    ctx.host.installBundledSkills();
    return { done: true, message: "gmail-swiggy installed" };
  },
  install(ctx) {
    ctx.host.installBundledSkills();
  },
  verify(ctx) {
    ctx.host.installBundledSkills();
  },
};

const pythonEnvStep: OnboardStep = {
  id: "python-env",
  label: "PDF extractor",
  async detect(ctx) {
    if (
      process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED === "1" ||
      ctx.config.pdfExtractor.enabled === false
    ) {
      return { done: true, message: "disabled" };
    }

    const result = await ctx.host.ensurePythonEnvReady({
      config: ctx.config,
      paths: ctx.paths,
    });
    if (!result.ok) {
      return { done: false };
    }

    return { done: true, message: result.runtime.pythonBin };
  },
  async install(ctx) {
    const pid = ctx.host.startDetachedCommand(ctx.paths, [
      "doctor",
      "--fix",
      "--quick",
    ]);
    ctx.ui.note(
      `Installing PDF extractor in the background (pid ${pid}); sync will use body-only extraction until it is ready.`,
      "PDF extractor",
    );
  },
  verify() {
    return;
  },
};

const kickoffSyncStep: OnboardStep = {
  id: "kickoff-sync",
  label: "Initial sync",
  detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    return { done: false };
  },
  install(ctx) {
    const pid = ctx.host.startDetachedCommand(ctx.paths, ["sync", "--full"]);
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

const dashboardServiceStep: OnboardStep = {
  id: "dashboard-service",
  label: "Dashboard service",
  detect(ctx) {
    if (ctx.dryRun || process.env.SLASHCASH_E2E === "1") {
      return { done: true, message: "skipped by local/E2E mode" };
    }
    if (ctx.host.resolveDashboardLaunchMode() !== "packaged") {
      return { done: true, message: "dev mode" };
    }
    if (process.platform !== "darwin") {
      return { done: true, message: "manual start required" };
    }
    return { done: false };
  },
  async install(ctx) {
    await ctx.host.ensureDashboardService({ port: ctx.config.server.port });
  },
  verify() {
    return;
  },
};

export function buildFinalSummary(ctx: OnboardContext) {
  return {
    home: ctx.paths.home,
    database: ctx.paths.db,
    skills: ctx.paths.skills,
    dashboard: `http://${ctx.config.server.host}:${ctx.config.server.port}`,
    assistant: ctx.config.assistant.provider,
    privacy: FINAL_SUMMARY({
      credentialStore: ctx.host.describeCredentialStore(ctx.credentialStore),
    }),
  };
}

export function privacyTopBanner() {
  return TOP_BANNER;
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
