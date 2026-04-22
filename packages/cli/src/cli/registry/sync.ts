import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../../config/load.js";
import { resolvePaths } from "../../config/paths.js";
import { loadDatabase } from "../../runtime/database.js";
import { loadEmailSync } from "../../runtime/tasks.js";
import {
  BUNDLED_GMAIL_SWIGGY_SKILL,
  installBundledSkills,
  isSkillEnabled,
} from "../../skills/registry.js";
import { CliError } from "../../errors/format.js";

export function register(program: Command) {
  program
    .command("sync")
    .description("Run Gmail sync now")
    .option("--full", "Scan the configured Gmail query from the beginning")
    .option("--query <query>", "Override the configured Gmail query")
    .option("--limit <limit>", "Maximum messages to inspect", (value) =>
      Number(value),
    )
    .action(
      async (options: { full?: boolean; query?: string; limit?: number }) => {
        const config = loadConfig({ createIfMissing: true });
        const paths = resolvePaths();

        installBundledSkills();
        if (!isSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL)) {
          throw new CliError({
            area: "config",
            symptom: "The gmail-swiggy skill is disabled.",
            cause: "Disabled skills do not contribute sync jobs.",
            fix: "Run `slashcash skills enable gmail-swiggy`.",
          });
        }

        process.env.SQLITE_DB_PATH = paths.db;
        process.env.SLASHCASH_HOME = paths.home;
        process.env.SLASHCASH_ATTACHMENTS_DIR = paths.attachments;
        process.env.SLASHCASH_GMAIL_QUERY =
          options.query || config.sync.gmailQuery;
        process.env.SLASHCASH_SYNC_LIMIT = String(
          options.limit || config.sync.maxMessages,
        );
        process.env.OLLAMA_BASE_URL = config.ai.ollamaBaseUrl;
        process.env.OLLAMA_CHAT_MODEL = config.ai.chatModel;
        process.env.OLLAMA_VISION_MODEL = config.ai.visionModel;

        const { ensureLocalDatabase, LOCAL_USER_ID } = await loadDatabase();
        ensureLocalDatabase();

        const { runEmailSync } = await loadEmailSync();
        const result = await runEmailSync({
          userId: LOCAL_USER_ID,
          query: process.env.SLASHCASH_GMAIL_QUERY,
          maxMessages: Number(process.env.SLASHCASH_SYNC_LIMIT),
          full: options.full,
        });

        if (result.skipped) {
          console.log(
            pc.yellow("A sync is already running. Skipped this request."),
          );
          return;
        }

        console.log(
          pc.green(
            `Sync complete: ${result.processedCount} processed, ${result.skippedCount} skipped, ${result.errorCount} failed.`,
          ),
        );
      },
    );
}
