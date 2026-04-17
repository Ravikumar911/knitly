import { accessSync } from "node:fs";
import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { loadDatabase } from "../runtime/database.js";
import { commandExists, runCommand } from "../runtime/subprocess.js";
import { installBundledSkills, listInstalledSkills } from "../skills/registry.js";

export type DoctorCheck = {
  name: string;
  status: "ok" | "fail";
  message: string;
};

export async function runChecks(options: { fix?: boolean; quick?: boolean } = {}): Promise<DoctorCheck[]> {
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
    const config = loadConfig({ createIfMissing: true });
    checks.push({ name: "Config", status: "ok", message: paths.config });
    checks.push({
      name: "Sync schedule",
      status: config.sync.schedule.trim() ? "ok" : "fail",
      message: config.sync.schedule,
    });
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

  if (options.fix) {
    installBundledSkills();
  }

  try {
    const skills = listInstalledSkills();
    checks.push({
      name: "Skills",
      status: skills.some((skill) => skill.id === "gmail-swiggy") ? "ok" : "fail",
      message: `${skills.length} installed`,
    });

    for (const skill of skills.filter((candidate) => candidate.enabled)) {
      for (const bin of skill.manifest.requires.bins) {
        checks.push({
          name: `${skill.id}:${bin}`,
          status: commandExists(bin) || process.env.SLASHCASH_DOCTOR_SKIP_GWS === "1" ? "ok" : "fail",
          message: commandExists(bin) ? "available" : "missing from PATH",
        });
      }
    }
  } catch (error) {
    checks.push({ name: "Skills", status: "fail", message: String(error) });
  }

  const config = loadConfig({ createIfMissing: true });
  if (!options.quick) {
    checks.push(await checkOllama(config.ai.ollamaBaseUrl, config.ai.chatModel));
    checks.push(checkGwsAuth());
  }

  return checks;
}

async function checkOllama(baseUrl: string, model: string): Promise<DoctorCheck> {
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
    const body = await response.json() as { models?: Array<{ name?: string }> };
    const models = body.models ?? [];
    const hasModel = models.some((candidate) => candidate.name === model);
    return {
      name: "Ollama",
      status: hasModel ? "ok" : "fail",
      message: hasModel ? `${baseUrl} (${model})` : `${model} not pulled`,
    };
  } catch (error) {
    return { name: "Ollama", status: "fail", message: String(error) };
  }
}

function checkGwsAuth(): DoctorCheck {
  if (process.env.SLASHCASH_DOCTOR_SKIP_GWS === "1" || process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA === "1") {
    return { name: "gws auth", status: "ok", message: "Skipped by environment" };
  }

  if (!commandExists("gws")) {
    return { name: "gws auth", status: "fail", message: "gws is missing from PATH" };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { name: "gws auth", status: "ok", message: "service account credentials set" };
  }

  const result = runCommand("gws", ["auth", "status", "--format", "json"], { timeoutMs: 15_000 });
  return {
    name: "gws auth",
    status: result.ok ? "ok" : "fail",
    message: result.ok ? "authenticated" : "run slashcash onboard",
  };
}
