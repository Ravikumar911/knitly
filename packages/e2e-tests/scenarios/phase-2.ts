import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-phase-2-"));
const fixtureDir = join(repoRoot, "packages", "e2e-tests", "fixtures", "imap");

const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_ATTACHMENTS_DIR: join(home, "attachments"),
  SLASHCASH_IMAP_FIXTURE_DIR: fixtureDir,
  SLASHCASH_SYNC_SKIP_AI: "1",
  SLASHCASH_DOCTOR_SKIP_OLLAMA: "1",
  SLASHCASH_NO_OPEN: "1",
};

try {
  run("onboard", ["--dry-run"]);

  const skills = run("skills", ["list"]);
  assertIncludes(
    skills.stdout,
    "gmail-swiggy",
    "skills list includes gmail-swiggy",
  );
  assertIncludes(
    skills.stdout,
    "enabled",
    "skills list marks gmail-swiggy enabled",
  );

  run("doctor", ["--quick"]);

  const sync = run("sync", ["--full"]);
  assertIncludes(sync.stdout, "1 processed", "sync ingests the IMAP fixture");
  if (readdirSync(join(home, "attachments")).length === 0) {
    throw new Error("sync did not write any attachment fixtures");
  }

  run("skills", ["disable", "gmail-swiggy"]);
  runExpectFailure("sync", ["--full"], "gmail-swiggy skill is disabled");
  run("skills", ["enable", "gmail-swiggy"]);

  console.log("Phase 2 E2E passed.");
} finally {
  rmSync(home, { recursive: true, force: true });
}

function run(command: string, args: string[]) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", command, ...args],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `slashcash ${command} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  console.log(`slashcash ${command}: ok`);
  return result;
}

function runExpectFailure(command: string, args: string[], expected: string) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", command, ...args],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );

  if (result.status === 0) {
    throw new Error(`slashcash ${command} was expected to fail`);
  }

  assertIncludes(
    `${result.stdout}\n${result.stderr}`,
    expected,
    `slashcash ${command} failure message`,
  );
  console.log(`slashcash ${command}: blocked as expected`);
}

function assertIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected to find ${expected}`);
  }
}
