import { accessSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveCliEntrypoint(): string {
  const argv1 = process.argv[1];
  if (!argv1) {
    throw new Error("Unable to resolve slashcash CLI entrypoint.");
  }

  const normalized = resolve(argv1);
  const distEntry = join(dirname(normalized), "..", "dist", "entry.js");
  try {
    accessSync(distEntry);
    return distEntry;
  } catch {
    // Fall through to the invoked path below.
  }

  try {
    accessSync(normalized);
    return normalized;
  } catch {
    throw new Error(`Unable to resolve slashcash CLI entrypoint at ${normalized}.`);
  }
}

export function resolveCliProgramArguments(args: string[]): [string, ...string[]] {
  return [process.execPath, resolveCliEntrypoint(), ...args];
}

export function resolveCliRootDir() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}
