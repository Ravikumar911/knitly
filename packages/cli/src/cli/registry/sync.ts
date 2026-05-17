import type { Command } from "commander";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { loadConfig } from "../../config/load.js";
import { resolvePaths } from "../../config/paths.js";
import { applyRuntimeEnv } from "../../config/runtime-env.js";
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
    .option("--background", "Run sync in a detached background process")
    .option("--query <query>", "Override the configured Gmail query")
    .option("--limit <limit>", "Maximum messages to inspect", (value) =>
      Number(value),
    )
    .action(
      async (options: {
        full?: boolean;
        background?: boolean;
        query?: string;
        limit?: number;
      }) => {
        const config = loadConfig({ createIfMissing: true });
        const paths = resolvePaths();
        if (options.background) {
          const pid = startBackgroundSync(options);
          const pidPath = join(paths.home, "pid", "sync.pid");
          mkdirSync(dirname(pidPath), { recursive: true });
          writeFileSync(pidPath, `${pid}\n`, { mode: 0o600 });
          console.log(
            pc.green(`Initial sync running in background (pid ${pid}).`),
          );
          return;
        }

        const maxMessages =
          options.limit ?? (options.full ? undefined : config.sync.maxMessages);

        installBundledSkills();
        if (!isSkillEnabled(BUNDLED_GMAIL_SWIGGY_SKILL)) {
          throw new CliError({
            area: "config",
            symptom: "The gmail-swiggy skill is disabled.",
            cause: "Disabled skills do not contribute sync jobs.",
            fix: "Run `slashcash skills enable gmail-swiggy`.",
          });
        }

        await applyRuntimeEnv({
          config,
          paths,
          query: options.query || config.sync.gmailQuery,
          maxMessages: maxMessages ?? config.sync.maxMessages,
        });

        const { ensureLocalDatabase, LOCAL_USER_ID } = await loadDatabase();
        ensureLocalDatabase();

        const { runEmailSync } = await loadEmailSync();
        const result = await runEmailSync({
          userId: LOCAL_USER_ID,
          query: options.query || config.sync.gmailQuery,
          maxMessages,
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

function startBackgroundSync(options: {
  full?: boolean;
  query?: string;
  limit?: number;
}) {
  const args = ["--filter", "slashcash", "dev", "--", "sync"];
  if (options.full) args.push("--full");
  if (options.query) args.push("--query", options.query);
  if (options.limit !== undefined) args.push("--limit", String(options.limit));

  const child = spawn("pnpm", args, {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      SLASHCASH_BACKGROUND_SYNC: "1",
    },
  });
  child.unref();
  return child.pid ?? 0;
}
