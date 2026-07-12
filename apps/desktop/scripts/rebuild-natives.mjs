/**
 * Rebuild better-sqlite3 and keytar in the staged runtime for the Electron ABI.
 *
 * Packaged launch uses process.execPath + ELECTRON_RUN_AS_NODE=1, so natives must
 * match Electron's NODE_MODULE_VERSION (not system Node). Prefer rebuilding the
 * staged tree after stage-runtime.mjs installs production node_modules with
 * --ignore-scripts (Approach A from research #68).
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rebuild } from "@electron/rebuild";

const require = createRequire(import.meta.url);
const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const stageRoot = join(desktopRoot, "resources", "slashcash");

const nativeModules = ["better-sqlite3", "keytar"];

if (!existsSync(join(stageRoot, "package.json"))) {
  throw new Error(
    `Missing staged runtime at ${stageRoot}. Run stage:runtime first.`,
  );
}

for (const name of nativeModules) {
  if (!existsSync(join(stageRoot, "node_modules", name))) {
    throw new Error(
      `Staged runtime is missing ${name}. Re-run stage:runtime so npm install populates node_modules.`,
    );
  }
}

const electronPackageJson = require.resolve("electron/package.json", {
  paths: [desktopRoot],
});
const electronVersion = require(electronPackageJson).version;

console.log(
  `Rebuilding ${nativeModules.join(", ")} for Electron ${electronVersion} in ${stageRoot}`,
);

await rebuild({
  buildPath: stageRoot,
  electronVersion,
  force: true,
  onlyModules: nativeModules,
});

console.log("Electron ABI rebuild complete.");
