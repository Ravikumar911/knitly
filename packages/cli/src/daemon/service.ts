import { spawn, type ChildProcess } from "node:child_process";
import { loadConfig } from "../config/load.js";
import { resolvePaths } from "../config/paths.js";
import { writeLog } from "../runtime/log.js";
import { resolveDashboardServiceLogPaths } from "./constants.js";
import { resolveCliProgramArguments } from "./entrypoint.js";
import {
  installLaunchAgent,
  isLaunchAgentLoaded,
  startLaunchAgent,
  stopLaunchAgent,
} from "./launchd.js";

export type DashboardServiceStatus = {
  kind: "launchd" | "detached" | "none";
  loaded: boolean;
  stdoutPath: string;
  stderrPath: string;
};

export function readDashboardServiceStatus(): DashboardServiceStatus {
  const paths = resolvePaths();
  const logPaths = resolveDashboardServiceLogPaths(paths.home);

  if (process.platform === "darwin") {
    return {
      kind: "launchd",
      loaded: isLaunchAgentLoaded(),
      stdoutPath: logPaths.stdoutPath,
      stderrPath: logPaths.stderrPath,
    };
  }

  return {
    kind: "none",
    loaded: false,
    stdoutPath: logPaths.stdoutPath,
    stderrPath: logPaths.stderrPath,
  };
}

export async function ensureDashboardService(options: {
  port: number;
  foreground?: boolean;
}) {
  if (options.foreground || process.env.SLASHCASH_FOREGROUND === "1") {
    return { mode: "foreground" as const };
  }

  const config = loadConfig({ createIfMissing: true });
  const paths = resolvePaths();
  const port = options.port ?? config.server.port;

  if (process.platform === "darwin") {
    const plan = installLaunchAgent({
      port,
      home: paths.home,
      dbPath: paths.db,
      attachmentsPath: paths.attachments,
    });
    startLaunchAgent();
    writeLog("runtime", {
      event: "service-start",
      mode: "launchd",
      port,
      stdoutPath: plan.stdoutPath,
      stderrPath: plan.stderrPath,
    });
    return {
      mode: "launchd" as const,
      port,
      stdoutPath: plan.stdoutPath,
      stderrPath: plan.stderrPath,
    };
  }

  spawnDetachedDashboard(port);
  const logPaths = resolveDashboardServiceLogPaths(paths.home);
  writeLog("runtime", {
    event: "service-start",
    mode: "detached",
    port,
    stdoutPath: logPaths.stdoutPath,
    stderrPath: logPaths.stderrPath,
  });
  return {
    mode: "detached" as const,
    port,
    stdoutPath: logPaths.stdoutPath,
    stderrPath: logPaths.stderrPath,
  };
}

export function stopDashboardService() {
  if (process.platform === "darwin" && isLaunchAgentLoaded()) {
    stopLaunchAgent();
    writeLog("runtime", { event: "service-stop", mode: "launchd" });
    return "launchd" as const;
  }
  return null;
}

function spawnDetachedDashboard(port: number) {
  const [command, ...args] = resolveCliProgramArguments([
    "server",
    "run",
    "--port",
    String(port),
  ]);

  const child: ChildProcess = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      SLASHCASH_PORT: String(port),
    },
  });
  child.unref();
}
