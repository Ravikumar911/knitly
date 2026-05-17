import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const result = spawnSync("tsx", ["src/hello.eval.ts"], {
  cwd: dirname(dirname(fileURLToPath(import.meta.url))),
  encoding: "utf8",
  env: process.env,
});

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);

const ok = result.status === 0;
console.log(JSON.stringify({ ok, mode: "assistant-placeholder" }));
process.exitCode = ok ? 0 : (result.status ?? 1);
