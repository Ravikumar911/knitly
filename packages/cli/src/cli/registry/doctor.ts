import type { Command } from "commander";
import { repairPhase1State } from "../../doctor/repairs.js";
import { runDoctor } from "../../doctor/run.js";
import { CliError } from "../../errors/format.js";

export function register(program: Command) {
  program
    .command("doctor")
    .description("Check local slash.cash state")
    .option("--fix", "Create missing local state")
    .option("--json", "Print machine-readable output")
    .option("--quick", "Skip network and auth probes")
    .action(
      async (options: { fix?: boolean; json?: boolean; quick?: boolean }) => {
        if (options.fix && options.json) {
          throw new CliError({
            area: "config",
            symptom: "`doctor --fix` cannot be combined with `--json`.",
            cause:
              "Repairs may prompt or mutate local state, while JSON mode is intended for machine-readable checks.",
            fix: "Run `slashcash doctor --json`, then `slashcash doctor --fix` if repairs are needed.",
          });
        }
        if (options.fix) {
          await repairPhase1State();
        }
        await runDoctor(options);
      },
    );
}
