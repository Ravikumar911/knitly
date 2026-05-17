import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const passthrough = process.argv.slice(2);

function run(command, args) {
  const child = spawn(command, args, {
    cwd: cliRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    process.exit(code ?? 0);
  });
}

if (passthrough.length === 0) {
  run("tsc", ["--watch", "--preserveWatchOutput"]);
} else {
  run("tsx", ["src/entry.ts", ...passthrough]);
}
