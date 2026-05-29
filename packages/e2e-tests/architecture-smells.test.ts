import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

type Smell = {
  category: string;
  file: string;
  line: number;
  kind: string;
  specifier: string;
  reason: string;
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const vercelAnalyticsPackage = "@vercel/analytics";

const forbiddenPackages = [
  "@supabase/ssr",
  "@supabase/supabase-js",
  "@trigger.dev/sdk",
  "@trigger.dev/build",
  "@ai-sdk/openai",
  "@ai-sdk/anthropic",
  "@ai-sdk/mistral",
  "pg",
  "postgres",
];

const forbiddenDirs = [
  "apps/main/app/(auth)",
  "apps/main/app/auth",
  "apps/main/supabase",
];

const forbiddenFiles = ["packages/tasks/trigger.config.ts"];
const pythonSpawnAllowList = new Set([
  "packages/tasks/src/extract/pdf-extractor.ts",
  "packages/cli/src/python/env.ts",
]);
const tasksLlmImportAllowList = new Set([
  "packages/tasks/src/extract/llm-model.ts",
  "packages/tasks/src/extract/swiggy-llm.ts",
]);
const forbiddenStringAllowList = new Set([
  "packages/cli/src/privacy/copy.ts",
  "packages/cli/src/privacy/copy.test.ts",
]);

const forbiddenDbReferences = [
  "user_google_tokens",
  "token_access_logs",
  "auth.users",
  "auth.",
  "pg-core",
  "jsonb",
  "ilike",
  "doublePrecision",
  "pgSchema",
];

const forbiddenEnvReferences = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TRIGGER_SECRET_KEY",
  "GOOGLE_CLIENT_SECRET",
  "BRAINTRUST_API_KEY",
  "VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "MODEL_NAME",
];

const forbiddenPackageStrings = [
  ["gw", "s"].join(""),
  ["gcl", "oud"].join(""),
  ["google", "cloud", "sdk"].join("-"),
  ["googleworkspace", "cli"].join("-"),
];

const forbiddenLegacyStrings = [
  "slashAIV2",
  "transactionsEnhanced",
  "OCRModel",
  "ATTACHMENT HANDLING",
  "swiggy.sources.v1",
];

