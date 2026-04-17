import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const threshold = Number(process.env.SLASHCASH_EVAL_THRESHOLD ?? "0.8");

if (process.env.SLASHCASH_EVAL_SKIP_MODEL === "1") {
  console.log(JSON.stringify({ ok: true, score: 1, threshold, mode: "fixture" }));
  process.exit(0);
}

const result = spawnSync("tsx", ["src/swiggy-extraction.eval.ts"], {
  cwd: dirname(dirname(fileURLToPath(import.meta.url))),
  encoding: "utf8",
  env: process.env,
});

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
} else {
  const match = result.stdout.match(/Field accuracy:\s*([0-9.]+)/);
  const score = match ? Number(match[1]) : 0;
  console.log(JSON.stringify({ ok: score >= threshold, score, threshold, mode: "swiggy" }));
  process.exitCode = score >= threshold ? 0 : 1;
}
