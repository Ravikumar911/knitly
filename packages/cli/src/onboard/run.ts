import { existsSync } from "node:fs";
import pc from "picocolors";
import { selectChoice } from "../cli/prompt.js";
import { createProgress, type Progress } from "../cli/progress.js";
import { loadConfig, writeConfig } from "../config/load.js";
import type { SlashcashConfig } from "../config/schema.js";
import {
  ensureStateDirs,
  resolvePaths,
  type SlashcashPaths,
} from "../config/paths.js";
import { CliError } from "../errors/format.js";
import { loadDatabase } from "../runtime/database.js";
import {
  commandExists,
  runCommand,
  runInteractive,
} from "../runtime/subprocess.js";
import { installBundledSkills } from "../skills/registry.js";

const HOMEBREW_INSTALL_URL = "https://brew.sh/";
const OLLAMA_FORMULA = "ollama";
const GWS_BREW_FORMULA = "googleworkspace/tap/gws";

type DetectResult =
  | { done: true; message?: string }
  | { done: false; message?: string };

type OnboardContext = {
  paths: SlashcashPaths;
  config: SlashcashConfig;
  dryRun: boolean;
  skipExternal: boolean;
  skipAuth: boolean;
  yes: boolean;
  nonInteractive: boolean;
  freshConfig: boolean;
};

type Step = {
  id: string;
  label: string;
  detect(ctx: OnboardContext): Promise<DetectResult> | DetectResult;
  install(ctx: OnboardContext, progress: Progress): Promise<void> | void;
  verify(ctx: OnboardContext): Promise<void> | void;
};

export async function runOnboard(
  options: {
    dryRun?: boolean;
    skipExternal?: boolean;
    skipAuth?: boolean;
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
    skipAuth: options.skipAuth === true,
    yes: options.yes === true,
    nonInteractive: options.nonInteractive === true,
    freshConfig,
  };

  await runPipeline(ctx, buildSteps());
}

function buildSteps(): Step[] {
  return [
    homebrewStep,
    modelQuestionStep,
    ollamaInstallStep,
    ollamaServiceStep,
    ollamaPullStep,
    gwsInstallStep,
    gwsAuthStep,
    stateDirStep,
    dbMigrateStep,
    bundledSkillsStep,
    finalSummaryStep,
  ];
}

async function runPipeline(ctx: OnboardContext, steps: Step[]) {
  const progress = createProgress();
  const completed: string[] = [];
  let activeStep = "start";

  const onCancel = () => {
    console.error(
      `\nCancelled at step ${activeStep}. Run \`slashcash doctor --fix\` to resume.`,
    );
    process.exit(130);
  };
  process.once("SIGINT", onCancel);

  try {
    for (const step of steps) {
      activeStep = step.id;
      const detected = await step.detect(ctx);
      if (detected.done) {
        console.log(
          `${pc.green("done")} ${step.label}${detected.message ? `: ${detected.message}` : ""}`,
        );
        completed.push(step.id);
        continue;
      }

      progress.start(step.label);
      try {
        await step.install(ctx, progress);
        await step.verify(ctx);
        progress.done();
        completed.push(step.id);
      } catch (error) {
        progress.fail(error instanceof Error ? error.message : String(error));
        throw error;
      }
    }
  } finally {
    process.off("SIGINT", onCancel);
  }

  if (completed.length === steps.length) {
    console.log(pc.green("Onboarding complete. Run slashcash start."));
  }
}

function skippedExternal(ctx: OnboardContext): DetectResult {
  return ctx.skipExternal || process.env.SLASHCASH_E2E === "1"
    ? { done: true, message: "skipped by local/E2E mode" }
    : { done: false };
}

