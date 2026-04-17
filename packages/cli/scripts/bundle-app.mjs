import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(cliRoot, "..", "..");
const appRoot = join(repoRoot, "apps", "main");
const standaloneRoot = join(appRoot, ".next", "standalone");
const appStatic = join(appRoot, ".next", "static");
const appPublic = join(appRoot, "public");
const packagesRoot = join(repoRoot, "packages");
const targetRoot = join(cliRoot, "dist", "app");
const targetMainRoot = join(targetRoot, "apps", "main");

if (!existsSync(join(standaloneRoot, "apps", "main", "server.js")) && !existsSync(join(standaloneRoot, "server.js"))) {
  throw new Error("Next standalone output is missing. Run `pnpm --filter @knitly/main build` first.");
}

rmSync(targetRoot, { recursive: true, force: true });
mkdirSync(targetRoot, { recursive: true });
cpSync(standaloneRoot, targetRoot, {
  recursive: true,
  filter: shouldCopyToBundle,
});

if (existsSync(appStatic)) {
  mkdirSync(join(targetMainRoot, ".next"), { recursive: true });
  cpSync(appStatic, join(targetMainRoot, ".next", "static"), { recursive: true });
}

if (existsSync(appPublic)) {
  cpSync(appPublic, join(targetMainRoot, "public"), { recursive: true });
}

copyBuiltWorkspacePackage("database");
copyBuiltWorkspacePackage("tasks");
copyBuiltWorkspacePackageToNodeModules("database");

console.log(`Bundled Next standalone app into ${targetRoot}`);

function copyBuiltWorkspacePackage(name) {
  const source = join(packagesRoot, name);
  const target = join(targetRoot, "packages", name);
  if (!existsSync(join(source, "dist"))) {
    throw new Error(`Missing ${name} dist output. Run pnpm --filter @workspace/${name} build first.`);
  }

  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(join(source, "package.json"), join(target, "package.json"));
  cpSync(join(source, "dist"), join(target, "dist"), {
    recursive: true,
    filter: shouldCopyToBundle,
  });
}

function copyBuiltWorkspacePackageToNodeModules(name) {
  const source = join(targetRoot, "packages", name);
  const target = join(targetRoot, "node_modules", "@workspace", name);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, filter: shouldCopyToBundle });
}

function shouldCopyToBundle(source) {
  const normalized = source.split("\\").join("/");
  return (
    !normalized.includes("/.next/cache") &&
    !normalized.includes("/.turbo/") &&
    !/(^|\/)\.env/.test(normalized) &&
    !/(^|\/)(test|tests|fixtures|test-fixtures)(\/|$)/.test(normalized) &&
    !/\.(?:d\.ts|ts|tsx|map)$/.test(normalized)
  );
}
