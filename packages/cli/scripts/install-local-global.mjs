import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(cliRoot, "..", "..");
const packageJsonPath = join(cliRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const tarball = join(cliRoot, packTarballName(packageName, packageVersion));
const pnpm = process.env.SLASHCASH_LOCAL_INSTALL_PNPM || "pnpm";
const npm = process.env.SLASHCASH_LOCAL_INSTALL_NPM || "npm";

run(pnpm, ["pack:local"], { cwd: repoRoot });

if (!existsSync(tarball)) {
  throw new Error(
    `Expected ${tarball} after packing ${packageName}@${packageVersion}.`,
  );
}

run(npm, ["install", "--global", tarball], {
  cwd: repoRoot,
  env: {
    ...process.env,
    npm_config_audit: "false",
    npm_config_fund: "false",
  },
});

verifyGlobalInstall();
console.log(
  `Installed ${packageName}@${packageVersion} globally from ${tarball}`,
);

function packTarballName(name, version) {
  return `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${
        result.status ?? "unknown"
      }.`,
    );
  }
}

function read(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${
        result.status ?? "unknown"
      }.`,
    );
  }

  return result.stdout.trim();
}

function verifyGlobalInstall() {
  const globalRoot = read(npm, ["root", "--global"], { cwd: repoRoot });
  const installedPackageJsonPath = join(
    globalRoot,
    packageName,
    "package.json",
  );

  if (!existsSync(installedPackageJsonPath)) {
    throw new Error(
      `Could not find the global ${packageName} package at ${installedPackageJsonPath}.`,
    );
  }

  const installedPackageJson = JSON.parse(
    readFileSync(installedPackageJsonPath, "utf8"),
  );
  if (installedPackageJson.version !== packageVersion) {
    throw new Error(
      `Expected global ${packageName}@${packageVersion}, found ${installedPackageJson.version}.`,
    );
  }
}
