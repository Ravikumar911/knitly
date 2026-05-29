import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readPackageVersion() {
  const here = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    readFileSync(join(here, "..", "package.json"), "utf8"),
  ) as {
    version?: string;
  };
  return packageJson.version || "0.0.0";
}

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
if (args.includes("--version") || args[0] === "version") {
  const version = readPackageVersion();
  console.log(version);
  await maybePrintUpdateHint(version);
  process.exit(0);
}

const { runCli } = await import("./cli/run.js");
await runCli(args, { version: readPackageVersion() });

async function maybePrintUpdateHint(currentVersion: string) {
  const home = resolve(
    process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"),
  );
  const configPath = join(home, "config.json");
  if (!existsSync(configPath)) return;

  let enabled = false;
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      updates?: { checkOnVersion?: boolean };
    };
    enabled = config.updates?.checkOnVersion === true;
  } catch {
    return;
  }
  if (!enabled) return;

  const cacheDir = join(home, "cache");
  const cachePath = join(cacheDir, "last-update-check.json");
  const cached = readUpdateCache(cachePath);
  if (cached && Date.now() - cached.checkedAt < 24 * 60 * 60 * 1000) {
    printVersionHint(currentVersion, cached.latest);
    return;
  }

  try {
    const response = await fetch("https://registry.npmjs.org/slashcash", {
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      "dist-tags"?: { latest?: string };
    };
    const latest = body["dist-tags"]?.latest;
    if (!latest) return;

    mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
    writeFileSync(
      cachePath,
      `${JSON.stringify({ checkedAt: Date.now(), latest }, null, 2)}\n`,
      { mode: 0o600 },
    );
    printVersionHint(currentVersion, latest);
  } catch {
    // Version checks are best-effort and never make `--version` fail.
  }
}

type UpdateCache = {
  checkedAt: number;
  latest: string;
};

function readUpdateCache(path: string): UpdateCache | null {
  try {
    const cache = JSON.parse(readFileSync(path, "utf8")) as {
      checkedAt?: number;
      latest?: string;
    };
    return typeof cache.checkedAt === "number" &&
      typeof cache.latest === "string"
      ? { checkedAt: cache.checkedAt, latest: cache.latest }
      : null;
  } catch {
    return null;
  }
}

function printVersionHint(currentVersion: string, latest: string) {
  if (latest !== currentVersion) {
    console.error(`newer version available: ${latest}`);
  }
}
