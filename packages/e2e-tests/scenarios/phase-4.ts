import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

run(["architecture-smells"]);
run(["fixtures:check"]);
run(["--filter", "slashcash", "test"]);
run(["--filter", "@workspace/tasks", "test"]);
run(["--filter", "@workspace/database", "test"]);

console.log("Phase 4 E2E passed.");

function run(args: string[]) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
}
