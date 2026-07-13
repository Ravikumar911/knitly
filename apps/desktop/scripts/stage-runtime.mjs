/**
 * Stage the slashcash publish-layout tree into apps/desktop/resources/slashcash
 * for electron-builder extraResources.
 *
 * Layout matches the npm package `files` list (bin/, dist/, bundled-skills/) plus
 * package.json, with a top-level entry.js wrapper so main.ts can resolve
 * process.resourcesPath/slashcash/entry.js while the real CLI stays at dist/entry.js.
 *
 * Production node_modules are installed with npm (classic tree, no pnpm store
 * symlinks) so the packaged .app is self-contained. Workspace @workspace/*
 * deps are stripped — packaged resolvers load database/tasks from dist/app.
 *
 * Prerequisites: `slashcash` build + `bundle:app` (dist/entry.js + dist/app).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(desktopRoot, "..", "..");
const cliRoot = join(repoRoot, "packages", "cli");
const stageRoot = join(desktopRoot, "resources", "slashcash");

const requiredCliPaths = [
  join(cliRoot, "dist", "entry.js"),
  join(cliRoot, "bin", "slashcash.mjs"),
  join(cliRoot, "bundled-skills"),
];

const serverCandidates = [
  join(cliRoot, "dist", "app", "apps", "main", "server.js"),
  join(cliRoot, "dist", "app", "server.js"),
];

for (const required of requiredCliPaths) {
  if (!existsSync(required)) {
    throw new Error(
      `Missing ${required}. Run slashcash build + bundle:app before staging.`,
    );
  }
}

if (!serverCandidates.some((candidate) => existsSync(candidate))) {
  throw new Error(
    "Missing bundled Next standalone server.js under packages/cli/dist/app. Run bundle:app first.",
  );
}

const cliPackage = JSON.parse(
  readFileSync(join(cliRoot, "package.json"), "utf8"),
);

rmSync(stageRoot, { recursive: true, force: true });
mkdirSync(stageRoot, { recursive: true });

copyPublishLayout();
writeStagePackageJson();
writeTopLevelEntrypoint();
installProductionDependencies();
// CLI statically imports @workspace/tasks (and tasks needs @workspace/database).
// Vendor built workspace packages after npm install so they are not pruned.
vendorWorkspacePackage("tasks");
vendorWorkspacePackage("database");
writeStageReadme();
assertStageReady();

console.log(`Staged slashcash runtime at ${stageRoot}`);

function copyPublishLayout() {
  const entries = ["bin", "dist", "bundled-skills"];
  for (const entry of entries) {
    const source = join(cliRoot, entry);
    if (!existsSync(source)) {
      throw new Error(`CLI publish layout missing ${entry}/`);
    }
    cpSync(source, join(stageRoot, entry), { recursive: true });
  }

  const cliReadme = join(cliRoot, "README.md");
  if (existsSync(cliReadme)) {
    cpSync(cliReadme, join(stageRoot, "README.cli.md"));
  }
}

function writeStagePackageJson() {
  const staged = structuredClone(cliPackage);
  staged.private = true;
  delete staged.publishConfig;
  delete staged.devDependencies;
  delete staged.scripts;

  staged.dependencies = Object.fromEntries(
    Object.entries(staged.dependencies ?? {}).filter(
      ([name, version]) =>
        !name.startsWith("@workspace/") &&
        typeof version === "string" &&
        !version.startsWith("workspace:"),
    ),
  );

  writeFileSync(
    join(stageRoot, "package.json"),
    `${JSON.stringify(staged, null, 2)}\n`,
  );
}

function writeTopLevelEntrypoint() {
  // Thin wrapper: main.ts looks for resources/slashcash/entry.js; CLI code lives in dist/.
  writeFileSync(
    join(stageRoot, "entry.js"),
    `#!/usr/bin/env node
await import("./dist/entry.js");
`,
  );
}

function installProductionDependencies() {
  const npm = process.env.SLASHCASH_STAGE_NPM || "npm";
  const result = spawnSync(
    npm,
    ["install", "--omit=dev", "--ignore-scripts"],
    {
      cwd: stageRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_fund: "false",
        npm_config_package_lock: "false",
      },
      shell: process.platform === "win32",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `npm install in staged runtime failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

function vendorWorkspacePackage(name) {
  const sourceRoot = join(repoRoot, "packages", name);
  const sourceDist = join(sourceRoot, "dist");
  const sourcePackageJson = join(sourceRoot, "package.json");
  const targetRoot = join(stageRoot, "node_modules", "@workspace", name);

  if (!existsSync(sourceDist) || !existsSync(sourcePackageJson)) {
    throw new Error(
      `Missing built @workspace/${name}. Run pnpm --filter @workspace/${name} build first.`,
    );
  }

  rmSync(targetRoot, { recursive: true, force: true });
  mkdirSync(targetRoot, { recursive: true });
  cpSync(sourcePackageJson, join(targetRoot, "package.json"));
  cpSync(sourceDist, join(targetRoot, "dist"), { recursive: true });
}

function writeStageReadme() {
  writeFileSync(
    join(stageRoot, "README.md"),
    `# Staged slashcash runtime (extraResources)

electron-builder copies this directory to \`Contents/Resources/slashcash/\` inside the \`.app\`.

Populate with \`pnpm --filter @knitly/desktop stage:runtime\` (or the full \`pnpm desktop:pack\` pipeline). Staging copies the CLI publish layout (\`bin/\`, \`dist/\`, \`bundled-skills/\`), writes top-level \`entry.js\` → \`dist/entry.js\`, installs production deps, then \`rebuild:natives\` rebuilds \`better-sqlite3\` / \`keytar\` for the Electron ABI.
`,
  );
}

function assertStageReady() {
  const required = [
    join(stageRoot, "entry.js"),
    join(stageRoot, "dist", "entry.js"),
    join(stageRoot, "bin", "slashcash.mjs"),
    join(stageRoot, "package.json"),
    join(stageRoot, "node_modules", "better-sqlite3"),
    join(stageRoot, "node_modules", "keytar"),
    join(stageRoot, "node_modules", "@workspace", "tasks", "package.json"),
    join(stageRoot, "node_modules", "@workspace", "database", "package.json"),
  ];

  for (const path of required) {
    if (!existsSync(path)) {
      throw new Error(`Stage incomplete: missing ${path}`);
    }
  }

  if (
    !existsSync(join(stageRoot, "dist", "app", "apps", "main", "server.js")) &&
    !existsSync(join(stageRoot, "dist", "app", "server.js"))
  ) {
    throw new Error("Stage incomplete: missing bundled Next server.js");
  }
}
