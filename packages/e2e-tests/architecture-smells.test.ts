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

const forbiddenPackages = [
  "@supabase/ssr",
  "@supabase/supabase-js",
  "@trigger.dev/sdk",
  "@trigger.dev/build",
  "@vercel/analytics",
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
    }
    if (rel.endsWith("package.json")) {
      collectPackageJsonSmells(file, rel, smells);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) continue;
    collectImportSmells(file, rel, smells);
    collectEnvSmells(file, rel, smells);
    if (rel.startsWith("packages/database/src/")) {
      collectDbSmells(file, rel, smells);
    }
  }

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
      if (forbiddenPackages.includes(specifier)) {
        smells.push({
          category: "forbidden-package",
          file: rel,
          line: lineOf(file, specifier),
          kind: section,
          specifier,
          reason: "Removed cloud/provider dependency must not be reintroduced.",
        });
      }
    }
  }
}

function collectPackageTextSmells(file: string, rel: string, smells: Smell[]) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md)$/.test(rel)) return;

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

function collectImportSmells(file: string, rel: string, smells: Smell[]) {
  const source = readFileSync(file, "utf8");
  const importPattern =
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? "";
    if (
      forbiddenPackages.includes(specifier) ||
      forbiddenPackages.some((pkg) => specifier.startsWith(`${pkg}/`))
    ) {
      smells.push({
        category: "forbidden-import",
        file: rel,
        line: lineOfOffset(source, match.index ?? 0),
        kind: "import",
        specifier,
        reason: "Removed cloud/provider import must not be reintroduced.",
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
