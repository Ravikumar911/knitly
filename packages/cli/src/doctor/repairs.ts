import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { loadDatabase } from "../runtime/database.js";
import { installBundledSkills } from "../skills/registry.js";

export async function repairPhase1State() {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  loadConfig({ createIfMissing: true });
  installBundledSkills();
  process.env.SQLITE_DB_PATH = paths.db;
  const { ensureLocalDatabase } = await loadDatabase();
  ensureLocalDatabase();
}
