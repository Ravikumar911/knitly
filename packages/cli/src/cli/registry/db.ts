import { rmSync } from "node:fs";
import type { Command } from "commander";
import { resolvePaths } from "../../config/paths.js";
import { loadConfig } from "../../config/load.js";
import { loadDatabase } from "../../runtime/database.js";

export function register(program: Command) {
  const db = program.command("db").description("Manage the local database");

  db.command("seed").description("Seed deterministic local Swiggy data").action(async () => {
    await prepareDbPath();
    const { seedLocalDatabase } = await loadDatabase();
    await seedLocalDatabase();
    console.log("Seeded local Swiggy data.");
  });

  db.command("reset")
    .description("Reset the local database and attachments")
    .option("-y, --yes", "Skip confirmation")
    .action(async (options: { yes?: boolean }) => {
      if (!options.yes) {
        console.error("Refusing to reset without --yes.");
        process.exitCode = 1;
        return;
      }
      const paths = resolvePaths();
      rmSync(paths.attachments, { recursive: true, force: true });
      await prepareDbPath();
      const { seedLocalDatabase } = await loadDatabase();
      await seedLocalDatabase();
      console.log("Reset and seeded local data.");
    });
}

async function prepareDbPath() {
  loadConfig({ createIfMissing: true });
  process.env.SQLITE_DB_PATH = resolvePaths().db;
  const { ensureLocalDatabase } = await loadDatabase();
  ensureLocalDatabase();
}
