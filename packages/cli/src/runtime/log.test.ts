import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLogEvents, writeLog } from "./log.js";

describe("structured logs", () => {
  it("writes and filters JSONL events under SLASHCASH_HOME", () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-cli-test-"));
    const previousHome = process.env.SLASHCASH_HOME;
    process.env.SLASHCASH_HOME = home;

    try {
      writeLog("cron", {
        event: "tick",
        skillId: "gmail-swiggy",
        durationMs: 12,
      });

      const events = readLogEvents({ areas: ["cron"], tail: 1 });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        area: "cron",
        msg: "tick",
        durationMs: 12,
      });
    } finally {
      if (previousHome) {
        process.env.SLASHCASH_HOME = previousHome;
      } else {
        delete process.env.SLASHCASH_HOME;
      }
      rmSync(home, { recursive: true, force: true });
    }
  });
});
