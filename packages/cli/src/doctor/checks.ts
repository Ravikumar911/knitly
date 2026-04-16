import { accessSync } from "node:fs";
import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { loadDatabase } from "../runtime/database.js";

export type DoctorCheck = {
  name: string;
  status: "ok" | "fail";
  message: string;
};

export async function runChecks(options: { fix?: boolean } = {}): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const paths = resolvePaths();

  if (options.fix) {
    ensureStateDirs(paths);
  }

  checks.push({
    name: "Node",
    status: Number(process.versions.node.split(".")[0]) >= 20 ? "ok" : "fail",
    message: process.version,
  });

  try {
    ensureStateDirs(paths);
    accessSync(paths.home);
    checks.push({ name: "State directory", status: "ok", message: paths.home });
  } catch (error) {
    checks.push({ name: "State directory", status: "fail", message: String(error) });
  }

  try {
    loadConfig({ createIfMissing: true });
    checks.push({ name: "Config", status: "ok", message: paths.config });
  } catch (error) {
    checks.push({ name: "Config", status: "fail", message: String(error) });
  }

  try {
    process.env.SQLITE_DB_PATH = paths.db;
    const { ensureLocalDatabase } = await loadDatabase();
    ensureLocalDatabase();
    accessSync(paths.db);
    checks.push({ name: "SQLite", status: "ok", message: paths.db });
  } catch (error) {
    checks.push({ name: "SQLite", status: "fail", message: String(error) });
  }

  checks.push(await checkOllama(loadConfig({ createIfMissing: true }).ai.ollamaBaseUrl));
  return checks;
}

async function checkOllama(baseUrl: string): Promise<DoctorCheck> {
  if (process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA === "1") {
    return { name: "Ollama", status: "ok", message: "Skipped by environment" };
  }

  try {
    const url = new URL(baseUrl);
    url.pathname = "/api/tags";
    const response = await fetch(url);
    if (!response.ok) {
      return { name: "Ollama", status: "fail", message: `HTTP ${response.status}` };
    }
    return { name: "Ollama", status: "ok", message: baseUrl };
  } catch (error) {
    return { name: "Ollama", status: "fail", message: String(error) };
  }
}
