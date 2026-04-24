import { accessSync } from "node:fs";
import { getCredentialState } from "../config/credentials.js";
import { loadConfig } from "../config/load.js";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";
import { runPythonEnvCheck } from "./python-env.js";
import { loadDatabase } from "../runtime/database.js";
import { loadImapClient } from "../runtime/tasks.js";
import { commandExists } from "../runtime/subprocess.js";
import {
  installBundledSkills,
  listInstalledSkills,
} from "../skills/registry.js";

export type DoctorCheck = {
  id: string;
  name: string;
  label: string;
  category: "filesystem" | "network" | "binary" | "schema" | "auth";
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

  checks.push(
    await runPythonEnvCheck({
      config: loadConfig({ createIfMissing: true }),
      paths,
      fix: options.fix,
    }),
  );

  begin("gmail-credentials");
  try {
    if (process.env.SLASHCASH_IMAP_FIXTURE_DIR) {
      push({
        id: "gmail-credentials",
        name: "Gmail credentials",
        label: "Gmail credentials",
        category: "auth",
        status: "ok",
        message: "fixture mode",
        fix: "Unset SLASHCASH_IMAP_FIXTURE_DIR to validate a real Gmail account.",
      });
    } else {
      const credentialState = await getCredentialState();
      push({
        id: "gmail-credentials",
        name: "Gmail credentials",
        label: "Gmail credentials",
        category: "auth",
        status: credentialState.store ? "ok" : "fail",
        message: credentialState.store
          ? credentialState.warning
            ? `${credentialState.address} (${credentialState.warning})`
            : `${credentialState.address} (${credentialState.store})`
          : "missing",
        fix: credentialState.store
          ? "Optional: rerun `slashcash onboard` to move credentials into Keychain."
          : "Run `slashcash onboard` to save a Gmail address and app password.",
      });
    }
  } catch (error) {
    push({
      id: "gmail-credentials",
      name: "Gmail credentials",
      label: "Gmail credentials",
      category: "auth",
      status: "fail",
      message: String(error),
      fix: "Run `slashcash onboard` to save a Gmail address and app password.",
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
          status: commandExists(bin) ? "ok" : "fail",
          message: commandExists(bin) ? "available" : "missing from PATH",
          fix: `Install ${bin} and retry.`,
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
    checks.push(await checkGmailImap());
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

async function checkGmailImap(): Promise<DoctorCheck> {
  const started = Date.now();
  const base = {
    id: "gmail-imap",
    name: "Gmail IMAP",
    label: "Gmail IMAP",
    category: "auth" as const,
    durationMs: 0,
    fix: "Run `slashcash doctor --reset-credentials`, then rerun `slashcash onboard`.",
  };

  if (process.env.SLASHCASH_IMAP_FIXTURE_DIR) {
    return {
      ...base,
      status: "ok",
      message: "fixture mode",
      durationMs: Date.now() - started,
    };
  }

  const credentialState = await getCredentialState();
  if (!credentialState.store) {
    return {
      ...base,
      status: "fail",
      message: "credentials missing",
      durationMs: Date.now() - started,
      fix: "Run `slashcash onboard` to save Gmail IMAP credentials.",
    };
  }

  try {
    const { verifyImapLogin } = await loadImapClient();
    const result = await verifyImapLogin();
    if (!result.ok) {
      return {
        ...base,
        status: "fail",
        message: result.error.symptom,
        durationMs: Date.now() - started,
        fix: result.error.fix,
      };
    }

    return {
      ...base,
      status: "ok",
      message: `imap.gmail.com:993 (${result.data.address})`,
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
