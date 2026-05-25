import type { Command } from "commander";
import { startDashboard } from "../../start/boot.js";

export function register(program: Command) {
  program
    .command("start")
    .description("Start the local dashboard on 127.0.0.1")
    .option("--port <port>", "Port to bind", (value) => Number(value))
    .option("--no-open", "Do not open the browser")
    .option(
      "--foreground",
      "Run in the current terminal instead of the background service",
    )
    .action(
      async (options: {
        port?: number;
        open?: boolean;
        foreground?: boolean;
      }) => {
        await startDashboard({
          port: options.port,
          noOpen: options.open === false,
          foreground: options.foreground === true,
        });
      },
    );
}
