export type PythonEnvErrorCode =
  | "python-missing"
  | "python-too-old"
  | "venv-create-failed"
  | "pip-install-failed"
  | "extractor-import-failed"
  | "unknown";

export type PythonEnvError = {
  code: PythonEnvErrorCode;
  message: string;
  symptom: string;
  cause: string;
  fix: string;
};

export function pythonEnvError(
  code: PythonEnvErrorCode,
  details: Omit<PythonEnvError, "code">,
): PythonEnvError {
  return {
    code,
    ...details,
  };
}
