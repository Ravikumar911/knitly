import type { Command } from "commander";

export function register(program: Command) {
  program.command("skills").description("Manage local skills").action(() => {
    console.log("slashcash skills is coming in Phase 2.");
  });
}