const ignoredSegments = new Set([
  ".git",
  ".next",
  ".turbo",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export async function collectArchitectureSmells(): Promise<Smell[]> {
  const smells: Smell[] = [];

  for (const dir of forbiddenDirs) {
    if (existsSync(join(repoRoot, dir))) {
      smells.push({
        category: "forbidden-directory",
        file: dir,
        line: 1,
        kind: "exists",
        specifier: dir,
        reason: "Cloud-era route or service directory must not be present.",
      });
    }
  }

  for (const file of forbiddenFiles) {
    if (existsSync(join(repoRoot, file))) {
      smells.push({
        category: "forbidden-file",
        file,
        line: 1,
        kind: "exists",
        specifier: file,
        reason:
          "Trigger.dev config must not be present in the local-first build.",
      });
    }
  }

  for (const file of walk(repoRoot)) {
    const rel = relative(repoRoot, file);
    if (rel === "pnpm-lock.yaml") continue;
    if (rel === "packages/e2e-tests/architecture-smells.test.ts") continue;
    if (rel.startsWith("packages/")) {
      collectPackageTextSmells(file, rel, smells);
      collectLegacyTextSmells(file, rel, smells);
    }
    if (
      rel === "packages/pdf-extractor/requirements.txt" ||
      rel === "packages/pdf-extractor/requirements-dev.txt"
    ) {
      collectPinnedRequirementsSmells(file, rel, smells);
    }
    if (rel.endsWith("package.json")) {
      collectPackageJsonSmells(file, rel, smells);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) continue;
    collectImportSmells(file, rel, smells);
    collectEnvSmells(file, rel, smells);
    collectPythonSpawnSmells(file, rel, smells);
    if (rel.startsWith("packages/database/src/")) {
      collectDbSmells(file, rel, smells);
    }
  }

  collectSchemaParitySmells(smells);

  return [...smells].sort(
    (left: Smell, right: Smell) =>
      left.category.localeCompare(right.category) ||
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.kind.localeCompare(right.kind) ||
      left.specifier.localeCompare(right.specifier),
  );
}

export async function main(argv = process.argv.slice(2)) {
  const smells = await collectArchitectureSmells();
  if (argv.includes("--json")) {
    console.log(JSON.stringify(smells, null, 2));
  } else if (smells.length === 0) {
    console.log("No architecture smells found.");
  } else {
    for (const smell of smells) {
      console.error(
        `${smell.file}:${smell.line} ${smell.category} ${smell.specifier} - ${smell.reason}`,
      );
    }
  }
  return smells.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((code) => {
    process.exitCode = code;
  });
}

function isVercelAnalyticsAllowed(rel: string) {
  return rel.startsWith("apps/website/");
}

function isForbiddenPackage(specifier: string, rel: string) {
  if (
    specifier === vercelAnalyticsPackage ||
    specifier.startsWith(`${vercelAnalyticsPackage}/`)
  ) {
    return !isVercelAnalyticsAllowed(rel);
  }
  return (
    forbiddenPackages.includes(specifier) ||
    forbiddenPackages.some((pkg) => specifier.startsWith(`${pkg}/`))
  );
}

function collectPackageJsonSmells(file: string, rel: string, smells: Smell[]) {
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  const sections = [
    ["dependencies", raw.dependencies ?? {}],
    ["devDependencies", raw.devDependencies ?? {}],
    ["optionalDependencies", raw.optionalDependencies ?? {}],
  ] as const;

  for (const [section, deps] of sections) {
    for (const specifier of Object.keys(deps)) {
      if (isForbiddenPackage(specifier, rel)) {
        smells.push({
          category: "forbidden-package",
          file: rel,
          line: lineOf(file, specifier),
          kind: section,
          specifier,
          reason:
            specifier === vercelAnalyticsPackage ||
            specifier.startsWith(`${vercelAnalyticsPackage}/`)
              ? "@vercel/analytics is only allowed in apps/website (marketing site)."
              : "Removed cloud/provider dependency must not be reintroduced.",
        });
      }
    }
  }
}

function collectPackageTextSmells(file: string, rel: string, smells: Smell[]) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md)$/.test(rel)) return;
  if (forbiddenStringAllowList.has(rel)) return;

  const source = readFileSync(file, "utf8");
  for (const specifier of forbiddenPackageStrings) {
    let index = source.indexOf(specifier);
    while (index >= 0) {
      smells.push({
        category: "forbidden-string",
        file: rel,
        line: lineOfOffset(source, index),
        kind: "text",
        specifier,
        reason:
          "Retired Google mailbox tooling must not reappear outside packages/docs.",
      });
      index = source.indexOf(specifier, index + specifier.length);
    }
  }
}

function collectLegacyTextSmells(file: string, rel: string, smells: Smell[]) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md)$/.test(rel)) return;
  if (
    rel === "packages/e2e-tests/architecture-smells.test.ts" ||
    rel.startsWith("packages/docs/")
  ) {
    return;
  }

  const source = readFileSync(file, "utf8");
  for (const specifier of forbiddenLegacyStrings) {
    let index = source.indexOf(specifier);
    while (index >= 0) {
      smells.push({
        category: "forbidden-legacy-string",
        file: rel,
        line: lineOfOffset(source, index),
        kind: "text",
        specifier,
        reason:
          "Retired AI-ingest and enhanced-transaction labels must not appear in shipping code.",
      });
      index = source.indexOf(specifier, index + specifier.length);
    }
  }
}

function collectImportSmells(file: string, rel: string, smells: Smell[]) {
  const source = readFileSync(file, "utf8");
  const importPattern =
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? "";
    if (
      rel.startsWith("packages/tasks/src/") &&
      !tasksLlmImportAllowList.has(rel) &&
      (specifier === "ai" ||
        specifier.startsWith("@ai-sdk/") ||
        specifier === "../ai/model" ||
        specifier.endsWith("/ai/model"))
    ) {
      smells.push({
        category: "forbidden-import",
        file: rel,
        line: lineOfOffset(source, match.index ?? 0),
        kind: "import",
        specifier,
        reason:
          "packages/tasks must stay deterministic and cannot import chat-model providers.",
      });
    }
    if (isForbiddenPackage(specifier, rel)) {
      smells.push({
        category: "forbidden-import",
        file: rel,
        line: lineOfOffset(source, match.index ?? 0),
        kind: "import",
        specifier,
        reason:
          specifier === vercelAnalyticsPackage ||
          specifier.startsWith(`${vercelAnalyticsPackage}/`)
            ? "@vercel/analytics is only allowed in apps/website (marketing site)."
            : "Removed cloud/provider import must not be reintroduced.",
      });
    }
  }
}

