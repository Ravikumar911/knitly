import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SlashcashPaths = {
  home: string;
  config: string;
  credentials: string;
  db: string;
  attachments: string;
  cache: string;
  logs: string;
  skills: string;
  pidDir: string;
  pidFile: string;
};

export function resolveSlashcashHome() {
  return resolve(process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"));
}

export function resolvePaths(): SlashcashPaths {
  const home = resolveSlashcashHome();
  return {
    home,
    config: join(home, "config.json"),
    credentials: join(home, "credentials.json"),
    db: process.env.SQLITE_DB_PATH || join(home, "db.sqlite"),
    attachments: join(home, "attachments"),
    cache: join(home, "cache"),
    logs: join(home, "logs"),
    skills: join(home, "skills"),
    pidDir: join(home, "pid"),
    pidFile: join(home, "pid", "slashcash.pid.json"),
  };
}

export function ensureStateDirs(paths = resolvePaths()) {
  mkdirSync(paths.home, { recursive: true, mode: 0o700 });
  mkdirSync(paths.attachments, { recursive: true, mode: 0o700 });
  mkdirSync(paths.cache, { recursive: true, mode: 0o700 });
  mkdirSync(paths.logs, { recursive: true, mode: 0o700 });
  mkdirSync(paths.skills, { recursive: true, mode: 0o700 });
  mkdirSync(paths.pidDir, { recursive: true, mode: 0o700 });
}
