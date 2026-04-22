import type { Command } from "commander";
import pc from "picocolors";
import { clearPidFile, isProcessAlive, readPidFile } from "../../runtime/pid.js";

export function register(program: Command) {
  program
    .command("stop")
    .description("Stop the local dashboard")
    .action(async () => {
      const pid = readPidFile();
      if (!pid) {
        console.log("slash.cash is not running.");
        return;
      }

      if (isProcessAlive(pid.pid)) {
        process.kill(pid.pid, "SIGTERM");
        await waitForExit(pid.pid);
      }
      clearPidFile();
      console.log(pc.green("Stopped slash.cash."));
    });
}

async function waitForExit(pid: number) {
  const started = Date.now();
  while (Date.now() - started < 5_000) {
    if (!isProcessAlive(pid)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  process.kill(pid, "SIGKILL");
}
