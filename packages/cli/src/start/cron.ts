import cron, { type ScheduledTask } from "node-cron";
import type { SlashcashConfig } from "../config/schema.js";
import type { SlashcashPaths } from "../config/paths.js";
import { writeLog } from "../runtime/log.js";
import { buildSkillJobRegistrations } from "../skills/jobs.js";

export function startCronWorker(
  config: SlashcashConfig,
  paths: SlashcashPaths,
) {
  const tasks = new Map<string, ScheduledTask>();
  const registrations = buildSkillJobRegistrations(config, paths);

  for (const registration of registrations) {
    if (!cron.validate(registration.schedule)) {
      writeLog("cron", {
        level: "warn",
        event: "invalid-schedule",
        skillId: registration.skillId,
        jobId: registration.jobId,
        schedule: registration.schedule,
      });
      continue;
    }

    const task = cron.schedule(
      registration.schedule,
      () => {
        void registration.run().catch((error) => {
          writeLog("cron", {
            level: "error",
            event: "failed",
            skillId: registration.skillId,
            jobId: registration.jobId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      },
      {
        scheduled: true,
      },
    );

    tasks.set(registration.id, task);
    writeLog("cron", {
      event: "registered",
      skillId: registration.skillId,
      jobId: registration.jobId,
      schedule: registration.schedule,
    });
  }

  if (tasks.size === 0) {
    writeLog("cron", { level: "warn", event: "no-jobs" });
  }

  return {
    stop() {
      for (const [id, task] of tasks) {
        task.stop();
        writeLog("cron", { event: "stopped", job: id });
      }
      tasks.clear();
    },
  };
}
