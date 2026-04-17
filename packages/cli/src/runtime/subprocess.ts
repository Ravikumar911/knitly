import { spawn, spawnSync } from "node:child_process";

export type CommandResult =
  | { ok: true; stdout: string; stderr: string; code: 0 }
  | { ok: false; stdout: string; stderr: string; code: number | null; error?: unknown };

export function commandExists(command: string): boolean {
  const result = spawnSync("sh", ["-c", 'command -v "$1"', "sh", command], {
    encoding: "utf8",
  });
  return result.status === 0;
}

export function runCommand(command: string, args: string[], options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
} = {}): CommandResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 30_000,
  });

  if (result.status === 0) {
    return {
      ok: true,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      code: 0,
    };
  }

  return {
    ok: false,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status,
    error: result.error,
  };
}

export function runInteractive(command: string, args: string[], options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
} = {}) {
  return new Promise<number>((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: "inherit",
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
}
