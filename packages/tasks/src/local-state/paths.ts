import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, win32 } from "node:path";

export type SlashcashPaths = {
  home: string;
  config: string;
  credentials: string;
  db: string;
  attachments: string;
  cache: string;
  logs: string;
  skills: string;
  pyVenv: string;
  pyInstallHash: string;
  pidDir: string;
  pidFile: string;
};

export function resolveSlashcashHome() {
  return resolve(process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"));
}

export function resolveDesktopSlashcashHome(
  options: {
    platform?: NodeJS.Platform;
    homeDir?: string;
    appData?: string;
  } = {},
) {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? homedir();
  const appData = options.appData ?? process.env.APPDATA;

  if (platform === "darwin") {
    return resolve(homeDir, "Library", "Application Support", "slash.cash");
  }

  if (platform === "win32") {
    return win32.resolve(
      appData || win32.join(homeDir, "AppData", "Roaming"),
      "slash.cash",
    );
  }

  return resolve(
    process.env.XDG_DATA_HOME || join(homeDir, ".local", "share"),
    "slash.cash",
  );
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
    pyVenv: join(home, "py-venv"),
    pyInstallHash: join(home, "py-venv", ".slashcash.install-hash"),
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
