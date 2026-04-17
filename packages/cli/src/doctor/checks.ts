import { accessSync } from "node:fs";
import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { loadDatabase } from "../runtime/database.js";
import { commandExists, runCommand } from "../runtime/subprocess.js";
import {
  installBundledSkills,
  listInstalledSkills,
} from "../skills/registry.js";
import { formatCliError } from "../errors/format.js";
import { classifyGwsDiagnostic } from "./gws-diagnostics.js";

export type DoctorCheck = {
  id: string;
  name: string;
  label: string;
  category: "filesystem" | "network" | "binary" | "schema";
  status: "ok" | "fail";
  message: string;
  durationMs: number;
  fix?: string;
};

export async function runChecks(
  options: { fix?: boolean; quick?: boolean } = {},
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const paths = resolvePaths();
  const started = new Map<string, number>();

  function begin(id: string) {
    started.set(id, Date.now());
  }

  function push(
    check: Omit<DoctorCheck, "durationMs" | "name"> & { name?: string },
  ) {
    checks.push({
      ...check,
      name: check.name ?? check.label,
      durationMs: Date.now() - (started.get(check.id) ?? Date.now()),
    });
  }

  if (options.fix) {
    ensureStateDirs(paths);
  }

  begin("node");
  push({
    id: "node",
    name: "Node",
    label: "Node",
    category: "binary",
    status: Number(process.versions.node.split(".")[0]) >= 20 ? "ok" : "fail",
    message: process.version,
    fix: "Install Node 20 or newer.",
  });

  begin("state-dir");
  try {
    ensureStateDirs(paths);
    accessSync(paths.home);
    push({
      id: "state-dir",
      name: "State directory",
      label: "State directory",
      category: "filesystem",
      status: "ok",
      message: paths.home,
    });
  } catch (error) {
    push({
      id: "state-dir",
      name: "State directory",
      label: "State directory",
      category: "filesystem",
      status: "fail",
      message: String(error),
      fix: "Run `slashcash doctor --fix`.",
    });
  }

  begin("config");
  try {
    const config = loadConfig({ createIfMissing: true });
    push({
      id: "config",
      name: "Config",
      label: "Config",
      category: "schema",
      status: "ok",
      message: paths.config,
    });
    begin("sync-schedule");
    push({
      id: "sync-schedule",
      name: "Sync schedule",
      label: "Sync schedule",
      category: "schema",
      status: config.sync.schedule.trim() ? "ok" : "fail",
      message: config.sync.schedule,
      fix: "Run `slashcash config set sync.schedule '*/15 * * * *'`.",
    });
  } catch (error) {
    push({
      id: "config",
      name: "Config",
      label: "Config",
      category: "schema",
      status: "fail",
      message: String(error),
      fix: "Run `slashcash doctor --fix`.",
    });
  }

  begin("sqlite");
  try {
    process.env.SQLITE_DB_PATH = paths.db;
    const { ensureLocalDatabase } = await loadDatabase();
    ensureLocalDatabase();
    accessSync(paths.db);
    push({
      id: "sqlite",
      name: "SQLite",
      label: "SQLite",
      category: "filesystem",
      status: "ok",
      message: paths.db,
    });
  } catch (error) {
    push({
      id: "sqlite",
      name: "SQLite",
      label: "SQLite",
      category: "filesystem",
      status: "fail",
      message: String(error),
      fix: "Run `slashcash doctor --fix`.",
    });
  }

  if (options.fix) {
    installBundledSkills();
  }

  begin("skills");
  try {
    const skills = listInstalledSkills();
    push({
      id: "skills",
      name: "Skills",
      label: "Skills",
      category: "filesystem",
      status: skills.some((skill) => skill.id === "gmail-swiggy")
        ? "ok"
        : "fail",
      message: `${skills.length} installed`,
      fix: "Run `slashcash doctor --fix`.",
    });

    for (const skill of skills.filter((candidate) => candidate.enabled)) {
      for (const bin of skill.manifest.requires.bins) {
        const id = `${skill.id}:${bin}`;
        begin(id);
        push({
          id,
          name: `${skill.id}:${bin}`,
          label: `${skill.id}:${bin}`,
          category: "binary",
          status:
            commandExists(bin) || process.env.SLASHCASH_DOCTOR_SKIP_GWS === "1"
              ? "ok"
              : "fail",
          message: commandExists(bin) ? "available" : "missing from PATH",
          fix:
            bin === "gws"
              ? "Run `brew install googleworkspace-cli`."
              : `Install ${bin} and retry.`,
        });
      }
    }
  } catch (error) {
    push({
      id: "skills",
      name: "Skills",
      label: "Skills",
      category: "filesystem",
      status: "fail",
      message: String(error),
      fix: "Run `slashcash doctor --fix`.",
    });
  }

  const config = loadConfig({ createIfMissing: true });
  if (!options.quick) {
    checks.push(
      await checkOllama(config.ai.ollamaBaseUrl, config.ai.chatModel),
    );
    checks.push(checkGwsAuth());
  }

  return checks;
}

