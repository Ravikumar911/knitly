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

  db.command("repair-extractions")
    .description(
      "Re-run extraction from stored emails/PDFs and upgrade fallback rows",
    )
    .option(
      "--all",
      "Repair every Swiggy transaction, not just fallback rows",
    )
    .action(async (options: { all?: boolean }) => {
      await prepareDbPath();
      process.env.SLASHCASH_REPAIR_ONLY_FALLBACK = options.all ? "0" : "1";
      const { spawnSync } = await import("node:child_process");
      const { dirname, join } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
      const tasksRoot = join(cliRoot, "..", "tasks");
      const result = spawnSync(
        "pnpm",
        ["exec", "tsx", "scripts/repair-extractions.ts"],
        {
          cwd: tasksRoot,
          stdio: "inherit",
          env: process.env,
        },
      );
      process.exitCode = result.status ?? 1;
    });

  db.command("reset")
    .description("Reset the local database and attachments for a fresh Gmail sync")
    .option("-y, --yes", "Skip confirmation")
    .option(
      "--seed",
      "Load deterministic demo transactions after resetting (default: empty database)",
    )
    .action(async (options: { yes?: boolean; seed?: boolean }) => {
      if (!options.yes) {
        console.error("Refusing to reset without --yes.");
        process.exitCode = 1;
        return;
      }
      const paths = resolvePaths();
      rmSync(paths.attachments, { recursive: true, force: true });
      await prepareDbPath();
      const { clearLocalSeedData, ensureLocalDatabase, seedLocalDatabase } =
        await loadDatabase();
      await clearLocalSeedData();
      ensureLocalDatabase();
      if (options.seed) {
        await seedLocalDatabase();
        console.log("Reset and seeded local demo data.");
        return;
      }
      console.log(
        "Reset local database and attachments. Run `slashcash sync --full` to ingest Gmail again.",
      );
    });
}

async function prepareDbPath() {
  loadConfig({ createIfMissing: true });
  process.env.SQLITE_DB_PATH = resolvePaths().db;
  const { ensureLocalDatabase } = await loadDatabase();
  ensureLocalDatabase();
}
