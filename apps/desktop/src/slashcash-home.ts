import { homedir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Product state directory for the desktop shell.
 * Matches CLI default (`~/.slashcash`); `SLASHCASH_HOME` override wins.
 */
export function resolveDesktopProductHome(
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = homedir(),
): string {
  return resolve(env.SLASHCASH_HOME || join(homeDir, ".slashcash"));
}
