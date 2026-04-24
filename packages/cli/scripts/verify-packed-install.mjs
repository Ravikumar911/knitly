import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  verifyBundledWorkspacePackageResolution();
  await verifyCliRuntimeResolver();
  console.log(`Packed install verified from ${tarball}`);
} finally {
  if (process.env.SLASHCASH_KEEP_PACK_SMOKE !== "1") {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function verifyBundledWorkspacePackageResolution() {
  const databaseEntry = join(
    packageRoot,
    "dist",
    "app",
    "packages",
    "database",
    "dist",
    "index.js",
  );
  if (!existsSync(databaseEntry)) {
    throw new Error(
      "Packed install is missing the bundled database entrypoint.",
    );
  }

  const taskEntry = join(
    packageRoot,
    "dist",
    "app",
    "packages",
    "tasks",
    "dist",
    "trigger",
    "processEmails.js",
  );
  if (!existsSync(taskEntry)) {
    throw new Error(
      "Packed install is missing the bundled email sync entrypoint.",
    );
  }

  const requireFromTask = createRequire(taskEntry);
  try {
    requireFromTask.resolve("@workspace/database");
  } catch (error) {
    throw new Error(
      `Packed email sync cannot resolve @workspace/database: ${error.message}`,
    );
  }
}

async function verifyCliRuntimeResolver() {
  try {
    const runtime = await import(
      pathToFileURL(join(packageRoot, "dist", "runtime", "database.js")).href
    );
    if (typeof runtime.loadDatabase !== "function") {
      throw new Error("dist/runtime/database.js does not export loadDatabase.");
    }
    if (typeof runtime.resolveDatabaseModuleSpecifier !== "function") {
      throw new Error(
        "dist/runtime/database.js does not export resolveDatabaseModuleSpecifier.",
      );
    }

    const specifier = runtime.resolveDatabaseModuleSpecifier();
    if (!specifier.startsWith("file:")) {
      throw new Error(
        `packed database resolver returned a non-file specifier: ${specifier}`,
      );
    }

    const resolvedPath = fileURLToPath(specifier);
    if (!existsSync(resolvedPath)) {
      throw new Error(
        `packed database resolver returned a missing file: ${resolvedPath}`,
      );
    }
    if (
      !resolvedPath.endsWith(
        join("dist", "app", "packages", "database", "dist", "index.js"),
      )
    ) {
      throw new Error(
        `packed database resolver returned the wrong file: ${resolvedPath}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Packed CLI cannot resolve the bundled database runtime: ${error.message}`,
    );
  }
}

function findLatestTarball() {
  const tarballs = readdirSync(cliRoot)
    .filter((entry) => /^slashcash-\d+\.\d+\.\d+.*\.tgz$/.test(entry))
    .toSorted((left, right) => right.localeCompare(left));

  if (tarballs.length === 0) {
    throw new Error(
      "No slashcash tarball found. Run `pnpm --dir packages/cli pack` first.",
    );
  }

  return tarballs[0];
}

function installPackedTarball() {
  const npm = process.env.SLASHCASH_PACK_SMOKE_NPM || "npm";
  const result = spawnSync(
    npm,
    ["install", "--prefix", tempRoot, "--ignore-scripts", tarball],
    {
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_fund: "false",
      },
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Packed install failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

function verifyPackagedServerResolution() {
  const serverCandidates = [
    join(packageRoot, "dist", "app", "apps", "main", "server.js"),
    join(packageRoot, "dist", "app", "server.js"),
  ];
  const server = serverCandidates.find((candidate) => existsSync(candidate));

  if (!server) {
    throw new Error(
      "Packed install is missing the bundled dashboard server.js.",
    );
  }

  const buildId = join(dirname(server), ".next", "BUILD_ID");
  if (!existsSync(buildId)) {
    throw new Error(
      "Packed install is missing the bundled dashboard .next/BUILD_ID.",
    );
  }

  const requireFromServer = createRequire(server);
  for (const moduleName of modulesToResolve) {
    try {
      requireFromServer.resolve(moduleName);
    } catch (error) {
      throw new Error(
        `Packed dashboard cannot resolve ${moduleName}: ${error.message}`,
      );
    }
  }
}
