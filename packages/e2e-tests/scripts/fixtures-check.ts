import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureRoots = [
  "packages/database/test-fixtures",
  "packages/tasks/test-fixtures",
  "packages/e2e-tests/fixtures",
];

const jsonFiles = fixtureRoots.flatMap((root) => walkJsonFiles(join(repoRoot, root)));
const failures: string[] = [];

for (const file of jsonFiles) {
  const raw = readFileSync(file, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    failures.push(`${relative(repoRoot, file)} is not valid JSON: ${formatError(error)}`);
    continue;
  }

  const canonical = `${JSON.stringify(parsed, null, 2)}\n`;
  if (raw !== canonical) {
    failures.push(`${relative(repoRoot, file)} is not canonical JSON; run pnpm fixtures:check after formatting the fixture`);
  }
}

if (failures.length > 0) {
  throw new Error(`Fixture check failed:\n${failures.join("\n")}`);
}

console.log(`Fixture check passed (${jsonFiles.length} JSON fixtures).`);

function walkJsonFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return walkJsonFiles(path);
    return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
  });
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
