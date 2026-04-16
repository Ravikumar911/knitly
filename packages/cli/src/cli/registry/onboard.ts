import type { Command } from "commander";

export function register(program: Command) {
  program.command("onboard").description("Prepare a machine for slash.cash").action(() => {
    console.log("slashcash onboard is coming in Phase 2.");
  });
}
