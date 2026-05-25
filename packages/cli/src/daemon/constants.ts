import { homedir } from "node:os";
import { join } from "node:path";

export const DASHBOARD_LAUNCH_AGENT_LABEL = "cash.slash.dashboard";

export function resolveLaunchAgentPlistPath() {
  return join(
    homedir(),
    "Library",
    "LaunchAgents",
    `${DASHBOARD_LAUNCH_AGENT_LABEL}.plist`,
  );
}

export function resolveDashboardServiceLogPaths(home: string) {
  if (process.platform === "darwin") {
    const logsDir = join(homedir(), "Library", "Logs", "slashcash");
    return {
      logsDir,
      stdoutPath: join(logsDir, "dashboard.log"),
      stderrPath: join(logsDir, "dashboard.err.log"),
    };
  }

  const logsDir = join(home, "logs");
  return {
    logsDir,
    stdoutPath: join(logsDir, "dashboard.log"),
    stderrPath: join(logsDir, "dashboard.err.log"),
  };
}
