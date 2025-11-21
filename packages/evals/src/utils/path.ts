// Utility helpers for resolving paths within the evals package without relying on
// ESM-specific globals like import.meta, so that the code works in both ESM and CJS
// environments (e.g., when bundled by the Braintrust CLI).
import { existsSync, readFileSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";

let cachedRoot: string | null = null;

function detectScriptDir(): string {
  const scriptPath = process.argv[1];

  if (!scriptPath) {
    return process.cwd();
  }

  if (isAbsolute(scriptPath)) {
    return dirname(scriptPath);
  }

  return dirname(resolve(process.cwd(), scriptPath));
}

function looksLikeEvalsPackage(dir: string): boolean {
  const pkgJsonPath = resolve(dir, "package.json");

  if (!existsSync(pkgJsonPath)) {
    return false;
  }

  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    return pkgJson?.name === "@workspace/evals";
  } catch {
    return false;
  }
}

export function getEvalsRoot(): string {
  if (cachedRoot) {
    return cachedRoot;
  }

  const scriptDir = detectScriptDir();

  const candidates = [
    process.env.EVALS_ROOT,
    scriptDir,
    resolve(scriptDir, ".."),
    process.cwd(),
    resolve(process.cwd(), "packages/evals"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (looksLikeEvalsPackage(candidate)) {
      cachedRoot = resolve(candidate);
      return cachedRoot;
    }
  }

  cachedRoot = process.cwd();
  return cachedRoot;
}

export function resolveEvalsPath(...segments: string[]): string {
  return resolve(getEvalsRoot(), ...segments);
}
