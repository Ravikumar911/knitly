import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SlashcashPaths } from "../config/paths.js";
import type { SlashcashConfig } from "../config/schema.js";
import { commandExists, runCommand } from "../runtime/subprocess.js";
import { pythonEnvError, type PythonEnvError } from "./errors.js";

const PREFERRED_HOMEBREW_PYTHON_FORMULA = "python@3.12";
const PREFERRED_HOMEBREW_PYTHON_BIN = "python3.12";
const MANAGED_PYTHON_MIN_MINOR = 11;
const MANAGED_PYTHON_MAX_MINOR = 13;
const BOOTSTRAP_PYTHON_COMMANDS = [
  "python3.13",
  "python3.12",
  "python3.11",
  "python3",
];

export type PythonExtractorRuntime = {
  pythonBin: string;
  venvDir: string;
  packageDir: string;
  requirementsPath: string;
  installHashPath: string;
  usesManagedVenv: boolean;
};

type PythonVersion = {
  major: number;
  minor: number;
  patch: number;
  raw: string;
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
  const managedPythonUnsupported =
    pythonVersion.ok &&
    runtime.usesManagedVenv &&
    !isSupportedManagedPythonVersion(pythonVersion.version);

  if (!pythonVersion.ok || managedPythonUnsupported) {
    if (!runtime.usesManagedVenv || !input.fix) {
      return {
        ok: false,
        error: pythonVersion.ok
          ? unsupportedManagedPythonError(pythonVersion.version)
          : pythonVersion.error,
      };
    }

    const created = recreateManagedVenv(runtime);
    if (!created.ok) return created;
  } else if (
    runtime.usesManagedVenv &&
    input.fix &&
    !pythonHasPip(runtime.pythonBin)
  ) {
    const created = recreateManagedVenv(runtime);
    if (!created.ok) return created;
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

export function resolveBootstrapPython(
  options: { installWithHomebrew?: boolean } = {},
): { ok: true; pythonBin: string } | { ok: false; error: PythonEnvError } {
  const existing = findHealthyBootstrapPython();
  if (existing.ok) return existing;

  if (options.installWithHomebrew) {
    const installed = ensureHomebrewPython();
    if (!installed.ok) return installed;

    const homebrewPython = preferredHomebrewPythonBin();
    const checked = checkBootstrapPython(homebrewPython);
    if (checked.ok) return { ok: true, pythonBin: homebrewPython };

    return checked;
  }

  return existing;
}

function recreateManagedVenv(
  runtime: PythonExtractorRuntime,
): { ok: true } | { ok: false; error: PythonEnvError } {
  const bootstrapPython = resolveBootstrapPython({ installWithHomebrew: true });
  if (!bootstrapPython.ok) {
    return { ok: false, error: bootstrapPython.error };
  }

  rmSync(runtime.venvDir, { recursive: true, force: true });
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
          "No installed Python could create a pip-enabled virtualenv for slash.cash.",
        fix: `Run \`brew reinstall ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
      }),
    };
  }

  if (!pythonHasPip(runtime.pythonBin)) {
    return {
      ok: false,
      error: pythonEnvError("venv-create-failed", {
        message: `${runtime.pythonBin} cannot run pip after venv creation.`,
        symptom: "The managed Python virtualenv was created without pip.",
        cause:
          "The selected Python installation has broken ensurepip or venv support.",
        fix: `Run \`brew reinstall ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
      }),
    };
  }

  return { ok: true };
}

function verifyPythonVersion(
  pythonBin: string,
): { ok: true; version: PythonVersion } | { ok: false; error: PythonEnvError } {
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
  const patch = Number(versionMatch[3]);
  if (major < 3 || (major === 3 && minor < MANAGED_PYTHON_MIN_MINOR)) {
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

  return {
    ok: true,
    version: {
      major,
      minor,
      patch,
      raw: output.trim(),
    },
  };
}

function findHealthyBootstrapPython():
  | { ok: true; pythonBin: string }
  | { ok: false; error: PythonEnvError } {
  for (const pythonBin of BOOTSTRAP_PYTHON_COMMANDS) {
    const checked = checkBootstrapPython(pythonBin);
    if (checked.ok) return { ok: true, pythonBin };
  }

  for (const pythonBin of homebrewPythonCandidates()) {
    const checked = checkBootstrapPython(pythonBin);
    if (checked.ok) return { ok: true, pythonBin };
  }

  return {
    ok: false,
    error: pythonEnvError("python-missing", {
      message: "No healthy Python 3.11-3.13 interpreter was found.",
      symptom: "Python 3.11-3.13 with working venv support is required.",
      cause:
        "slash.cash needs a local Python interpreter to install the PDF extractor into its managed virtualenv.",
      fix: `Run \`brew install ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
    }),
  };
}

function checkBootstrapPython(
  pythonBin: string,
): { ok: true } | { ok: false; error: PythonEnvError } {
  if (!isExecutableCandidate(pythonBin)) {
    return {
      ok: false,
      error: pythonEnvError("python-missing", {
        message: `${pythonBin} was not found.`,
        symptom: "Python 3.11-3.13 is not installed.",
        cause:
          "slash.cash could not find a stable Python interpreter for the PDF extractor.",
        fix: `Run \`brew install ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
      }),
    };
  }

  const version = verifyPythonVersion(pythonBin);
  if (!version.ok) return { ok: false, error: version.error };

  if (!isSupportedManagedPythonVersion(version.version)) {
    return {
      ok: false,
      error: unsupportedManagedPythonError(version.version),
    };
  }

  return verifyCanCreatePipVenv(pythonBin);
}

function verifyCanCreatePipVenv(
  pythonBin: string,
): { ok: true } | { ok: false; error: PythonEnvError } {
  const testVenvDir = mkdtempSync(join(tmpdir(), "slashcash-python-check-"));
  try {
    const created = runCommand(pythonBin, ["-m", "venv", testVenvDir], {
      timeoutMs: 60_000,
    });
    if (!created.ok) {
      return {
        ok: false,
        error: pythonEnvError("venv-create-failed", {
          message:
            created.stderr || created.stdout || "python venv creation failed.",
          symptom: "Python could not create a virtualenv.",
          cause:
            "The interpreter is installed, but its venv/ensurepip support is broken.",
          fix: `Run \`brew reinstall ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
        }),
      };
    }

    const venvPython = join(testVenvDir, "bin", "python");
    return pythonHasPip(venvPython)
      ? { ok: true }
      : {
          ok: false,
          error: pythonEnvError("venv-create-failed", {
            message: `${venvPython} cannot run pip after venv creation.`,
            symptom: "Python created a virtualenv without pip.",
            cause:
              "The interpreter has broken ensurepip support, so dependencies cannot be installed.",
            fix: `Run \`brew reinstall ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
          }),
        };
  } finally {
    rmSync(testVenvDir, { recursive: true, force: true });
  }
}

function pythonHasPip(pythonBin: string) {
  return runCommand(pythonBin, ["-m", "pip", "--version"], {
    timeoutMs: 15_000,
  }).ok;
}

function ensureHomebrewPython():
  | { ok: true }
  | { ok: false; error: PythonEnvError } {
  if (!commandExists("brew")) {
    return {
      ok: false,
      error: pythonEnvError("python-missing", {
        message: "Homebrew was not found on PATH.",
        symptom: "A stable Python could not be installed automatically.",
        cause:
          "slash.cash uses Homebrew to install a stable Python for the managed PDF extractor environment.",
        fix: `Install Homebrew, then run \`brew install ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\` and \`slashcash doctor --fix\`.`,
      }),
    };
  }

  const installed = runCommand(
    "brew",
    ["list", "--formula", PREFERRED_HOMEBREW_PYTHON_FORMULA],
    { timeoutMs: 30_000 },
  );
  const repaired = installed.ok
    ? runCommand("brew", ["upgrade", PREFERRED_HOMEBREW_PYTHON_FORMULA], {
        timeoutMs: 10 * 60_000,
      })
    : runCommand("brew", ["install", PREFERRED_HOMEBREW_PYTHON_FORMULA], {
        timeoutMs: 10 * 60_000,
      });

  if (repaired.ok) return { ok: true };

  if (installed.ok) {
    const reinstalled = runCommand(
      "brew",
      ["reinstall", PREFERRED_HOMEBREW_PYTHON_FORMULA],
      { timeoutMs: 10 * 60_000 },
    );
    if (reinstalled.ok) return { ok: true };
  }

  return {
    ok: false,
    error: pythonEnvError("python-missing", {
      message: repaired.stderr || repaired.stdout || "brew install failed.",
      symptom: "Homebrew could not install a stable Python.",
      cause:
        "The automatic Python repair failed before the PDF extractor dependencies could be installed.",
      fix: `Run \`brew install ${PREFERRED_HOMEBREW_PYTHON_FORMULA}\`, then rerun \`slashcash doctor --fix\`.`,
    }),
  };
}

