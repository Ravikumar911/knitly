import type { Command } from "commander";
import { TOP_BANNER } from "../../privacy/copy.js";

export function register(program: Command) {
  program
    .command("privacy")
    .description("Print slashcash privacy facts")
    .action(() => {
      console.log(TOP_BANNER);
      console.log("");
      console.log(
        "Why this appears during onboarding: packages/docs/reference/decisions.md#adr-023---privacy-disclosures-surface-at-onboarding",
      );
      console.log("Data flow: packages/docs/architecture.md");
    });
}
