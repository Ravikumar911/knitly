import type { Command } from "commander";
import { startDashboard } from "../../start/boot.js";

export function register(program: Command) {
  program
    .command("start")
    .description("Start the local dashboard on 127.0.0.1")
    .option("--port <port>", "Port to bind", (value) => Number(value))
    .option("--no-open", "Do not open the browser")
    .action(async (options: { port?: number; open?: boolean }) => {
      await startDashboard({ port: options.port, noOpen: options.open === false });
    });
}
