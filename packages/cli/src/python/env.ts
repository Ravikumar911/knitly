import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SlashcashPaths } from "../config/paths.js";
import type { SlashcashConfig } from "../config/schema.js";
import { commandExists, runCommand } from "../runtime/subprocess.js";
import { pythonEnvError, type PythonEnvError } from "./errors.js";

export type PythonExtractorRuntime = {
  pythonBin: string;
  venvDir: string;
  packageDir: string;
  requirementsPath: string;
  installHashPath: string;
  usesManagedVenv: boolean;
};

export async function ensurePythonEnvReady(input: {
  config: SlashcashConfig;
  paths: SlashcashPaths;
  fix?: boolean;
}): Promise<
  | { ok: true; runtime: PythonExtractorRuntime }
  | { ok: false; error: PythonEnvError }
> {
  const runtime = resolvePythonRuntime(input);
  const pythonVersion = verifyPythonVersion(runtime.pythonBin);
  if (!pythonVersion.ok) {
    if (!runtime.usesManagedVenv || !input.fix) {
      return { ok: false, error: pythonVersion.error };
    }

    const bootstrapPython = resolveBootstrapPython();
    if (!bootstrapPython.ok) {
      return { ok: false, error: bootstrapPython.error };
    }

    const created = runCommand(
      bootstrapPython.pythonBin,
      ["-m", "venv", runtime.venvDir],
      { timeoutMs: 60_000 },
    );
    if (!created.ok) {
      return {
        ok: false,
        error: pythonEnvError("venv-create-failed", {
          message:
            created.stderr || created.stdout || "python venv creation failed.",
          symptom: "The managed Python virtualenv could not be created.",
          cause:
            "The system Python is missing venv support or the target directory is not writable.",
          fix: "Install Python 3.11+ with venv support and rerun `slashcash doctor --fix`.",
        }),
      };
    }
  }

  if (
    runtime.usesManagedVenv &&
    input.fix &&
    shouldInstallRequirements(runtime)
  ) {
    const installed = runCommand(
      runtime.pythonBin,
      ["-m", "pip", "install", "-r", runtime.requirementsPath],
      {
        cwd: runtime.packageDir,
        timeoutMs: 10 * 60_000,
      },
    );
    if (!installed.ok) {
      return {
        ok: false,
        error: pythonEnvError("pip-install-failed", {
          message:
            installed.stderr || installed.stdout || "pip install failed.",
          symptom: "The PDF extractor dependencies could not be installed.",
          cause:
            "The managed virtualenv exists, but pip could not install the pinned requirements.",
          fix: "Check the pip error output and rerun `slashcash doctor --fix`.",
        }),
      };
    }
    writeFileSync(
      runtime.installHashPath,
      requirementsHash(runtime.requirementsPath),
    );
  }

  const selfCheck = runCommand(
    runtime.pythonBin,
    ["-m", "slashcash_pdf_extractor", "--self-check"],
    {
      cwd: runtime.packageDir,
      timeoutMs: 30_000,
    },
  );
  if (!selfCheck.ok) {
    return {
      ok: false,
      error: pythonEnvError("extractor-import-failed", {
        message:
          selfCheck.stderr || selfCheck.stdout || "python self-check failed.",
        symptom: "The Python extractor module is not importable.",
        cause:
          "The configured interpreter cannot import `slashcash_pdf_extractor` and its runtime dependencies.",
        fix: runtime.usesManagedVenv
          ? "Run `slashcash doctor --fix` to reprovision the managed Python environment."
          : "Install the extractor package into the configured interpreter, or clear the override and rerun `slashcash doctor --fix`.",
      }),
    };
  }

  return { ok: true, runtime };
}

export function resolvePythonRuntime(input: {
  config: SlashcashConfig;
  paths: SlashcashPaths;
}): PythonExtractorRuntime {
  const packageDir = resolvePdfExtractorPackageDir();
  const configuredPython =
    process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON ||
    input.config.pdfExtractor.pythonBin ||
    defaultManagedPython(input.paths);

  return {
    pythonBin: configuredPython,
    venvDir: input.paths.pyVenv,
    packageDir,
    requirementsPath: join(packageDir, "requirements.txt"),
    installHashPath: input.paths.pyInstallHash,
    usesManagedVenv:
      configuredPython === defaultManagedPython(input.paths) &&
      !process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON &&
      !input.config.pdfExtractor.pythonBin,
  };
}

