import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-phase-3-"));
const fixtureDir = join(repoRoot, "packages", "e2e-tests", "fixtures", "imap");
const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SLASHCASH_E2E: "0",
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_IMAP_FIXTURE_DIR: fixtureDir,
  SLASHCASH_DOCTOR_SKIP_OLLAMA: "1",
  SLASHCASH_DOCTOR_SKIP_PYTHON: "1",
};

try {
  const onboardHelp = run(["onboard", "--help"]);
  assertIncludes(onboardHelp.stdout, "--yes", "onboard help documents --yes");
  assertIncludes(
    onboardHelp.stdout,
    "--non-interactive",
    "onboard help documents --non-interactive",
  );
  assertIncludes(
    onboardHelp.stdout,
    "--dry-run",
    "onboard help documents --dry-run",
  );
  assertNotIncludes(
    onboardHelp.stdout,
    "--skip-external",
    "onboard help hides E2E-only --skip-external",
  );
  assertNotIncludes(
    onboardHelp.stdout,
    "--skip-auth",
    "onboard help hides E2E-only --skip-auth",
  );

  const doctorHelp = run(["doctor", "--help"]);
  assertIncludes(doctorHelp.stdout, "--fix", "doctor help documents --fix");
  assertIncludes(doctorHelp.stdout, "--json", "doctor help documents --json");
  assertIncludes(doctorHelp.stdout, "--quick", "doctor help documents --quick");

  const privacyHelp = run(["privacy", "--help"]);
  assertIncludes(
    privacyHelp.stdout,
    "Print slashcash privacy facts",
    "privacy help documents the command",
  );

  const first = run(["onboard", "--dry-run", "--yes"]);
  assertIncludes(
    first.stdout,
    "Onboarding complete",
    "first onboard completes",
  );
  assertIncludes(
    first.stdout,
    "slashcash runs fully on your machine",
    "onboard prints privacy banner",
  );

  const started = Date.now();
  const second = run(["onboard", "--dry-run", "--yes"]);
  const elapsedMs = Date.now() - started;
  if (elapsedMs > 2_000) {
    throw new Error(`idempotent onboard took ${elapsedMs}ms`);
  }
  assertIncludes(
    second.stdout,
    "done PDF extractor",
    "rerun keeps the local extractor path idempotent",
  );

  const doctor = run(["doctor", "--quick", "--json"]);
  JSON.parse(extractJsonArray(doctor.stdout));

  const privacy = run(["privacy"]);
  assertIncludes(
    privacy.stdout,
    "slashcash runs fully on your machine",
    "privacy command prints privacy banner",
  );
  console.log("Phase 3 E2E passed.");
} finally {
  rmSync(home, { recursive: true, force: true });
}

function run(args: string[]) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", ...args],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}

function assertIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected ${expected}`);
  }
}

function assertNotIncludes(value: string, expected: string, label: string) {
  if (value.includes(expected)) {
    throw new Error(`${label}: did not expect ${expected}`);
  }
}

function extractJsonArray(value: string) {
  const start = value.indexOf("[");
  const end = value.lastIndexOf("]");
  if (start < 0 || end < start) {
    throw new Error(`Could not find JSON array in output:\n${value}`);
  }
  return value.slice(start, end + 1);
}
