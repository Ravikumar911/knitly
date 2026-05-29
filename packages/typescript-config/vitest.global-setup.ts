import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ENV_KEYS = [
  "HOME",
  "USERPROFILE",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "SLASHCASH_TEST_HOME",
  "SLASHCASH_HOME",
  "SQLITE_DB_PATH",
  "SLASHCASH_ATTACHMENTS_DIR",
  "VITEST",
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

export default function setupSlashcashVitestHome() {
  const previousEnv = new Map<EnvKey, string | undefined>(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  // Opt-in: hit the developer's real ~/.slashcash db (see finance-live.test.ts).
  if (
    process.env.SLASHCASH_LIVE_FINANCE_TEST === "1" &&
    process.env.SQLITE_DB_PATH?.trim()
  ) {
    process.env.VITEST = "true";
    return () => {
      for (const key of ENV_KEYS) {
        const value = previousEnv.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    };
  }

  const testHome = mkdtempSync(join(tmpdir(), "slashcash-vitest-home-"));
  const slashcashHome = join(testHome, ".slashcash");

  mkdirSync(slashcashHome, { recursive: true, mode: 0o700 });

  process.env.HOME = testHome;
  process.env.USERPROFILE = testHome;
  process.env.XDG_CACHE_HOME = join(testHome, ".cache");
  process.env.XDG_CONFIG_HOME = join(testHome, ".config");
  process.env.XDG_DATA_HOME = join(testHome, ".local", "share");
  process.env.XDG_STATE_HOME = join(testHome, ".local", "state");
  process.env.SLASHCASH_TEST_HOME = testHome;
  process.env.SLASHCASH_HOME = slashcashHome;
  process.env.SQLITE_DB_PATH = join(slashcashHome, "db.sqlite");
  process.env.SLASHCASH_ATTACHMENTS_DIR = join(slashcashHome, "attachments");
  process.env.VITEST = "true";

  return () => {
    for (const key of ENV_KEYS) {
      const value = previousEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    rmSync(testHome, { recursive: true, force: true });
  };
}
