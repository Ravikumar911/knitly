import cron from "node-cron";
import type { SlashcashConfig } from "../config/schema.js";
import type { SlashcashPaths } from "../config/paths.js";
import { loadDatabase } from "../runtime/database.js";
import { writeLog } from "../runtime/log.js";
import { loadEmailSync } from "../runtime/tasks.js";
import { BUNDLED_GMAIL_SWIGGY_SKILL, isSkillEnabled } from "../skills/registry.js";

const GMAIL_SWIGGY_JOB_ID = "gmail-swiggy.sync";
const registeredJobs = new Map<string, () => Promise<void>>();

export function startCronWorker(config: SlashcashConfig, paths: SlashcashPaths) {
  void registerGmailSwiggyJob(config, paths);

  const task = cron.schedule(config.sync.schedule, () => {
    void runRegisteredJob();
  }, {
    scheduled: true,
  });

  return {
    stop() {
      task.stop();
    },
  };
}

async function registerGmailSwiggyJob(config: SlashcashConfig, paths: SlashcashPaths) {
  registeredJobs.set(GMAIL_SWIGGY_JOB_ID, () => runScheduledSync(config, paths));
}

async function runRegisteredJob() {
  try {
    const job = registeredJobs.get(GMAIL_SWIGGY_JOB_ID);
    if (!job) {
      throw new Error(`Unknown job: ${GMAIL_SWIGGY_JOB_ID}`);
    }
    await job();
  } catch (error) {
    writeLog("cron", { event: "failed", error: error instanceof Error ? error.message : String(error) });
  }
}

async function runScheduledSync(config: SlashcashConfig, paths: SlashcashPaths) {
  if (!isSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL)) {
    writeLog("cron", { event: "skipped", reason: "gmail-swiggy disabled" });
    return;
  }

  try {
    process.env.SQLITE_DB_PATH = paths.db;
    process.env.SLASHCASH_HOME = paths.home;
    process.env.SLASHCASH_ATTACHMENTS_DIR = paths.attachments;
    process.env.SLASHCASH_GMAIL_QUERY = config.sync.gmailQuery;
    process.env.SLASHCASH_SYNC_LIMIT = String(config.sync.maxMessages);
    process.env.OLLAMA_BASE_URL = config.ai.ollamaBaseUrl;
    process.env.OLLAMA_CHAT_MODEL = config.ai.chatModel;
    process.env.OLLAMA_VISION_MODEL = config.ai.visionModel;

    const { ensureLocalDatabase, LOCAL_USER_ID } = await loadDatabase();
    ensureLocalDatabase();

    const { runEmailSync } = await loadEmailSync();
    const result = await runEmailSync({
      userId: LOCAL_USER_ID,
      query: config.sync.gmailQuery,
      maxMessages: config.sync.maxMessages,
    });

    writeLog("cron", { event: "sync", ...result });
  } catch (error) {
    writeLog("cron", {
      event: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
