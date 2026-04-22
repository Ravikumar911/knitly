import {
  appendFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";

export const logEventSchema = z
  .object({
    ts: z.number().int(),
    level: z.enum(["debug", "info", "warn", "error"]),
    area: z.enum([
      "cli",
      "onboard",
      "doctor",
      "ingest",
      "cron",
      "ai",
      "http",
      "db",
      "skills",
      "runtime",
      "internal",
    ]),
    msg: z.string().min(1),
    cmd: z.string().optional(),
    step: z.string().optional(),
    durationMs: z.number().optional(),
    errCode: z.string().optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]));

export type LogEvent = z.infer<typeof logEventSchema>;
export type LogArea = LogEvent["area"];
export type LogLevel = LogEvent["level"];

const MAX_LOG_BYTES = 10 * 1024 * 1024;
const RETENTION_DAYS = 14;
const levels: LogLevel[] = ["debug", "info", "warn", "error"];

export function writeLog(area: LogArea, data: Record<string, unknown> = {}) {
  const event = normalizeLogEvent(area, data);
  appendLogEvent(event);
}

export function readLogEvents(
  options: {
    tail?: number;
    areas?: LogArea[];
    sinceMs?: number;
    minLevel?: LogLevel;
  } = {},
) {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  const minLevel = options.minLevel ?? "debug";
  const minLevelIndex = levels.indexOf(minLevel);
  const sinceMs = options.sinceMs ?? 0;
  const events: LogEvent[] = [];

  for (const file of listLogFiles()) {
    const path = join(paths.logs, file);
    const content = existsSync(path) ? readFileLines(path) : [];
    for (const line of content) {
      const event = parseLogLine(line);
      if (!event) continue;
      if (event.ts < sinceMs) continue;
      if (levels.indexOf(event.level) < minLevelIndex) continue;
      if (options.areas && !options.areas.includes(event.area)) continue;
      events.push(event);
    }
  }

  events.sort((left, right) => left.ts - right.ts);
  return options.tail && options.tail > 0
    ? events.slice(-options.tail)
    : events;
}

export function listLogFiles() {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  return readdirSync(paths.logs)
    .filter((file) => /^\d{4}-\d{2}-\d{2}(?:-\d+)?\.log$/.test(file))
    .sort();
}

function appendLogEvent(event: LogEvent) {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  cleanupOldLogs();

  const file = resolveCurrentLogFile();
  appendFileSync(file, `${JSON.stringify(event)}\n`);
}

function normalizeLogEvent(
  area: LogArea,
  data: Record<string, unknown>,
): LogEvent {
  const raw = {
    ts: Date.now(),
    level:
      typeof data.level === "string" && levels.includes(data.level as LogLevel)
        ? data.level
        : "info",
    area,
    msg: String(data.msg ?? data.event ?? area),
    ...withoutReservedUndefined(data),
  };

  const parsed = logEventSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  return {
    ts: Date.now(),
    level: "error",
    area: "internal",
    msg: "log validation failed",
    errCode: "log-validation",
  };
}

function withoutReservedUndefined(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

function resolveCurrentLogFile() {
  const paths = resolvePaths();
  const date = new Date().toISOString().slice(0, 10);
  const base = join(paths.logs, `${date}.log`);
  if (!existsSync(base) || statSync(base).size < MAX_LOG_BYTES) {
    return base;
  }

  return join(paths.logs, `${date}-${Date.now()}.log`);
}

function cleanupOldLogs() {
  const paths = resolvePaths();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of listLogFiles()) {
    const path = join(paths.logs, file);
    try {
      if (statSync(path).mtimeMs < cutoff) {
        rmSync(path, { force: true });
      }
    } catch {
      // Best effort cleanup only.
    }
  }
}

function readFileLines(path: string) {
  try {
    return statSync(path).size > 0
      ? readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function parseLogLine(line: string) {
  try {
    const parsed = logEventSchema.safeParse(JSON.parse(line) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
