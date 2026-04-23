import type { SlashcashPaths } from "../config/paths.js";
import type { SlashcashConfig } from "../config/schema.js";
import { applyRuntimeEnv } from "../config/runtime-env.js";
import { loadDatabase } from "../runtime/database.js";
import { writeLog } from "../runtime/log.js";
import { loadEmailSync } from "../runtime/tasks.js";
import { isSkillEnabled, listInstalledSkills } from "./registry.js";
import type { InstalledSkill } from "./schema.js";

export type SkillJobRegistration = {
  id: string;
  skillId: string;
  jobId: string;
  schedule: string;
  mutexKey: string;
  run: () => Promise<void>;
};

export function buildSkillJobRegistrations(
  config: SlashcashConfig,
  paths: SlashcashPaths,
): SkillJobRegistration[] {
  return listInstalledSkills().flatMap((skill) =>
    skill.manifest.jobs.map((job) => ({
      id: `${skill.id}:${job.id}`,
      skillId: skill.id,
      jobId: job.id,
      schedule: job.schedule || config.sync.schedule,
      mutexKey: job.mutexKey || `${skill.id}:${job.id}`,
      run: () => runSkillJob(skill, job.handler, config, paths),
    })),
  );
}

async function runSkillJob(
  skill: InstalledSkill,
  handler: string,
  config: SlashcashConfig,
  paths: SlashcashPaths,
) {
  if (!isSkillEnabled(skill.id)) {
    writeLog("cron", {
      event: "skipped",
      skillId: skill.id,
      reason: "skill disabled",
    });
    return;
  }

  if (handler !== "runEmailSync") {
    throw new Error(`Unknown skill job handler: ${handler}`);
  }

  await applyRuntimeEnv({
    config,
    paths,
  });

  const { ensureLocalDatabase, LOCAL_USER_ID } = await loadDatabase();
  ensureLocalDatabase();

  const { runEmailSync } = await loadEmailSync();
  const result = await runEmailSync({
    userId: LOCAL_USER_ID,
    query: config.sync.gmailQuery,
    maxMessages: config.sync.maxMessages,
  });

  writeLog("cron", { event: "sync", skillId: skill.id, ...result });
}
