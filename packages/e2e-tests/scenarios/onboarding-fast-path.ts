import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-onboarding-fast-"));
const started = Date.now();

const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_E2E: "1",
  SLASHCASH_NO_OPEN: "1",
  SLASHCASH_IMAP_FIXTURE_DIR: join(
    repoRoot,
    "packages/e2e-tests/fixtures/imap",
  ),
};

try {
  run(["--filter", "slashcash", "dev", "--", "onboard", "--yes"]);
  const elapsedMs = Date.now() - started;
  if (elapsedMs > 30_000) {
    throw new Error(`onboarding took ${elapsedMs}ms, expected < 30000ms`);
  }
  if (!existsSync(join(home, "db.sqlite"))) {
    throw new Error("onboarding did not create db.sqlite");
  }
  run(["--filter", "slashcash", "dev", "--", "assistant", "status"]);
  console.log(`Onboarding fast path passed in ${elapsedMs}ms.`);
} finally {
  rmSync(home, { recursive: true, force: true });
}

function run(args: string[]) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `pnpm ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}
