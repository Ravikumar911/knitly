import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { resolvePaths } from "../../config/paths.js";

export function register(program: Command) {
  program.command("logs").description("Show local logs").action(() => {
    try {
      console.log(readFileSync(join(resolvePaths().logs, "slashcash.log"), "utf8"));
    } catch {
      console.log("No logs yet.");
    }
  });
}
