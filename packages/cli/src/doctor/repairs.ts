import { resetStoredCredentials } from "../config/credentials.js";
import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { ensurePythonEnvReady } from "../python/env.js";
import { loadDatabase } from "../runtime/database.js";
import { installBundledSkills } from "../skills/registry.js";

export async function repairPhase1State() {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  const config = loadConfig({ createIfMissing: true });
  installBundledSkills();
  process.env.SQLITE_DB_PATH = paths.db;
  const { ensureLocalDatabase } = await loadDatabase();
  ensureLocalDatabase();
  const pythonEnv = await ensurePythonEnvReady({
    config,
    paths,
    fix: true,
  });
  if (!pythonEnv.ok) {
    throw new Error(pythonEnv.error.message);
  }
}

export async function resetDoctorCredentials() {
  await resetStoredCredentials();
}
