import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(
  readFileSync(join(cliRoot, "package.json"), "utf8"),
);
const version = process.argv[2] ?? packageJson.version;
const packageSpec = `slashcash@${version}`;
const tempRoot = mkdtempSync(join(tmpdir(), "slashcash-published-install-"));
const homeDir = join(tempRoot, "home");
const packageRoot = join(tempRoot, "node_modules", "slashcash");
const installAttempts = readPositiveIntegerEnv(
  "SLASHCASH_PUBLISHED_SMOKE_ATTEMPTS",
  6,
);
const installRetryDelayMs = readPositiveIntegerEnv(
  "SLASHCASH_PUBLISHED_SMOKE_RETRY_DELAY_MS",
  15_000,
);

try {
  installPublishedPackage();
  verifyPackageLayout();
  verifyInstalledBinary();
  console.log(`Published install verified for ${packageSpec}.`);
} finally {
  if (process.env.SLASHCASH_KEEP_PUBLISHED_SMOKE !== "1") {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function installPublishedPackage() {
  const npm = process.env.SLASHCASH_PUBLISHED_SMOKE_NPM || "npm";

  for (let attempt = 1; attempt <= installAttempts; attempt += 1) {
    console.log(
      `Installing ${packageSpec} from npm registry (attempt ${attempt}/${installAttempts}).`,
    );

    const result = spawnSync(
      npm,
      [
        "install",
        "--prefix",
        tempRoot,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry",
        "https://registry.npmjs.org",
        packageSpec,
      ],
      {
        env: {
          ...process.env,
          HOME: homeDir,
          SLASHCASH_HOME: join(homeDir, ".slashcash"),
        },
        stdio: "inherit",
      },
    );

    if (result.status === 0) {
      return;
    }

    if (attempt < installAttempts) {
      console.log(
        `Published install failed with exit code ${result.status ?? "unknown"}; retrying in ${installRetryDelayMs}ms.`,
      );
      sleep(installRetryDelayMs);
    }
  }

  throw new Error(
    `Published install failed after ${installAttempts} attempts.`,
  );
}

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function verifyPackageLayout() {
  const serverCandidates = [
    join(packageRoot, "dist", "app", "apps", "main", "server.js"),
    join(packageRoot, "dist", "app", "server.js"),
  ];
  const server = serverCandidates.find((candidate) => existsSync(candidate));

  if (!server) {
    throw new Error(
      "Published package is missing the bundled dashboard server.js.",
    );
  }

  const buildId = join(dirname(server), ".next", "BUILD_ID");
  if (!existsSync(buildId)) {
    throw new Error(
      "Published package is missing the bundled dashboard .next/BUILD_ID.",
    );
  }

  const skill = join(packageRoot, "bundled-skills", "gmail-swiggy", "SKILL.md");
  if (!existsSync(skill)) {
    throw new Error(
      "Published package is missing the bundled gmail-swiggy skill.",
    );
  }
}

function verifyInstalledBinary() {
  const binPath = join(packageRoot, "bin", "slashcash.mjs");
  const output = execFileSync(process.execPath, [binPath, "--version"], {
    cwd: tempRoot,
    env: {
      ...process.env,
      HOME: homeDir,
      SLASHCASH_HOME: join(homeDir, ".slashcash"),
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

  if (output !== version) {
    throw new Error(
      `Published package version mismatch: expected ${version}, found ${output}.`,
    );
  }
}
