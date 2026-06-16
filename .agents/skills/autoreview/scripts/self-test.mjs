#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const autoreviewScript = join(scriptDir, "autoreview.mjs");
const tempRoot = mkdtempSync(join(tmpdir(), "slashcash-autoreview-self-test-"));

try {
  setupFixtureRepo(tempRoot);

  const dirtyBodyFallback = join(
    tempRoot,
    "packages/tasks/src/extract/body-fallback.ts",
  );
  writeFileSync(
    dirtyBodyFallback,
    [
      "export function fallbackSwiggy() {",
      "  return { amount: 999, orderId: 'deliberate-change' };",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  const dirtyRun = runAutoreview(tempRoot);
  assert(
    dirtyRun.status === 1,
    `dirty body-fallback run should exit 1, got ${dirtyRun.status}`,
  );
  assert(
    dirtyRun.stdout.includes(
      "Swiggy body fallback changed; verify sibling extraction paths",
    ) ||
      latestReport(tempRoot).findings.some((finding) =>
        finding.title.includes("Swiggy body fallback changed"),
      ),
    "dirty run should surface body-fallback finding",
  );
  const dirtyReport = latestReport(tempRoot);
  assert(
    dirtyReport.ingest.siblingScans.some((scan) =>
      scan.siblings.some(
        (sibling) =>
          sibling.file_path ===
          "packages/tasks/src/extract/swiggy-body-signals.ts",
      ),
    ),
    "dirty run should note swiggy-body-signals sibling",
  );

  writeFileSync(
    dirtyBodyFallback,
    ["export function fallbackSwiggy() {", "  return null;", "}", ""].join(
      "\n",
    ),
    "utf8",
  );

  const cleanRun = runAutoreview(tempRoot);
  assert(
    cleanRun.status === 0,
    `clean run should exit 0, got ${cleanRun.status}`,
  );
  assert(
    latestReport(tempRoot).status === "clean",
    "clean report should be clean",
  );

  console.log(`autoreview self-test passed in ${tempRoot}`);
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
}

function setupFixtureRepo(repoRoot) {
  const files = {
    "package.json": JSON.stringify({ name: "autoreview-self-test" }, null, 2),
    "packages/tasks/src/extract/pipeline.ts":
      "export function extractTransactionFromEmail() { return null; }\n",
    "packages/tasks/src/extract/body-fallback.ts":
      "export function fallbackSwiggy() {\n  return null;\n}\n",
    "packages/tasks/src/extract/swiggy-body-signals.ts":
      "export function extractSwiggyBodySignals() { return {}; }\n",
    "packages/tasks/src/extract/swiggy-llm.ts":
      "export const schemaUsed = 'swiggy.llm.v1';\n",
    "packages/tasks/src/extract/pdf-extractor.ts":
      "export const dataSource = 'PDF_ATTACHMENT';\n",
    "packages/tasks/src/extract/pdf-extractor-schema.ts":
      "export const sourceQuality = 'text';\n",
    "packages/tasks/src/extract/swiggy-deterministic.ts":
      "export const provenance = null;\n",
    "packages/tasks/src/merchants/swiggy/schema.ts":
      "export const SwiggyMerchant = {};\n",
    "packages/tasks/src/extract/body-fallback.test.ts":
      "describe('fallbackSwiggy', () => {});\n",
    "packages/tasks/src/extract/swiggy-body-signals.test.ts":
      "describe('extractSwiggyBodySignals', () => {});\n",
    "packages/tasks/src/extract/pipeline.test.ts":
      "describe('pipeline', () => {});\n",
    "packages/tasks/src/extract/pipeline.integration.test.ts":
      "describe('pipeline integration', () => {});\n",
    "packages/e2e-tests/fixtures/imap/swiggy-body-only.eml":
      "Message-ID: <self-test@example.com>\n\nBody\n",
    "packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json":
      JSON.stringify({ schemaUsed: "swiggy.body.v1" }, null, 2) + "\n",
    "packages/e2e-tests/scripts/fixtures-check.ts": "console.log('ok');\n",
  };

  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(repoRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, "utf8");
  }

  git(repoRoot, ["init"]);
  git(repoRoot, ["config", "user.email", "autoreview@example.invalid"]);
  git(repoRoot, ["config", "user.name", "Autoreview Self Test"]);
  git(repoRoot, ["add", "."]);
  git(repoRoot, ["commit", "-m", "initial fixture"]);
}

function runAutoreview(repoRoot) {
  return spawnSync(
    process.execPath,
    [
      autoreviewScript,
      "--repo-root",
      repoRoot,
      "--no-gates",
      "--heartbeat-ms",
      "1000",
    ],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
}

function latestReport(repoRoot) {
  const reportDir = join(repoRoot, ".agents/skills/autoreview/reports");
  const latest = readdirSync(reportDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .at(-1);
  assert(latest, "expected a JSON report");
  return JSON.parse(readFileSync(resolve(reportDir, latest), "utf8"));
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert(
    result.status === 0,
    `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
