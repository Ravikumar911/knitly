import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import {
  createPlaywrightEnv,
  mockOllamaBaseUrl,
  playwrightStateRoot,
  repoRoot,
} from "./playwright-env";

export default async function globalSetup() {
  rmSync(playwrightStateRoot, { recursive: true, force: true });
  mkdirSync(playwrightStateRoot, { recursive: true });

  run(
    [
      "--filter",
      "slashcash",
      "dev",
      "--",
      "config",
      "set",
      "ai.ollamaBaseUrl",
      mockOllamaBaseUrl,
    ],
    "configure the local assistant base URL",
  );
  run(
    [
      "--filter",
      "slashcash",
      "dev",
      "--",
      "config",
      "set",
      "ai.chatModel",
      "gemma4:latest",
    ],
    "configure the local assistant model",
  );
  run(
    [
      "--filter",
      "slashcash",
      "dev",
      "--",
      "config",
      "set",
      "ai.visionModel",
      "gemma4:latest",
    ],
    "configure the local vision model",
  );
  run(
    ["--filter", "slashcash", "dev", "--", "db", "reset", "--yes"],
    "seed deterministic local data",
  );
  run(
    ["--filter", "slashcash", "dev", "--", "sync", "--full"],
    "import the fixture Gmail receipt",
  );
}

function run(args: string[], step: string) {
  const result = spawnSync("pnpm", args, {
    cwd: repoRoot,
    env: createPlaywrightEnv(),
    encoding: "utf8",
  });

  if (result.status === 0) {
    return;
  }

  throw new Error(
    [
      `Failed to ${step}.`,
      `Command: pnpm ${args.join(" ")}`,
      `stdout:\n${result.stdout}`,
      `stderr:\n${result.stderr}`,
    ].join("\n\n"),
  );
}
