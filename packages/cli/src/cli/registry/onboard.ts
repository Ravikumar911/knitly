import type { Command } from "commander";
import { runOnboard } from "../../onboard/run.js";

export function register(program: Command) {
  program.command("onboard")
    .description("Prepare a machine for slash.cash")
    .option("--dry-run", "Only create slash.cash local state and bundled skills")
    .option("--skip-external", "Skip Homebrew, Ollama, gws and auth checks")
    .option("--skip-auth", "Skip interactive gws auth login")
    .action(async (options: { dryRun?: boolean; skipExternal?: boolean; skipAuth?: boolean }) => {
      await runOnboard(options);
    });
}