function homebrewPythonCandidates() {
  return Array.from(
    new Set([
      preferredHomebrewPythonBin(),
      join(
        "/opt/homebrew/opt",
        PREFERRED_HOMEBREW_PYTHON_FORMULA,
        "bin",
        PREFERRED_HOMEBREW_PYTHON_BIN,
      ),
      join(
        "/usr/local/opt",
        PREFERRED_HOMEBREW_PYTHON_FORMULA,
        "bin",
        PREFERRED_HOMEBREW_PYTHON_BIN,
      ),
    ]),
  );
}

function preferredHomebrewPythonBin() {
  if (!commandExists("brew")) return PREFERRED_HOMEBREW_PYTHON_BIN;

  const prefix = runCommand(
    "brew",
    ["--prefix", PREFERRED_HOMEBREW_PYTHON_FORMULA],
    { timeoutMs: 30_000 },
  );
  const prefixPath = prefix.ok ? prefix.stdout.trim() : "";
  return prefixPath
    ? join(prefixPath, "bin", PREFERRED_HOMEBREW_PYTHON_BIN)
    : PREFERRED_HOMEBREW_PYTHON_BIN;
}

function isExecutableCandidate(pythonBin: string) {
  return pythonBin.includes(sep)
    ? existsSync(pythonBin)
    : commandExists(pythonBin);
}

function isSupportedManagedPythonVersion(version: PythonVersion) {
  return (
    version.major === 3 &&
    version.minor >= MANAGED_PYTHON_MIN_MINOR &&
    version.minor <= MANAGED_PYTHON_MAX_MINOR
  );
}

function unsupportedManagedPythonError(version: PythonVersion) {
  return pythonEnvError("python-too-new", {
    message: version.raw,
    symptom: "The managed PDF extractor Python version is not supported yet.",
    cause:
      "slash.cash uses Python 3.11-3.13 for the managed PDF extractor environment because newer interpreters can lag dependency wheel and ensurepip support.",
    fix: `Run \`slashcash doctor --fix\` to rebuild the managed venv with ${PREFERRED_HOMEBREW_PYTHON_FORMULA}.`,
  });
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
