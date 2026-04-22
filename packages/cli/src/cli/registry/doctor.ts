import type { Command } from "commander";
import {
  repairPhase1State,
  resetDoctorCredentials,
} from "../../doctor/repairs.js";
import { runDoctor } from "../../doctor/run.js";
import { CliError } from "../../errors/format.js";

export function register(program: Command) {
  program
    .command("doctor")
    .description("Check local slash.cash state")
    .option("--fix", "Create missing local state")
    .option("--json", "Print machine-readable output")
    .option("--quick", "Skip network and auth probes")
    .option(
      "--reset-credentials",
      "Delete saved Gmail IMAP credentials before rechecking",
    )
    .action(
      async (options: {
        fix?: boolean;
        json?: boolean;
        quick?: boolean;
        resetCredentials?: boolean;
      }) => {
        if ((options.fix || options.resetCredentials) && options.json) {
          throw new CliError({
            area: "config",
            symptom:
              "`doctor --fix` and `--reset-credentials` cannot be combined with `--json`.",
            cause:
              "Repairs may prompt or mutate local state, while JSON mode is intended for machine-readable checks.",
            fix: "Run `slashcash doctor --json`, then rerun the mutating doctor command you need.",
          });
        }
        if (options.fix) {
          await repairPhase1State();
        }
        if (options.resetCredentials) {
          await resetDoctorCredentials();
        }
        await runDoctor(options);
      },
    );
}
