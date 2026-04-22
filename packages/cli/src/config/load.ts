import { readFileSync, writeFileSync } from "node:fs";
import { ensureStateDirs, resolvePaths } from "./paths.js";
import { configSchema, defaultConfig, type SlashcashConfig } from "./schema.js";

export function loadConfig(options: { createIfMissing?: boolean } = {}): SlashcashConfig {
  const paths = resolvePaths();
  ensureStateDirs(paths);

  if (options.createIfMissing) {
    try {
      readFileSync(paths.config, "utf8");
    } catch {
      writeConfig(defaultConfig);
    }
  }

  try {
    const raw = JSON.parse(readFileSync(paths.config, "utf8")) as unknown;
    const parsed = configSchema.parse(raw);
    if (JSON.stringify(parsed) !== JSON.stringify(raw)) {
      writeConfig(parsed);
    }
    return parsed;
  } catch (error) {
    if (options.createIfMissing) {
      writeConfig(defaultConfig);
      return defaultConfig;
    }
    throw error;
  }
}

export function writeConfig(config: SlashcashConfig) {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  const parsed = configSchema.parse(config);
  writeFileSync(paths.config, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
}

export function setConfigValue(path: string, value: string) {
  const config = loadConfig({ createIfMissing: true }) as Record<string, unknown>;
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Config path is required.");
  }

  let cursor = config;
  for (const segment of segments.slice(0, -1)) {
    const next = cursor[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]!] = coerceValue(value);
  writeConfig(configSchema.parse(config));
}

export function getConfigValue(path: string) {
  const config = loadConfig({ createIfMissing: true }) as Record<string, unknown>;
  return path.split(".").filter(Boolean).reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, config);
}

function coerceValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && value.trim() !== "") return numeric;
  return value;
}