const homebrewStep: Step = {
  id: "homebrew",
  label: "Homebrew",
  detect(ctx) {
    if (ctx.skipExternal || process.env.SLASHCASH_E2E === "1")
      return skippedExternal(ctx);
    return commandExists("brew")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install() {
    throw new CliError({
      area: "binary",
      symptom: "Homebrew is required.",
      cause: "slashcash uses Homebrew to install Ollama and gws on macOS.",
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

const modelQuestionStep: Step = {
  id: "model-question",
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
        cause: "`--non-interactive` was passed without `--yes`.",
        fix: "Run `slashcash onboard --yes` to accept the default model.",
      });
    }

    const model = await selectChoice({
      question: "Choose the local chat model.",
      defaultValue: ctx.config.ai.chatModel || "gemma3n:e4b",
      nonInteractive: ctx.yes,
      choices: [
        {
          label: "gemma3n:e4b",
          value: "gemma3n:e4b",
          description: "Default balance of quality and download size.",
        },
        {
          label: "gemma3:4b",
          value: "gemma3:4b",
          description: "Smaller and faster.",
        },
        {
          label: "qwen2.5:7b",
          value: "qwen2.5:7b",
          description: "Larger and slower, usually stronger.",
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
    if (ctx.skipExternal || process.env.SLASHCASH_E2E === "1")
      return skippedExternal(ctx);
    return commandExists("ollama")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install() {
    const result = runCommand("brew", ["install", OLLAMA_FORMULA], {
      timeoutMs: 10 * 60_000,
    });
    if (!result.ok) {
      throw new Error(
        result.stderr || result.stdout || "brew install ollama failed.",
      );
    }
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
    if (ctx.skipExternal || process.env.SLASHCASH_E2E === "1")
      return skippedExternal(ctx);
    return (await isOllamaReachable(ctx.config.ai.ollamaBaseUrl, 200))
      ? { done: true, message: "reachable" }
      : { done: false };
  },
  async install(ctx) {
    runCommand("brew", ["services", "start", OLLAMA_FORMULA], {
      timeoutMs: 60_000,
    });
    if (!(await isOllamaReachable(ctx.config.ai.ollamaBaseUrl, 20_000))) {
      throw new Error(
        "Ollama did not become reachable. Try: brew services restart ollama",
      );
    }
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
    if (ctx.skipExternal || process.env.SLASHCASH_E2E === "1")
      return skippedExternal(ctx);
    const list = runCommand("ollama", ["list"], { timeoutMs: 15_000 });
    if (!list.ok) return { done: false };
    return list.stdout.includes(ctx.config.ai.chatModel)
      ? { done: true, message: ctx.config.ai.chatModel }
      : { done: false };
  },
  async install(ctx, progress) {
    progress.update(`pulling ${ctx.config.ai.chatModel}`);
    const code = await runInteractive("ollama", [
      "pull",
      ctx.config.ai.chatModel,
    ]);
    if (code !== 0) {
      throw new Error(`ollama pull exited with ${code}.`);
    }
  },
  verify(ctx) {
    const list = runCommand("ollama", ["list"], { timeoutMs: 15_000 });
    if (!list.ok || !list.stdout.includes(ctx.config.ai.chatModel)) {
      throw new Error(`${ctx.config.ai.chatModel} is not available in ollama.`);
    }
  },
};

const gwsInstallStep: Step = {
  id: "gws-install",
  label: "gws install",
  detect(ctx) {
    if (ctx.skipExternal || process.env.SLASHCASH_E2E === "1")
      return skippedExternal(ctx);
    return commandExists("gws")
      ? { done: true, message: "installed" }
      : { done: false };
  },
  install() {
    const install = runCommand("brew", ["install", GWS_BREW_FORMULA], {
      timeoutMs: 10 * 60_000,
    });
    if (!install.ok) {
      throw new Error(
        install.stderr ||
          install.stdout ||
          `brew install ${GWS_BREW_FORMULA} failed.`,
      );
    }
  },
  verify() {
    if (!commandExists("gws")) {
      throw new Error("gws is still missing from PATH.");
    }
  },
};

const gwsAuthStep: Step = {
  id: "gws-auth",
  label: "gws auth",
  detect(ctx) {
    if (ctx.skipExternal || ctx.skipAuth || process.env.SLASHCASH_E2E === "1")
      return skippedExternal(ctx);
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return { done: true, message: "service account credentials set" };
    }
    const status = runCommand("gws", ["auth", "status", "--format", "json"], {
      timeoutMs: 15_000,
    });
    return status.ok
      ? { done: true, message: "authenticated" }
      : { done: false };
  },
  async install() {
    console.log(
      "Starting gws auth login. Complete the browser flow, then return here.",
    );
    const code = await runInteractive("gws", ["auth", "login"]);
    if (code !== 0) {
      throw new CliError({
        area: "auth",
        symptom: "gws auth login did not complete.",
        cause: `gws exited with code ${code}.`,
        fix: "Run `gws auth login`, then rerun `slashcash onboard`.",
      });
    }
  },
  verify() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
    const status = runCommand("gws", ["auth", "status", "--format", "json"], {
      timeoutMs: 15_000,
    });
    if (!status.ok) {
      throw new Error("gws is still not authenticated.");
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

const finalSummaryStep: Step = {
  id: "final-summary",
  label: "Summary",
  detect(ctx) {
    console.log(pc.green("Local slash.cash state is ready."));
    console.log(`home        ${ctx.paths.home}`);
    console.log(`database    ${ctx.paths.db}`);
    console.log(`skills      ${ctx.paths.skills}`);
    console.log(`model       ${ctx.config.ai.chatModel}`);
    return { done: true };
  },
  install() {
    // Summary-only step.
  },
  verify() {
    // Summary-only step.
  },
};

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
