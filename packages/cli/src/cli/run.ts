import { Command } from "commander";
import { registerCommands } from "./command-catalog.js";

export async function runCli(args: string[], options: { version: string }) {
  const program = new Command();

  program
    .name("slashcash")
    .description("Local-first slash.cash dashboard")
    .version(options.version);

  await registerCommands(program, args);

  program.showHelpAfterError();
  await program.parseAsync(args, { from: "user" });
}
