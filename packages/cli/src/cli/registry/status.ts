import type { Command } from "commander";
import { resolvePaths } from "../../config/paths.js";
import { isProcessAlive, readPidFile } from "../../runtime/pid.js";
import { listInstalledSkills } from "../../skills/registry.js";

export function register(program: Command) {
  program
    .command("status")
    .description("Show dashboard status")
    .action(async () => {
      const paths = resolvePaths();
      const pid = readPidFile();
      const health = pid ? await readHealth(pid.port) : "not running";
      const alive = pid ? isProcessAlive(pid.pid) : false;
      const enabledSkills = listInstalledSkills().filter(
        (skill) => skill.enabled,
      ).length;

      console.log(`pid             ${pid?.pid ?? "-"}`);
      console.log(`process         ${alive ? "running" : "stopped"}`);
      console.log(`port            ${pid?.port ?? "-"}`);
      console.log(`healthz         ${health}`);
      console.log(`db              ${pid?.dbPath ?? paths.db}`);
      console.log(
        `attachments     ${pid?.attachmentsPath ?? paths.attachments}`,
      );
      console.log(`enabled skills  ${enabledSkills}`);
    });
}

async function readHealth(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
    return response.ok ? "ok" : `HTTP ${response.status}`;
  } catch {
    return "unreachable";
  }
}
