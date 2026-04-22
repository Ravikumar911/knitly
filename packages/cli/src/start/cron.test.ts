import { describe, expect, it, vi } from "vitest";
import { defaultConfig } from "../config/schema.js";

const mocks = vi.hoisted(() => ({
  validate: vi.fn(),
  schedule: vi.fn(),
  buildSkillJobRegistrations: vi.fn(),
  writeLog: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: {
    validate: mocks.validate,
    schedule: mocks.schedule,
  },
}));

vi.mock("../skills/jobs.js", () => ({
  buildSkillJobRegistrations: mocks.buildSkillJobRegistrations,
}));

vi.mock("../runtime/log.js", () => ({
  writeLog: mocks.writeLog,
}));

describe("cron worker", () => {
  const paths = {
    home: "/tmp/slashcash-home",
    config: "/tmp/slashcash-home/config.json",
    db: "/tmp/slashcash-home/db.sqlite",
    attachments: "/tmp/slashcash-home/attachments",
    cache: "/tmp/slashcash-home/cache",
    logs: "/tmp/slashcash-home/logs",
    skills: "/tmp/slashcash-home/skills",
    pidDir: "/tmp/slashcash-home/pid",
    pidFile: "/tmp/slashcash-home/pid/slashcash.pid.json",
  };

  it("skips invalid schedules and warns when there is nothing to run", async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.buildSkillJobRegistrations.mockReturnValue([
      {
        id: "gmail-swiggy:sync",
        skillId: "gmail-swiggy",
        jobId: "sync",
        schedule: "not a cron string",
        mutexKey: "gmail-swiggy:sync",
        run: vi.fn(),
      },
    ]);
    mocks.validate.mockReturnValue(false);

    const { startCronWorker } = await import("./cron.js");
    const worker = startCronWorker(defaultConfig, paths);

    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      level: "warn",
      event: "invalid-schedule",
      skillId: "gmail-swiggy",
      jobId: "sync",
      schedule: "not a cron string",
    });
    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      level: "warn",
      event: "no-jobs",
    });

    worker.stop();
  });

  it("registers valid schedules, logs task failures, and stops tasks cleanly", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const stop = vi.fn();
    let scheduledCallback: (() => void) | undefined;
    const run = vi.fn().mockRejectedValue(new Error("sync failed"));

    mocks.buildSkillJobRegistrations.mockReturnValue([
      {
        id: "gmail-swiggy:sync",
        skillId: "gmail-swiggy",
        jobId: "sync",
        schedule: "*/15 * * * *",
        mutexKey: "gmail-swiggy:sync",
        run,
      },
    ]);
    mocks.validate.mockReturnValue(true);
    mocks.schedule.mockImplementation((_schedule, callback, options) => {
      scheduledCallback = callback;
      expect(options).toEqual({ scheduled: true });
      return { stop };
    });

    const { startCronWorker } = await import("./cron.js");
    const worker = startCronWorker(defaultConfig, paths);

    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      event: "registered",
      skillId: "gmail-swiggy",
      jobId: "sync",
      schedule: "*/15 * * * *",
    });

    scheduledCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      level: "error",
      event: "failed",
      skillId: "gmail-swiggy",
      jobId: "sync",
      error: "sync failed",
    });

    worker.stop();

    expect(stop).toHaveBeenCalledOnce();
    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      event: "stopped",
      job: "gmail-swiggy:sync",
    });
  });
});
