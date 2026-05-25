import { spawn, type ChildProcess } from "node:child_process";
import { dirname } from "node:path";
import pc from "picocolors";
import { loadConfig } from "../config/load.js";
import { resolvePaths } from "../config/paths.js";
import { applyRuntimeEnv } from "../config/runtime-env.js";
import type { SlashcashConfig } from "../config/schema.js";
import { ensureDashboardService } from "../daemon/service.js";
import { clearPidFile, writePidFile } from "../runtime/pid.js";
import { writeLog } from "../runtime/log.js";
import { loadDatabase } from "../runtime/database.js";
import { installBundledSkills } from "../skills/registry.js";
import { startCronWorker } from "./cron.js";
import { resolveDashboardLaunch } from "./resolve-server.js";

export async function startDashboard(
  options: { port?: number; noOpen?: boolean; foreground?: boolean } = {},
) {
  const config = loadConfig({ createIfMissing: true });
  const paths = resolvePaths();
  const port = options.port ?? config.server.port;

  await syncProfileFromConfig(config, paths.db);
  await applyRuntimeEnv({ config, paths, port });
  installBundledSkills();

  if (!options.foreground && process.env.SLASHCASH_FOREGROUND !== "1") {
    const launch = resolveDashboardLaunch();
    if (launch.mode === "packaged") {
      const service = await ensureDashboardService({
        port,
        foreground: false,
      });
      if (service.mode !== "foreground") {
        await waitForHealthz(port);
        const url = `http://127.0.0.1:${port}`;
        console.log(pc.green(`slash.cash is running at ${url}`));
        console.log(`service logs  ${service.stdoutPath}`);
        console.log(`service errors ${service.stderrPath}`);
        console.log("structured logs  slashcash logs --follow");
        if (
          !options.noOpen &&
          process.env.SLASHCASH_NO_OPEN !== "1" &&
          process.env.SLASHCASH_SERVICE !== "1"
        ) {
          openBrowser(url);
        }
        return;
      }
    }
  }

  await runDashboardServer({ port, noOpen: options.noOpen });
}

export async function runDashboardServer(options: {
  port: number;
  noOpen?: boolean;
}) {
  const config = loadConfig({ createIfMissing: true });
  const paths = resolvePaths();
  const launch = resolveDashboardLaunch();
  const cron = startCronWorker(config, paths);
  const child = spawnDashboard(launch, options.port);

  if (!child.pid) {
    throw new Error("Failed to start the dashboard process.");
  }

  writePidFile({
    pid: child.pid,
    port: options.port,
    dbPath: paths.db,
    attachmentsPath: paths.attachments,
    startedAt: new Date().toISOString(),
  });
  writeLog("runtime", { event: "start", pid: child.pid, port: options.port });

  bindShutdown(child, cron.stop);
  await waitForHealthz(options.port);

  const url = `http://127.0.0.1:${options.port}`;
  console.log(pc.green(`slash.cash is running at ${url}`));

  if (!options.noOpen && process.env.SLASHCASH_NO_OPEN !== "1" && process.env.SLASHCASH_SERVICE !== "1") {
    openBrowser(url);
  }

  await new Promise<number | null>((resolve) => child.once("exit", resolve));
  cron.stop();
  clearPidFile();
}

function spawnDashboard(
  launch: ReturnType<typeof resolveDashboardLaunch>,
  port: number,
): ChildProcess {
  if (launch.mode === "packaged") {
    return spawn("node", [launch.serverPath], {
      cwd: dirname(launch.serverPath),
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
      cwd: launch.appDir,
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
