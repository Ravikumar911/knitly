import { spawn, type ChildProcess } from "node:child_process";
import { accessSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { loadConfig } from "../config/load.js";
import { resolvePaths } from "../config/paths.js";
import { applyRuntimeEnv } from "../config/runtime-env.js";
import type { SlashcashConfig } from "../config/schema.js";
import { clearPidFile, writePidFile } from "../runtime/pid.js";
import { writeLog } from "../runtime/log.js";
import { loadDatabase } from "../runtime/database.js";
import { installBundledSkills } from "../skills/registry.js";
import { startCronWorker } from "./cron.js";

export async function startDashboard(
  options: { port?: number; noOpen?: boolean } = {},
) {
  const config = loadConfig({ createIfMissing: true });
  const paths = resolvePaths();
  const port = options.port ?? config.server.port;

  await syncProfileFromConfig(config, paths.db);

  await applyRuntimeEnv({
    config,
    paths,
    port,
  });

  installBundledSkills();

  const appDir = findMainAppDir();
  const cron = startCronWorker(config, paths);
  const child = spawnDashboard(appDir, port);

  if (!child.pid) {
    throw new Error("Failed to start the dashboard process.");
  }

  writePidFile({
    pid: child.pid,
    port,
    dbPath: paths.db,
    attachmentsPath: paths.attachments,
    startedAt: new Date().toISOString(),
  });
  writeLog("runtime", { event: "start", pid: child.pid, port });

  bindShutdown(child, cron.stop);
  await waitForHealthz(port);

  const url = `http://127.0.0.1:${port}`;
  console.log(pc.green(`slash.cash is running at ${url}`));

  if (!options.noOpen && process.env.SLASHCASH_NO_OPEN !== "1") {
    openBrowser(url);
  }

  await new Promise<number | null>((resolve) => child.once("exit", resolve));
  cron.stop();
  clearPidFile();
}

function spawnDashboard(appDir: string, port: number): ChildProcess {
  const standalone =
    findPackagedServer() ||
    (process.env.SLASHCASH_USE_STANDALONE === "1"
      ? findStandaloneServer(appDir)
      : null);
  if (standalone) {
    return spawn("node", [standalone], {
      cwd: dirname(standalone),
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(port),
        SLASHCASH_PORT: String(port),
        HOSTNAME: "127.0.0.1",
      },
    });
  }

  return spawn(
    "pnpm",
    ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(port),
        SLASHCASH_PORT: String(port),
        HOSTNAME: "127.0.0.1",
      },
    },
  );
}

function findPackagedServer() {
  const here = dirname(fileURLToPath(import.meta.url));
  if (!here.includes(`${sep}dist${sep}`)) return null;

  const candidates = [
    join(here, "..", "app", "apps", "main", "server.js"),
    join(here, "..", "app", "server.js"),
  ];

  for (const candidate of candidates) {
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // Continue looking for the packaged standalone server.
    }
  }

  return null;
}

function findStandaloneServer(appDir: string) {
  const candidates = [
    join(appDir, ".next", "standalone", "apps", "main", "server.js"),
    join(appDir, ".next", "standalone", "server.js"),
  ];

  for (const candidate of candidates) {
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // Continue looking for the local standalone server.
    }
  }

  return null;
}

function findMainAppDir() {
  const fromCwd = join(process.cwd(), "apps", "main");
  try {
    accessSync(join(fromCwd, "package.json"));
    return fromCwd;
  } catch {
    const here = dirname(fileURLToPath(import.meta.url));
    const fromPackage = join(here, "..", "..", "..", "..", "apps", "main");
    accessSync(join(fromPackage, "package.json"));
    return fromPackage;
  }
}

async function waitForHealthz(port: number) {
  const url = `http://127.0.0.1:${port}/api/healthz`;
  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started < 30_000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`healthz returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Dashboard did not become healthy: ${String(lastError)}`);
}

function bindShutdown(child: ChildProcess, stopCron: () => void) {
  const shutdown = () => {
    stopCron();
    if (child.pid) {
      child.kill("SIGTERM");
    }
    clearPidFile();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

function openBrowser(url: string) {
  if (process.platform !== "darwin") return;
  const opener = spawn("open", [url], {
    detached: true,
    stdio: "ignore",
  });
  opener.unref();
}

async function syncProfileFromConfig(config: SlashcashConfig, dbPath: string) {
  const email = config.gmail.address.trim().toLowerCase();
  if (!email) {
    return;
  }

  process.env.SQLITE_DB_PATH = dbPath;
  const { ensureLocalDatabase, syncLocalProfileIdentity, LOCAL_USER_ID } =
    await loadDatabase();
  ensureLocalDatabase();
  await syncLocalProfileIdentity(LOCAL_USER_ID, email);
}
