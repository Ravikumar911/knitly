import type { Command } from "commander";
import { runOnboard } from "../../onboard/run.js";

export function register(program: Command) {
  const command = program
    .command("onboard")
    .description("Prepare a machine for slash.cash")
    .option("--yes", "Accept safe defaults")
    .option("--non-interactive", "Fail instead of prompting")
    .option(
      "--dry-run",
      "Only create slash.cash local state and bundled skills",
    )
    .option("--skip-external", "Skip Homebrew, Ollama, gws and auth checks")
    .option("--skip-auth", "Skip interactive Google auth")
    .action(
      async (options: {
        dryRun?: boolean;
        skipExternal?: boolean;
        skipAuth?: boolean;
        yes?: boolean;
        nonInteractive?: boolean;
      }) => {
        await runOnboard(options);
      },
    );

  if (process.env.SLASHCASH_E2E !== "1") {
    command.options
      .find((option) => option.long === "--skip-external")
      ?.hideHelp();
    command.options.find((option) => option.long === "--skip-auth")?.hideHelp();
  }
}
