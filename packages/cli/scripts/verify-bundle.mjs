import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  readdirSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(cliRoot, "dist", "app");
const budgetBytes = Number(
  process.env.SLASHCASH_BUNDLE_BUDGET_BYTES || 350 * 1024 * 1024,
);
const runtimeDependencies = [
  "@ai-sdk/openai-compatible",
  "ai",
  "better-sqlite3",
  "dotenv",
  "drizzle-orm",
  "next",
  "react",
  "react-dom",
];
const installedRuntimePackagePattern = new RegExp(
  `(^|/)node_modules/(?:\\.pnpm/(?:${runtimeDependencies
    .map(toPnpmPackageDirPrefix)
    .map(escapeRegExp)
    .join(
      "|",
    )})@[^/]+|(?:${runtimeDependencies.map(escapeRegExp).join("|")}))(/|$)`,
);

const serverCandidates = [
  join(appRoot, "apps", "main", "server.js"),
  join(appRoot, "server.js"),
];

if (!serverCandidates.some((candidate) => existsSync(candidate))) {
  throw new Error(
    "Bundled app server.js is missing. Run `pnpm pack:local` first.",
  );
}

const cliPackage = JSON.parse(
  readFileSync(join(cliRoot, "package.json"), "utf8"),
);
const missingRuntimeDependencies = runtimeDependencies.filter(
  (name) => !cliPackage.dependencies?.[name],
);
if (missingRuntimeDependencies.length > 0) {
  throw new Error(
    `CLI package is missing bundled runtime dependencies: ${missingRuntimeDependencies.join(", ")}`,
  );
}

const shippedFiles = [...walk(appRoot)];
const totalBytes = shippedFiles.reduce(
  (sum, file) => sum + lstatSync(file).size,
  0,
);
if (totalBytes > budgetBytes) {
  throw new Error(
    `Bundle is ${totalBytes} bytes, above budget ${budgetBytes} bytes.`,
  );
}

const forbidden = shippedFiles.filter((file) => {
  const name = file.slice(appRoot.length + 1);
  return (
    /(^|\/)\.env/.test(name) ||
    /(^|\/)\.gitignore$/.test(name) ||
    /(^|\/)\.turbo(\/|$)/.test(name) ||
    /(^|\/)coverage(\/|$)/.test(name) ||
    /(^|\/)__pycache__(\/|$)/.test(name) ||
    /(^|\/)\.next\/cache(\/|$)/.test(name) ||
    installedRuntimePackagePattern.test(name) ||
    /(^|\/)(test|tests|fixtures|test-fixtures)(\/|$)/.test(name) ||
    /\.(?:d\.ts|ts|tsx|map|pyc|pyo)$/.test(name)
  );
});

if (forbidden.length > 0) {
  throw new Error(`Bundle contains forbidden files:\n${forbidden.join("\n")}`);
}

const escapingSymlinks = shippedFiles.filter((file) => {
  if (!lstatSync(file).isSymbolicLink()) return false;
  const target = readlinkSync(file);
  if (isAbsolute(target)) return true;
  const resolved = resolve(dirname(file), target);
  const rel = relative(appRoot, resolved);
  return rel.startsWith("..") || isAbsolute(rel);
});
if (escapingSymlinks.length > 0) {
  throw new Error(
    `Bundle contains symlinks that escape dist/app:\n${escapingSymlinks.join("\n")}`,
  );
}

console.log(
  `Bundle verified: ${shippedFiles.length} files, ${totalBytes} bytes.`,
);

function* walk(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) {
      yield path;
    } else if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPnpmPackageDirPrefix(packageName) {
  return packageName.replace("/", "+");
}
