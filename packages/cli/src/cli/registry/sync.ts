import type { Command } from "commander";

export function register(program: Command) {
  program.command("sync").description("Run Gmail sync").action(() => {
    console.log("slashcash sync is coming in Phase 2.");
  });
}
