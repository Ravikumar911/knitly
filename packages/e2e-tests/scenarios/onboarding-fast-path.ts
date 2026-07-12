import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  createDefaultOnboardHost,
  runOnboardPipeline,
  type UiPort,
  type UiSpinner,
} from "@workspace/tasks/onboard";

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
  SLASHCASH_BUNDLED_SKILLS_DIR: join(
    repoRoot,
    "packages/cli/bundled-skills",
  ),
};

Object.assign(process.env, env);

function silentSpinner(): UiSpinner {
  return {
    start() {},
    message() {},
    stop() {},
    error() {},
    cancel() {},
  };
}

const silentUi: UiPort = {
  intro() {},
  outro() {},
  note() {},
  async select({ initialValue }) {
    return initialValue;
  },
  async text() {
    return "";
  },
  async password() {
    return "";
  },
  async confirm() {
    return true;
  },
  spinner: silentSpinner,
};

try {
  await runOnboardPipeline({
    ui: silentUi,
    host: createDefaultOnboardHost({
      bundledSkillsRoot: join(repoRoot, "packages/cli/bundled-skills"),
      startDetachedCommand: () => 0,
    }),
    yes: true,
    showPrivacyBanner: false,
  });

  const elapsedMs = Date.now() - started;
  if (elapsedMs > 30_000) {
    throw new Error(`onboarding took ${elapsedMs}ms, expected < 30000ms`);
  }
  if (!existsSync(join(home, "db.sqlite"))) {
    throw new Error("onboarding did not create db.sqlite");
  }

  const result = spawnSync(
    "pnpm",
    ["--filter", "slashcash", "dev", "--", "assistant", "status"],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `assistant status failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  console.log(`Onboarding fast path passed in ${elapsedMs}ms.`);
} finally {
  rmSync(home, { recursive: true, force: true });
}
