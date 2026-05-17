import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export type MutexRunResult<T> =
  | { status: "ran"; value: T }
  | { status: "skipped"; reason: "busy" };

const active = new Map<string, Promise<unknown>>();
const lockTtlMs = 2 * 60 * 60 * 1000;

export function isSyncActive(key = "default") {
  return active.has(key);
}

export async function runSingleFlight<T>(
  fn: () => Promise<T>,
  key = "default",
): Promise<MutexRunResult<T>> {
  if (active.has(key)) {
    return { status: "skipped", reason: "busy" };
  }

  const fileLock = acquireFileLock(key);
  if (fileLock.status === "busy") {
    return { status: "skipped", reason: "busy" };
  }

  const run = Promise.resolve().then(fn);
  active.set(key, run);

  try {
    const value = await run;
    return { status: "ran", value };
  } finally {
    if (active.get(key) === run) {
      active.delete(key);
    }
    fileLock.release();
  }
}

type FileLockResult =
  | { status: "acquired"; release: () => void }
  | { status: "disabled"; release: () => void }
  | { status: "busy" };

function acquireFileLock(key: string): FileLockResult {
  const home = resolveLockHome();
  if (!home) {
    return { status: "disabled", release: () => undefined };
  }

  const lockDir = join(home, "pid");
  const lockPath = join(lockDir, `${safeLockName(key)}.lock`);
  mkdirSync(lockDir, { recursive: true, mode: 0o700 });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(
        lockPath,
        JSON.stringify({
          key,
          pid: process.pid,
          startedAt: Date.now(),
        }),
        { flag: "wx", mode: 0o600 },
      );
      return {
        status: "acquired",
        release: () => removeOwnLock(lockPath),
      };
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }
      if (!isStaleLock(lockPath)) {
        return { status: "busy" };
      }
      rmSync(lockPath, { force: true });
    }
  }

  return { status: "busy" };
}

function resolveLockHome() {
  if (process.env.SLASHCASH_HOME) {
    return process.env.SLASHCASH_HOME;
  }

  if (process.env.SQLITE_DB_PATH) {
    return dirname(process.env.SQLITE_DB_PATH);
  }

  return null;
}

function safeLockName(key: string) {
  return key.replace(/[^a-zA-Z0-9._-]+/g, "-") || "default";
}

function isFileExistsError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EEXIST"
  );
}

function isStaleLock(lockPath: string) {
  const lock = readLock(lockPath);
  if (!lock) return true;

  if (Date.now() - lock.startedAt > lockTtlMs) {
    return true;
  }

  return !isProcessRunning(lock.pid);
}

function readLock(lockPath: string) {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf8")) as {
      pid?: unknown;
      startedAt?: unknown;
    };
    const pid = Number(parsed.pid);
    const startedAt = Number(parsed.startedAt);
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isFinite(startedAt)) {
      return null;
    }
    return { pid, startedAt };
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EPERM"
    ) {
      return true;
    }
    return false;
  }
}

function removeOwnLock(lockPath: string) {
  if (!existsSync(lockPath)) return;

  const lock = readLock(lockPath);
  if (lock?.pid === process.pid) {
    rmSync(lockPath, { force: true });
  }
}
