import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(cliRoot, "dist", "app");
const budgetBytes = Number(process.env.SLASHCASH_BUNDLE_BUDGET_BYTES || 350 * 1024 * 1024);

const serverCandidates = [
  join(appRoot, "apps", "main", "server.js"),
  join(appRoot, "server.js"),
];

if (!serverCandidates.some((candidate) => existsSync(candidate))) {
  throw new Error("Bundled app server.js is missing. Run `pnpm pack:local` first.");
}

const shippedFiles = [...walk(appRoot)];
const totalBytes = shippedFiles.reduce((sum, file) => sum + statSync(file).size, 0);
if (totalBytes > budgetBytes) {
  throw new Error(`Bundle is ${totalBytes} bytes, above budget ${budgetBytes} bytes.`);
}

const forbidden = shippedFiles.filter((file) => {
  const name = file.slice(appRoot.length + 1);
  return (
    /(^|\/)\.env/.test(name) ||
    /(^|\/)\.turbo(\/|$)/.test(name) ||
    /(^|\/)\.next\/cache(\/|$)/.test(name) ||
    /(^|\/)(test|tests|fixtures|test-fixtures)(\/|$)/.test(name) ||
    /\.(?:d\.ts|ts|tsx|map)$/.test(name)
  );
});

if (forbidden.length > 0) {
  throw new Error(`Bundle contains forbidden files:\n${forbidden.join("\n")}`);
}

console.log(`Bundle verified: ${shippedFiles.length} files, ${totalBytes} bytes.`);

function* walk(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}
