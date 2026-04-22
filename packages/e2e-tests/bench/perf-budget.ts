import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const budgets = {
  versionMs: Number(process.env.SLASHCASH_BENCH_VERSION_MS ?? 1000),
  doctorQuickMs: Number(process.env.SLASHCASH_BENCH_DOCTOR_QUICK_MS ?? 3000),
};

const version = measure("slashcash --version", () =>
  run(["--filter", "slashcash", "dev", "--", "--version"]),
);
const doctorHome = mkdtempSync(join(tmpdir(), "slashcash-bench-"));
const doctor = measure("slashcash doctor --quick", () =>
  run(["--filter", "slashcash", "dev", "--", "doctor", "--fix", "--quick"], {
    SLASHCASH_HOME: doctorHome,
    SQLITE_DB_PATH: join(doctorHome, "db.sqlite"),
    SLASHCASH_DOCTOR_SKIP_GWS: "1",
    SLASHCASH_DOCTOR_SKIP_OLLAMA: "1",
  }),
);
rmSync(doctorHome, { recursive: true, force: true });

assertBudget("version", version, budgets.versionMs);
assertBudget("doctorQuick", doctor, budgets.doctorQuickMs);
console.log(JSON.stringify({ ok: true, version, doctor, budgets }, null, 2));

function measure(label: string, fn: () => void) {
  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;
  console.log(`${label}: ${elapsed.toFixed(0)}ms`);
  return elapsed;
}

function run(args: string[], extraEnv: Record<string, string> = {}) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
}

function assertBudget(name: string, actual: number, budget: number) {
  if (actual > budget) {
    throw new Error(`${name} took ${actual.toFixed(0)}ms, above budget ${budget}ms`);
  }
}
