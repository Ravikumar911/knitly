import { accessSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type DatabaseModule = typeof import("@workspace/database");

let loadedDatabase: Promise<DatabaseModule> | undefined;

export async function loadDatabase(): Promise<DatabaseModule> {
  loadedDatabase ??= import(packagedDatabaseEntry() ?? "@workspace/database").then((mod) => {
    const databaseModule = mod as Partial<DatabaseModule> & { default?: DatabaseModule };
    return (databaseModule.ensureLocalDatabase ? databaseModule : databaseModule.default ?? mod) as DatabaseModule;
  });

  return loadedDatabase;
}

function packagedDatabaseEntry() {
  const here = dirname(fileURLToPath(import.meta.url));
  if (!here.includes(`${sep}dist${sep}`)) return null;

  const candidate = join(here, "..", "app", "packages", "database", "dist", "src", "index.js");
  try {
    accessSync(candidate);
    return pathToFileURL(candidate).href;
  } catch {
    return null;
  }
}
