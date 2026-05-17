import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runSingleFlight } from "./mutex.js";

describe("runSingleFlight", () => {
  const originalSlashcashHome = process.env.SLASHCASH_HOME;
  const originalSqliteDbPath = process.env.SQLITE_DB_PATH;
  const homes: string[] = [];

  beforeEach(() => {
    delete process.env.SLASHCASH_HOME;
    delete process.env.SQLITE_DB_PATH;
  });

  afterEach(() => {
    if (originalSlashcashHome === undefined) {
      delete process.env.SLASHCASH_HOME;
    } else {
      process.env.SLASHCASH_HOME = originalSlashcashHome;
    }

    if (originalSqliteDbPath === undefined) {
      delete process.env.SQLITE_DB_PATH;
    } else {
      process.env.SQLITE_DB_PATH = originalSqliteDbPath;
    }

    for (const home of homes.splice(0)) {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it("skips concurrent work for the same key", async () => {
    let release!: () => void;
    const first = runSingleFlight(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve("done");
        }),
      "unit-test",
    );

    const second = await runSingleFlight(async () => "unexpected", "unit-test");
    release();

    expect(second).toEqual({ status: "skipped", reason: "busy" });
    await expect(first).resolves.toEqual({ status: "ran", value: "done" });
  });

  it("skips when another process owns the file lock", async () => {
    const home = tempHome();
    process.env.SLASHCASH_HOME = home;
    mkdirSync(join(home, "pid"), { recursive: true });
    writeFileSync(
      join(home, "pid", "unit-test.lock"),
      JSON.stringify({ pid: process.pid, startedAt: Date.now() }),
    );

    const result = await runSingleFlight(async () => "unexpected", "unit-test");

    expect(result).toEqual({ status: "skipped", reason: "busy" });
  });

  it("releases its own file lock after the run settles", async () => {
    const home = tempHome();
    process.env.SLASHCASH_HOME = home;
    const lockPath = join(home, "pid", "unit-test.lock");

    await expect(
      runSingleFlight(async () => "done", "unit-test"),
    ).resolves.toEqual({
      status: "ran",
      value: "done",
    });

    expect(existsSync(lockPath)).toBe(false);
  });

  function tempHome() {
    const home = mkdtempSync(join(tmpdir(), "slashcash-mutex-"));
    homes.push(home);
    return home;
  }
});
