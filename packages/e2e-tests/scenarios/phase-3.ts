import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const home = mkdtempSync(join(tmpdir(), "slashcash-phase-3-"));
const env = {
  ...process.env,
  SLASHCASH_HOME: home,
  SQLITE_DB_PATH: join(home, "db.sqlite"),
  SLASHCASH_DOCTOR_SKIP_GWS: "1",
  SLASHCASH_DOCTOR_SKIP_OLLAMA: "1",
};

try {
  const first = run(["onboard", "--dry-run", "--yes"]);
  assertIncludes(first.stdout, "Onboarding complete", "first onboard completes");
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
  assertIncludes(second.stdout, "done Chat model", "rerun skips model prompt");

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
  const result = spawnSync("pnpm", ["--filter", "slashcash", "dev", "--", ...args], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result;
}

function assertIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected ${expected}`);
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
