import type { Command } from "commander";
import { runDashboardServer } from "../../start/boot.js";

export function register(program: Command) {
  const server = program
    .command("server")
    .description("Run the slash.cash dashboard server");

  server
    .command("run")
    .description("Run the dashboard in the foreground (used by the background service)")
    .option("--port <port>", "Port to bind", (value) => Number(value))
    .option("--no-open", "Do not open the browser")
    .action(async (options: { port?: number; open?: boolean }) => {
      const { loadConfig } = await import("../../config/load.js");
      const config = loadConfig({ createIfMissing: true });
      await runDashboardServer({
        port: options.port ?? config.server.port,
        noOpen: options.open === false,
      });
    });
}
