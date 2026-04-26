import { rmSync } from "node:fs";
import { relative } from "node:path";
import type { Command } from "commander";
import {
  clearPidFile,
  isProcessAlive,
  readPidFile,
} from "../../runtime/pid.js";
import { resetStoredCredentials } from "../../config/credentials.js";
import { resolvePaths } from "../../config/paths.js";

const RESET_RM_OPTIONS = {
  recursive: true,
  force: true,
  maxRetries: 10,
  retryDelay: 100,
} as const;

export function register(program: Command) {
  program
    .command("reset")
    .description("Reset local config/state (keeps the CLI installed)")
    .option("-y, --yes", "Skip confirmation")
    .action(async (options: { yes?: boolean }) => {
      if (!options.yes) {
        console.error("Refusing to reset without --yes.");
        process.exitCode = 1;
        return;
      }

      await stopDashboardIfRunning();

      const paths = resolvePaths();
      await resetStoredCredentials();

      // Support custom DB locations while still clearing the state directory.
      if (!isInside(paths.home, paths.db)) {
        rmSync(paths.db, { force: true });
      }

      clearPidFile();
      rmSync(paths.home, RESET_RM_OPTIONS);

      console.log("Reset local slash.cash state. Run `slashcash onboard`.");
    });
}

async function stopDashboardIfRunning() {
  const pid = readPidFile();
  if (!pid) {
    return;
  }

  if (isProcessAlive(pid.pid)) {
    process.kill(pid.pid, "SIGTERM");
    await waitForExit(pid.pid);
  }
}

async function waitForExit(pid: number) {
  const started = Date.now();
  while (Date.now() - started < 5_000) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  process.kill(pid, "SIGKILL");
}

function isInside(parentPath: string, candidatePath: string) {
  const pathRelative = relative(parentPath, candidatePath);
  return (
    pathRelative === "" ||
    (!pathRelative.startsWith("..") && !pathRelative.startsWith("/"))
  );
}