export function defaultManagedPython(paths: SlashcashPaths) {
  return join(paths.pyVenv, "bin", "python");
}

function resolveBootstrapPython():
  | { ok: true; pythonBin: string }
  | { ok: false; error: PythonEnvError } {
  const pythonBin = commandExists("python3")
    ? "python3"
    : commandExists("python")
      ? "python"
      : null;

  if (!pythonBin) {
    return {
      ok: false,
      error: pythonEnvError("python-missing", {
        message: "python3 was not found on PATH.",
        symptom: "Python 3.11+ is not installed.",
        cause:
          "slashcash needs a local Python interpreter to run the PDF extractor.",
        fix: "Install Python 3.11+ (for example `brew install python@3.12`) and rerun `slashcash doctor --fix`.",
      }),
    };
  }

  const version = verifyPythonVersion(pythonBin);
  if (!version.ok) {
    return { ok: false, error: version.error };
  }

  return { ok: true, pythonBin };
}

function verifyPythonVersion(
  pythonBin: string,
): { ok: true } | { ok: false; error: PythonEnvError } {
  const result = runCommand(pythonBin, ["--version"], { timeoutMs: 15_000 });
  if (!result.ok) {
    return {
      ok: false,
      error: pythonEnvError("python-missing", {
        message:
          result.stderr || result.stdout || `${pythonBin} is not executable.`,
        symptom: "The configured Python interpreter is missing.",
        cause:
          "The PDF extractor points at a Python binary that does not exist or cannot start.",
        fix: "Set `pdfExtractor.pythonBin` to a working Python 3.11+ interpreter, or rerun `slashcash doctor --fix` to use the managed venv.",
      }),
    };
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const versionMatch = output.match(/Python\s+(\d+)\.(\d+)\.(\d+)/i);
  if (!versionMatch) {
    return {
      ok: false,
      error: pythonEnvError("unknown", {
        message: output.trim() || "Could not parse python version output.",
        symptom:
          "The configured Python interpreter did not report a usable version string.",
        cause: "The interpreter output was unexpected.",
        fix: "Point `pdfExtractor.pythonBin` at a standard Python 3.11+ executable.",
      }),
    };
  }

  const major = Number(versionMatch[1]);
  const minor = Number(versionMatch[2]);
  if (major < 3 || (major === 3 && minor < 11)) {
    return {
      ok: false,
      error: pythonEnvError("python-too-old", {
        message: output.trim(),
        symptom: "Python 3.11+ is required for the PDF extractor.",
        cause: "The configured interpreter is too old.",
        fix: "Install Python 3.11+ and rerun `slashcash doctor --fix`.",
      }),
    };
  }

  return { ok: true };
}

function shouldInstallRequirements(runtime: PythonExtractorRuntime) {
  if (!existsSync(runtime.pythonBin)) return true;
  if (!existsSync(runtime.installHashPath)) return true;
  return (
    readFileSync(runtime.installHashPath, "utf8") !==
    requirementsHash(runtime.requirementsPath)
  );
}

function requirementsHash(requirementsPath: string) {
  return createHash("sha256")
    .update(readFileSync(requirementsPath))
    .digest("hex");
}

function resolvePdfExtractorPackageDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  if (here.includes(`${sep}dist${sep}`)) {
    const packaged = join(here, "..", "app", "packages", "pdf-extractor");
    if (existsSync(join(packaged, "pyproject.toml"))) {
      return packaged;
    }
  }

  const workspace = join(here, "..", "..", "..", "pdf-extractor");
  if (existsSync(join(workspace, "pyproject.toml"))) {
    return workspace;
  }

  throw new Error(
    "packages/pdf-extractor was not found in the workspace or bundled app.",
  );
}
