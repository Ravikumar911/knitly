import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJsonPath = join(cliRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const expectedRepositoryUrl = "https://github.com/Ravikumar911/knitly";

const errors = [
  ...collectPackageMetadataErrors(packageJson),
  ...collectPackFileErrors(runPackDry()),
];

if (errors.length > 0) {
  console.error("release-check failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  `Release metadata verified for ${packageJson.name}@${packageJson.version}.`,
);

function collectPackageMetadataErrors(pkg) {
  const metadataErrors = [];
  const repositoryUrl = normalizeRepositoryUrl(
    typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url,
  );

  if (pkg.name !== "slashcash") {
    metadataErrors.push(
      `package.json name must be "slashcash"; found "${pkg.name ?? ""}".`,
    );
  }
  if (!isSemver(pkg.version)) {
    metadataErrors.push(
      `package.json version must be semver; found "${pkg.version ?? ""}".`,
    );
  }
  if (pkg.private === true) {
    metadataErrors.push("package.json must not be private for npm publish.");
  }
  if (!pkg.description?.trim()) {
    metadataErrors.push("package.json description must be non-empty.");
  }
  if (pkg.license !== "ISC") {
    metadataErrors.push(
      `package.json license must be "ISC"; found "${pkg.license ?? ""}".`,
    );
  }
  if (repositoryUrl !== expectedRepositoryUrl) {
    metadataErrors.push(
      `package.json repository.url must resolve to ${expectedRepositoryUrl}; found ${repositoryUrl || "<missing>"}.`,
    );
  }
  if (pkg.bin?.slashcash !== "bin/slashcash.mjs") {
    metadataErrors.push(
      'package.json bin.slashcash must be "bin/slashcash.mjs".',
    );
  }
  if (pkg.engines?.node !== ">=20") {
    metadataErrors.push('package.json engines.node must be ">=20".');
  }
  if (pkg.publishConfig?.access !== "public") {
    metadataErrors.push('package.json publishConfig.access must be "public".');
  }

  return metadataErrors;
}

function collectPackFileErrors(packResults) {
  const pack = packResults[0];
  const packedPaths = new Set(
    (pack?.files ?? []).map((file) => normalizePackedPath(file.path)),
  );
  const fileErrors = [];
  const requiredPaths = [
    "package.json",
    "README.md",
    "bin/slashcash.mjs",
    "dist/entry.js",
    "bundled-skills/gmail-swiggy/SKILL.md",
  ];

  for (const requiredPath of requiredPaths) {
    if (!packedPaths.has(requiredPath)) {
      fileErrors.push(`npm package is missing required file: ${requiredPath}`);
    }
  }

  if (
    !hasAny(packedPaths, ["dist/app/apps/main/server.js", "dist/app/server.js"])
  ) {
    fileErrors.push(
      "npm package is missing the bundled Next standalone server.js.",
    );
  }

  if (
    !hasAny(packedPaths, [
      "dist/app/apps/main/.next/BUILD_ID",
      "dist/app/.next/BUILD_ID",
    ])
  ) {
    fileErrors.push("npm package is missing the bundled Next BUILD_ID.");
  }

  for (const packedPath of packedPaths) {
    if (
      /(^|\/)\.env/.test(packedPath) ||
      /(^|\/)\.git(\/|$)/.test(packedPath) ||
      /(^|\/)\.turbo(\/|$)/.test(packedPath) ||
      /(^|\/)coverage(\/|$)/.test(packedPath) ||
      /(^|\/)__pycache__(\/|$)/.test(packedPath) ||
      /(^|\/)(test|tests|fixtures|test-fixtures)(\/|$)/.test(packedPath) ||
      /(^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/.test(packedPath) ||
      /\.(?:pyc|pyo)$/.test(packedPath)
    ) {
      fileErrors.push(
        `npm package contains forbidden release cargo: ${packedPath}`,
      );
    }
  }

  return fileErrors;
}

function runPackDry() {
  if (!existsSync(join(cliRoot, "dist", "entry.js"))) {
    throw new Error(
      "CLI build output is missing. Run `pnpm pack:local` first.",
    );
  }

  const raw = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: cliRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 128 * 1024 * 1024,
    },
  );

  return JSON.parse(raw);
}

function hasAny(paths, candidates) {
  return candidates.some((candidate) => paths.has(candidate));
}

function isSemver(value) {
  return (
    typeof value === "string" &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
  );
}

function normalizePackedPath(packedPath) {
  return packedPath.replace(/\\/g, "/");
}

function normalizeRepositoryUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/^git\+/, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
}