async function checkOllama(
  baseUrl: string,
  model: string,
): Promise<DoctorCheck> {
  const started = Date.now();
  const base = {
    id: "ollama",
    name: "Ollama",
    label: "Ollama",
    category: "network" as const,
    durationMs: 0,
    fix: "Run `brew services start ollama` and `ollama pull <model>`.",
  };

  if (process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA === "1") {
    return {
      ...base,
      status: "ok",
      message: "Skipped by environment",
      durationMs: Date.now() - started,
    };
  }

  try {
    const url = new URL(baseUrl);
    url.pathname = "/api/tags";
    const response = await fetch(url);
    if (!response.ok) {
      return {
        ...base,
        status: "fail",
        message: `HTTP ${response.status}`,
        durationMs: Date.now() - started,
      };
    }
    const body = (await response.json()) as {
      models?: Array<{ name?: string }>;
    };
    const models = body.models ?? [];
    const hasModel = models.some((candidate) => candidate.name === model);
    return {
      ...base,
      name: "Ollama",
      status: hasModel ? "ok" : "fail",
      message: hasModel ? `${baseUrl} (${model})` : `${model} not pulled`,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ...base,
      status: "fail",
      message: String(error),
      durationMs: Date.now() - started,
    };
  }
}

function checkGwsAuth(): DoctorCheck {
  const started = Date.now();
  const base = {
    id: "gws-auth",
    name: "gws auth",
    label: "gws auth",
    category: "network" as const,
    durationMs: 0,
    fix: "Run `gws auth login --scopes gmail.readonly`.",
  };

  if (
    process.env.SLASHCASH_DOCTOR_SKIP_GWS === "1" ||
    process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA === "1"
  ) {
    return {
      ...base,
      status: "ok",
      message: "Skipped by environment",
      durationMs: Date.now() - started,
    };
  }

  if (!commandExists("gws")) {
    return {
      ...base,
      category: "binary",
      status: "fail",
      message: "gws is missing from PATH",
      fix: "Run `brew install googleworkspace-cli`.",
      durationMs: Date.now() - started,
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      ...base,
      status: "ok",
      message: "service account credentials set",
      durationMs: Date.now() - started,
    };
  }

  const result = runCommand("gws", ["auth", "status", "--format", "json"], {
    timeoutMs: 15_000,
  });
  const diagnostic = result.ok
    ? null
    : classifyGwsDiagnostic(`${result.stderr}\n${result.stdout}`);
  return {
    ...base,
    name: "gws auth",
    status: result.ok ? "ok" : "fail",
    message: result.ok ? "authenticated" : formatCliError(diagnostic!),
    fix: diagnostic?.fix ?? base.fix,
    durationMs: Date.now() - started,
  };
}
