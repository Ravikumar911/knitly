import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPlaywrightEnv,
  mockOllamaBaseUrl,
  playwrightHome,
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
    ["--filter", "slashcash", "dev", "--", "db", "reset", "--yes", "--seed"],
    "seed deterministic local data",
  );
  provisionPythonExtractorEnv();
  run(
    ["--filter", "slashcash", "dev", "--", "sync", "--full"],
    "import the fixture Gmail receipt",
  );
}

const BOOTSTRAP_PYTHON = ["python3.12", "python3.13", "python3.11", "python3"];

function provisionPythonExtractorEnv() {
  const bootstrapPython = BOOTSTRAP_PYTHON.find((candidate) => {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    return probe.status === 0;
  });
  if (!bootstrapPython) {
    throw new Error(
      "Failed to provision the Python extractor: no Python 3.11+ interpreter found on PATH.",
    );
  }

  const venvDir = join(playwrightHome, "py-venv");
  const venvPython = join(venvDir, "bin", "python");
  const extractorDir = join(repoRoot, "packages", "pdf-extractor");
  const requirementsPath = join(extractorDir, "requirements.txt");

  rmSync(venvDir, { recursive: true, force: true });
  mkdirSync(playwrightHome, { recursive: true });

  const createVenv = spawnSync(
    bootstrapPython,
    ["-m", "venv", venvDir],
    { encoding: "utf8" },
  );
  if (createVenv.status !== 0) {
    throw new Error(
      [
        "Failed to provision the Python extractor: could not create a virtualenv.",
        `Command: ${bootstrapPython} -m venv ${venvDir}`,
        `stdout:\n${createVenv.stdout}`,
        `stderr:\n${createVenv.stderr}`,
      ].join("\n\n"),
    );
  }

  const installDeps = spawnSync(
    venvPython,
    ["-m", "pip", "install", "-r", requirementsPath],
    { cwd: extractorDir, encoding: "utf8", timeout: 10 * 60_000 },
  );
  if (installDeps.status !== 0) {
    throw new Error(
      [
        "Failed to provision the Python extractor: pip install failed.",
        `Command: ${venvPython} -m pip install -r ${requirementsPath}`,
        `stdout:\n${installDeps.stdout}`,
        `stderr:\n${installDeps.stderr}`,
      ].join("\n\n"),
    );
  }

  const selfCheck = spawnSync(
    venvPython,
    ["-m", "slashcash_pdf_extractor", "--self-check"],
    { cwd: extractorDir, encoding: "utf8", timeout: 30_000 },
  );
  if (selfCheck.status !== 0) {
    throw new Error(
      [
        "Failed to provision the Python extractor: self-check failed.",
        `stdout:\n${selfCheck.stdout}`,
        `stderr:\n${selfCheck.stderr}`,
      ].join("\n\n"),
    );
  }

  writeFileSync(join(venvDir, ".slashcash.install-hash"), "playwright-e2e\n");
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
