import type { Command } from "commander";
import { loadConfig } from "../../config/load.js";
import { resolvePaths } from "../../config/paths.js";
import { readDashboardServiceStatus } from "../../daemon/service.js";
import { isProcessAlive, readPidFile } from "../../runtime/pid.js";
import { listInstalledSkills } from "../../skills/registry.js";

export function register(program: Command) {
  program
    .command("status")
    .description("Show dashboard status")
    .action(async () => {
      const paths = resolvePaths();
      const config = loadConfig({ createIfMissing: true });
      const service = readDashboardServiceStatus();
      const pid = readPidFile();
      const port = pid?.port ?? config.server.port;
      const health = await readHealth(service, port);
      const alive = pid ? isProcessAlive(pid.pid) : false;
      const enabledSkills = listInstalledSkills().filter(
        (skill) => skill.enabled,
      ).length;

      console.log(
        `service         ${service.kind}${service.loaded ? " (loaded)" : ""}`,
      );
      console.log(`pid             ${pid?.pid ?? "-"}`);
      console.log(
        `process         ${alive || service.loaded ? "running" : "stopped"}`,
      );
      console.log(`port            ${port}`);
      console.log(`healthz         ${health}`);
      console.log(`service logs    ${service.stdoutPath}`);
      console.log(`service errors  ${service.stderrPath}`);
      console.log(`db              ${pid?.dbPath ?? paths.db}`);
      console.log(
        `attachments     ${pid?.attachmentsPath ?? paths.attachments}`,
      );
      console.log(`enabled skills  ${enabledSkills}`);
    });
}

async function readHealth(
  service: ReturnType<typeof readDashboardServiceStatus>,
  port: number,
) {
  if (!service.loaded && port <= 0) {
    return "not running";
  }

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
    return response.ok ? "ok" : `HTTP ${response.status}`;
  } catch {
    return service.loaded ? "starting" : "unreachable";
  }
}
