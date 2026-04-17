import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tarball = resolve(cliRoot, process.argv[2] ?? findLatestTarball());
const tempRoot = mkdtempSync(join(tmpdir(), "slashcash-packed-install-"));
const packageRoot = join(tempRoot, "node_modules", "slashcash");
const modulesToResolve = [
  "next",
  "next/dist/server/lib/start-server",
  "react",
  "react-dom",
  "drizzle-orm",
];

try {
  installPackedTarball();
  verifyPackagedServerResolution();
  console.log(`Packed install verified from ${tarball}`);
} finally {
  if (process.env.SLASHCASH_KEEP_PACK_SMOKE !== "1") {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function findLatestTarball() {
  const tarballs = readdirSync(cliRoot)
    .filter((entry) => /^slashcash-\d+\.\d+\.\d+.*\.tgz$/.test(entry))
    .toSorted((left, right) => right.localeCompare(left));

  if (tarballs.length === 0) {
    throw new Error("No slashcash tarball found. Run `pnpm --dir packages/cli pack` first.");
  }

  return tarballs[0];
}

function installPackedTarball() {
  const npm = process.env.SLASHCASH_PACK_SMOKE_NPM || "npm";
  const result = spawnSync(npm, ["install", "--prefix", tempRoot, "--ignore-scripts", tarball], {
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Packed install failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function verifyPackagedServerResolution() {
  const serverCandidates = [
    join(packageRoot, "dist", "app", "apps", "main", "server.js"),
    join(packageRoot, "dist", "app", "server.js"),
  ];
  const server = serverCandidates.find((candidate) => existsSync(candidate));

  if (!server) {
    throw new Error("Packed install is missing the bundled dashboard server.js.");
  }

  const buildId = join(dirname(server), ".next", "BUILD_ID");
  if (!existsSync(buildId)) {
    throw new Error("Packed install is missing the bundled dashboard .next/BUILD_ID.");
  }

  const requireFromServer = createRequire(server);
  for (const moduleName of modulesToResolve) {
    try {
      requireFromServer.resolve(moduleName);
    } catch (error) {
      throw new Error(`Packed dashboard cannot resolve ${moduleName}: ${error.message}`);
    }
  }
}
