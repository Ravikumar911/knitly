import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePaths } from "../config/paths.js";
import {
  clearPidFile,
  isProcessAlive,
  readPidFile,
  writePidFile,
} from "./pid.js";

describe("pid file helpers", () => {
  const previousHome = process.env.SLASHCASH_HOME;
  const previousDbPath = process.env.SQLITE_DB_PATH;
  let home = "";

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "slashcash-cli-pid-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.SQLITE_DB_PATH;
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.SLASHCASH_HOME;
    } else {
      process.env.SLASHCASH_HOME = previousHome;
    }

    if (previousDbPath === undefined) {
      delete process.env.SQLITE_DB_PATH;
    } else {
      process.env.SQLITE_DB_PATH = previousDbPath;
    }

    rmSync(home, { recursive: true, force: true });
  });

  it("writes, reads, and clears the pid file", () => {
    const pid = {
      pid: process.pid,
      port: 3000,
      dbPath: "/tmp/slashcash/db.sqlite",
      attachmentsPath: "/tmp/slashcash/attachments",
      startedAt: "2026-04-22T00:00:00.000Z",
    };

    writePidFile(pid);

    expect(readPidFile()).toEqual(pid);
    expect(existsSync(resolvePaths().pidFile)).toBe(true);

    clearPidFile();

    expect(readPidFile()).toBeNull();
  });

  it("detects live and missing processes", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
    expect(isProcessAlive(999_999)).toBe(false);
  });
});
