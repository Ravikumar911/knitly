import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";

export function writeLog(event: string, data: Record<string, unknown> = {}) {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  appendFileSync(
    join(paths.logs, "slashcash.log"),
    `${JSON.stringify({ ts: new Date().toISOString(), event, ...data })}\n`,
  );
}
