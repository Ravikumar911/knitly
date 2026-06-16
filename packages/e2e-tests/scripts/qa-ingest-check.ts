import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const failures: string[] = [];

const scenarioFiles = [
  "qa/README.md",
  "qa/scenarios.md",
  "qa/scenarios/index.md",
  "qa/scenarios/ingest/food-delivery-edges.md",
  "qa/scenarios/ingest/replays/pdf-vs-body.jsonl",
];

for (const file of scenarioFiles) {
  if (!existsSync(join(repoRoot, file))) {
    failures.push(`${file} is missing`);
  }
}

const pack = readText("qa/scenarios.md");
const index = readText("qa/scenarios/index.md");
const edges = readText("qa/scenarios/ingest/food-delivery-edges.md");
const replay = readText("qa/scenarios/ingest/replays/pdf-vs-body.jsonl");

const expectedEdges = [
  "swiggy-order-with-pdf",
  "swiggy-instamart-with-pdf",
  "swiggy-body-only",
  "swiggy-promotion",
  "swiggy-status-update",
  "swiggy-malformed-pdf",
  "swiggy-duplicate-order",
  "swiggy-scanned-pdf",
  "swiggy-encrypted-pdf",
];

for (const edge of expectedEdges) {
  requireText(pack, edge, "qa/scenarios.md");
  requireText(index, edge, "qa/scenarios/index.md");
  requireText(edges, edge, "qa/scenarios/ingest/food-delivery-edges.md");
}

const committedFixtures = [
  "swiggy-order-with-pdf",
  "swiggy-body-only",
  "swiggy-promotion",
  "swiggy-status-update",
];

for (const fixture of committedFixtures) {
  const eml = `packages/e2e-tests/fixtures/imap/${fixture}.eml`;
  const expected = `packages/e2e-tests/fixtures/imap/${fixture}.expected.json`;
  if (!existsSync(join(repoRoot, eml))) failures.push(`${eml} is missing`);
  if (!existsSync(join(repoRoot, expected))) {
    failures.push(`${expected} is missing`);
  }
}

const detailedContracts = ["swiggy-duplicate-order", "swiggy-scanned-pdf"];
for (const edge of detailedContracts) {
  const indexText = index.toLowerCase();
  if (
    !edges.includes(edge) ||
    !index.includes(edge) ||
    !indexText.includes("detailed qa contract")
  ) {
    failures.push(`${edge} must remain documented as a detailed qa contract`);
  }
}

const gapContracts = [
  "swiggy-instamart-with-pdf",
  "swiggy-malformed-pdf",
  "swiggy-encrypted-pdf",
];
for (const edge of gapContracts) {
  if (!pack.includes(`${edge}`) || !pack.includes("gap")) {
    failures.push(`${edge} must remain visible as an open scenario gap`);
  }
}

const replayLines = replay
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

if (replayLines.length < 5) {
  failures.push(
    "qa/scenarios/ingest/replays/pdf-vs-body.jsonl must contain the shipped decision-path replays",
  );
}

for (const [index, line] of replayLines.entries()) {
  try {
    JSON.parse(line);
  } catch (error) {
    failures.push(
      `qa/scenarios/ingest/replays/pdf-vs-body.jsonl:${index + 1} is not valid JSON: ${formatError(error)}`,
    );
  }
}

requireText(edges, "schemaUsed", "qa/scenarios/ingest/food-delivery-edges.md");
requireText(edges, "dataSource", "qa/scenarios/ingest/food-delivery-edges.md");
requireText(edges, "provenance", "qa/scenarios/ingest/food-delivery-edges.md");
requireText(edges, "reads-before-writes", "qa/scenarios/ingest/food-delivery-edges.md");
requireText(
  edges,
  "packages/e2e-tests/scripts/real-behavior-proof.ts",
  "qa/scenarios/ingest/food-delivery-edges.md",
);

if (failures.length > 0) {
  throw new Error(`Ingest QA scenario check failed:\n${failures.join("\n")}`);
}

console.log(
  `Ingest QA scenario check passed (${expectedEdges.length} edges, ${committedFixtures.length} committed fixtures, ${replayLines.length} replay rows).`,
);

function readText(file: string) {
  const path = join(repoRoot, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function requireText(haystack: string, needle: string, file: string) {
  if (!haystack.includes(needle)) {
    failures.push(`${file} must mention ${needle}`);
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
