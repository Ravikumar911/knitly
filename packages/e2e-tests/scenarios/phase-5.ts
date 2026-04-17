import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(`${tmpdir()}/slashcash-phase-5-`);

try {
  run(["--filter", "@workspace/evals", "eval:gate"], {
    SLASHCASH_EVAL_SKIP_MODEL: process.env.SLASHCASH_EVAL_SKIP_MODEL ?? "1",
  });
  run(["bench"]);
  verifyLogsReader();

  console.log("Phase 5 E2E passed.");
} finally {
  rmSync(home, { recursive: true, force: true });
}

function run(args: string[], extraEnv: Record<string, string> = {}) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result;
}

function verifyLogsReader() {
  const logsDir = resolve(home, "logs");
  mkdirSync(logsDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(
    resolve(logsDir, `${today}.log`),
    `${JSON.stringify({
      ts: Date.now(),
      level: "info",
      area: "ingest",
      msg: "fixture ingest",
      durationMs: 12,
    })}\n`,
  );

  const output = run(
    ["--filter", "slashcash", "dev", "--", "logs", "--tail", "1", "--filter", "ingest", "--json"],
    {
      SLASHCASH_HOME: home,
      SQLITE_DB_PATH: resolve(home, "db.sqlite"),
    },
  );
  const jsonLine = output.stdout
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("{"));
  if (!jsonLine) {
    throw new Error(`logs reader did not print a JSON event: ${output.stdout}`);
  }
  const event = JSON.parse(jsonLine) as { area?: string; durationMs?: number };
  if (event.area !== "ingest" || event.durationMs !== 12) {
    throw new Error(`logs reader returned unexpected event: ${output.stdout}`);
  }
}
