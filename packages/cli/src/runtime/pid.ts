import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { ensureStateDirs, resolvePaths } from "../config/paths.js";

export type PidFile = {
  pid: number;
  port: number;
  dbPath: string;
  attachmentsPath: string;
  startedAt: string;
};

export function readPidFile(): PidFile | null {
  try {
    return JSON.parse(readFileSync(resolvePaths().pidFile, "utf8")) as PidFile;
  } catch {
    return null;
  }
}

export function writePidFile(pid: PidFile) {
  const paths = resolvePaths();
  ensureStateDirs(paths);
  writeFileSync(paths.pidFile, `${JSON.stringify(pid, null, 2)}\n`, { mode: 0o600 });
}

export function clearPidFile() {
  rmSync(resolvePaths().pidFile, { force: true });
}

export function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
