import type { SlashcashPaths } from "../config/paths.js";
import type { SlashcashConfig } from "../config/schema.js";
import { ensurePythonEnvReady } from "../python/env.js";
import type { DoctorCheck } from "./checks.js";

export async function runPythonEnvCheck(input: {
  config: SlashcashConfig;
  paths: SlashcashPaths;
  fix?: boolean;
}): Promise<DoctorCheck> {
  const started = Date.now();

  if (
    process.env.SLASHCASH_DOCTOR_SKIP_PYTHON === "1" ||
    process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED === "1" ||
    input.config.pdfExtractor.enabled === false
  ) {
    return {
      id: "python-env",
      name: "Python env",
      label: "Python env",
      category: "binary",
      status: "ok",
      message:
        process.env.SLASHCASH_DOCTOR_SKIP_PYTHON === "1"
          ? "Skipped by environment"
          : "PDF extractor disabled",
      durationMs: Date.now() - started,
      fix: "Unset the skip/disabled override to validate the Python lane.",
    };
  }

  const result = await ensurePythonEnvReady(input);
  if (result.ok) {
    return {
      id: "python-env",
      name: "Python env",
      label: "Python env",
      category: "binary",
      status: "ok",
      message: result.runtime.pythonBin,
      durationMs: Date.now() - started,
      fix: "Run `slashcash doctor --fix` to reprovision the managed Python environment.",
    };
  }

  return {
    id: "python-env",
    name: "Python env",
    label: "Python env",
    category: "binary",
    status: "fail",
    message: result.error.symptom,
    durationMs: Date.now() - started,
    fix: result.error.fix,
  };
}