function collectDbSmells(file: string, rel: string, smells: Smell[]) {
  const source = readFileSync(file, "utf8");
  for (const specifier of forbiddenDbReferences) {
    let index = source.indexOf(specifier);
    while (index >= 0) {
      smells.push({
        category: "forbidden-db-reference",
        file: rel,
        line: lineOfOffset(source, index),
        kind: "db-reference",
        specifier,
        reason:
          "Postgres/auth-token references do not belong in SQLite local-first code.",
      });
      index = source.indexOf(specifier, index + specifier.length);
    }
  }
}

function collectEnvSmells(file: string, rel: string, smells: Smell[]) {
  const source = readFileSync(file, "utf8");
  for (const specifier of forbiddenEnvReferences) {
    let index = source.indexOf(specifier);
    while (index >= 0) {
      smells.push({
        category: "forbidden-env-reference",
        file: rel,
        line: lineOfOffset(source, index),
        kind: "env-reference",
        specifier,
        reason:
          "Hosted-era environment variable must not be read by shipping code.",
      });
      index = source.indexOf(specifier, index + specifier.length);
    }
  }
}

function collectPythonSpawnSmells(file: string, rel: string, smells: Smell[]) {
  if (pythonSpawnAllowList.has(rel)) return;

  const source = readFileSync(file, "utf8");
  const spawnPattern = /spawn(?:Sync)?\(\s*["']python(?:3)?["']/g;
  for (const match of source.matchAll(spawnPattern)) {
    smells.push({
      category: "forbidden-python-spawn",
      file: rel,
      line: lineOfOffset(source, match.index ?? 0),
      kind: "spawn",
      specifier: match[0],
      reason:
        "Python subprocesses should be isolated to the extractor wrapper.",
    });
  }
}

function collectSchemaParitySmells(smells: Smell[]) {
  const script = join(
    repoRoot,
    "packages",
    "pdf-extractor",
    "scripts",
    "emit_ts_schema.py",
  );
  const schema = join(
    repoRoot,
    "packages",
    "tasks",
    "src",
    "extract",
    "pdf-extractor-schema.ts",
  );
  const generated = spawnSync("python3", [script], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (generated.status !== 0) {
    smells.push({
      category: "schema-parity",
      file: "packages/pdf-extractor/scripts/emit_ts_schema.py",
      line: 1,
      kind: "generator",
      specifier: "python3",
      reason: generated.stderr || generated.stdout || "schema generator failed",
    });
    return;
  }

  if (readFileSync(schema, "utf8") !== generated.stdout) {
    smells.push({
      category: "schema-parity",
      file: "packages/tasks/src/extract/pdf-extractor-schema.ts",
      line: 1,
      kind: "schema",
      specifier: "pdf-extractor-schema.ts",
      reason:
        "The committed Zod schema does not match the Python schema generator output.",
    });
  }
}

function collectPinnedRequirementsSmells(
  file: string,
  rel: string,
  smells: Smell[],
) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-e ")) {
      return;
    }
    if (!trimmed.includes("==")) {
      smells.push({
        category: "unpinned-python-requirement",
        file: rel,
        line: index + 1,
        kind: "requirement",
        specifier: trimmed,
        reason:
          "The PDF extractor requirements must pin exact versions with `==`.",
      });
    }
  });
}

function* walk(root: string): Generator<string> {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    const rel = relative(repoRoot, path);
    if (shouldIgnore(rel)) continue;
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && statSync(path).size < 2_000_000) {
      yield path;
    }
  }
}

function shouldIgnore(rel: string) {
  if (rel === "packages/docs" || rel.startsWith("packages/docs/")) return true;
  return rel.split(/[\\/]/).some((segment) => ignoredSegments.has(segment));
}

function lineOf(file: string, text: string) {
  const source = readFileSync(file, "utf8");
  return lineOfOffset(source, source.indexOf(text));
}

function lineOfOffset(source: string, offset: number) {
  return source.slice(0, Math.max(0, offset)).split(/\r?\n/).length;
}
