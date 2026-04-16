import type { Command } from "commander";
import { repairPhase1State } from "../../doctor/repairs.js";
import { runDoctor } from "../../doctor/run.js";

export function register(program: Command) {
  program
    .command("doctor")
    .description("Check local slash.cash state")
    .option("--fix", "Create missing Phase 1 local state")
    .action(async (options: { fix?: boolean }) => {
      if (options.fix) {
        await repairPhase1State();
      }
      await runDoctor({ fix: options.fix });
    });
}
