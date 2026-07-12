import { spawn } from "node:child_process";
import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  describeCredentialStore,
  loadConfig,
  readAssistantCredential,
  readStoredCredentials,
  writeAssistantCredential,
  writeConfig,
  writeStoredCredentials,
} from "../local-state";
import { ensureStateDirs, resolvePaths } from "../local-state/paths";
import type { SlashcashConfig } from "../local-state/schema";
import type { SlashcashPaths } from "../local-state/paths";
import {
  commandExists,
  runCommand,
  runInteractive,
} from "../utils/subprocess";
import type { OnboardHost } from "./host";

const BUNDLED_GMAIL_SWIGGY_SKILL = "gmail-swiggy";

export type CreateDefaultOnboardHostOptions = {
  bundledSkillsRoot?: string | null;
  startDetachedCommand?: (
    paths: SlashcashPaths,
    args: string[],
  ) => number;
  resolveDashboardLaunchMode?: () => "packaged" | "dev";
  ensureDashboardService?: (input: { port: number }) => Promise<void>;
  openUrl?: (url: string) => void;
};

export function createDefaultOnboardHost(
  options: CreateDefaultOnboardHostOptions = {},
): OnboardHost {
  return {
    resolvePaths,
    ensureStateDirs,
    loadConfig,
    writeConfig,
    configExists(paths) {
      return existsSync(paths.config);
    },
    readAssistantCredential,
    async writeAssistantCredential(input) {
      await writeAssistantCredential(input);
    },
    readStoredCredentials,
    writeStoredCredentials,
    describeCredentialStore,
    commandExists,
    runCommand,
    runInteractive,
    isOllamaReachable,
    openUrl(url) {
      if (options.openUrl) {
        options.openUrl(url);
        return;
      }
      openUrlInDefaultBrowser(url);
    },
    async ensureLocalDatabase(dbPath) {
      process.env.SQLITE_DB_PATH = dbPath;
      const database = await import("@workspace/database");
      database.ensureLocalDatabase();
    },
    async getLocalProfileEmail(dbPath) {
      process.env.SQLITE_DB_PATH = dbPath;
      const database = await import("@workspace/database");
      database.ensureLocalDatabase();
      const profile = await database.getLocalProfileIdentity(
        database.LOCAL_USER_ID,
      );
      return profile.email;
    },
    async syncLocalProfileEmail(dbPath, email) {
      process.env.SQLITE_DB_PATH = dbPath;
      const database = await import("@workspace/database");
      database.ensureLocalDatabase();
      await database.syncLocalProfileIdentity(database.LOCAL_USER_ID, email);
    },
    async verifyImapLogin(input) {
      const { verifyImapLogin } = await import("../gmail/imap-client.js");
      const result = await verifyImapLogin({
        address: input.address,
        appPassword: input.appPassword,
      });
      if (result.ok) {
        return { ok: true };
      }
      return {
        ok: false,
        error: {
          symptom: result.error.symptom,
          cause: result.error.cause,
          fix: result.error.fix,
          docsUrl: result.error.docsUrl,
          message: result.message,
        },
      };
    },
    async ensurePythonEnvReady(input) {
      if (
        process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED === "1" ||
        input.config.pdfExtractor.enabled === false
      ) {
        return { ok: true, runtime: { pythonBin: "disabled" } };
      }

      const pythonBin =
        input.config.pdfExtractor.pythonBin.trim() ||
        join(input.paths.pyVenv, "bin", "python");
      if (existsSync(pythonBin)) {
        return { ok: true, runtime: { pythonBin } };
      }
      return { ok: false };
    },
    installBundledSkills() {
      installBundledSkills(options.bundledSkillsRoot);
    },
    startDetachedCommand(paths, args) {
      if (options.startDetachedCommand) {
        return options.startDetachedCommand(paths, args);
      }
      return defaultStartDetachedCommand(paths, args);
    },
    resolveDashboardLaunchMode() {
      return options.resolveDashboardLaunchMode?.() ?? "dev";
    },
    async ensureDashboardService(input) {
      if (options.ensureDashboardService) {
        await options.ensureDashboardService(input);
        return;
      }
      // Desktop / packaged hosts inject a real implementation. Default is no-op.
    },
  };
}

function installBundledSkills(bundledSkillsRoot?: string | null) {
  const paths = resolvePaths();
  ensureStateDirs(paths);

  const sourceRoot =
    bundledSkillsRoot ??
    process.env.SLASHCASH_BUNDLED_SKILLS_DIR ??
    null;
  if (!sourceRoot || !existsSync(sourceRoot)) {
    return;
  }

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const from = join(sourceRoot, entry.name);
    const to = join(paths.skills, entry.name);
    cpSync(from, to, { recursive: true, force: false, errorOnExist: false });
  }

  const config = loadConfig({ createIfMissing: true });
  config.skills.enabled[BUNDLED_GMAIL_SWIGGY_SKILL] ??= true;
  writeConfig(config);
}

function defaultStartDetachedCommand(paths: SlashcashPaths, args: string[]) {
  const child = spawn("pnpm", ["--filter", "slashcash", "dev", "--", ...args], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      SLASHCASH_HOME: paths.home,
      SQLITE_DB_PATH: paths.db,
      SLASHCASH_ATTACHMENTS_DIR: paths.attachments,
    },
  });
  child.unref();
  return child.pid ?? 0;
}

function openUrlInDefaultBrowser(url: string) {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const result = runCommand(command, args, { timeoutMs: 10_000 });
  if (!result.ok) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        `\`${command}\` exited with ${result.code ?? "no code"}`,
    );
  }
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

export type { SlashcashConfig, SlashcashPaths };
