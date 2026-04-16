import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

function readPackageVersion() {
  const here = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
    version?: string;
  };
  return packageJson.version || "0.0.0";
}

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
if (args.includes("--version") || args[0] === "version") {
  console.log(readPackageVersion());
  process.exit(0);
}

const { runCli } = await import("./cli/run.js");
await runCli(args, { version: readPackageVersion() });
