import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  commandExists: vi.fn(),
  existsSync: vi.fn(),
  runCommand: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  existsSync: mocks.existsSync,
}));

vi.mock("../runtime/subprocess.js", () => ({
  commandExists: mocks.commandExists,
  runCommand: mocks.runCommand,
}));

const ok = (stdout = "") => ({
  ok: true as const,
  stdout,
  stderr: "",
  code: 0 as const,
});

const fail = (stderr = "") => ({
  ok: false as const,
  stdout: "",
  stderr,
  code: 1,
});

describe("python env bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.existsSync.mockReturnValue(false);
  });

  it("uses an already healthy stable Python before touching Homebrew", async () => {
    mocks.commandExists.mockImplementation((command: string) =>
      ["python3.12", "brew"].includes(command),
    );
    mocks.runCommand.mockImplementation((command: string, args: string[]) => {
      if (command === "brew") return ok("/opt/homebrew/opt/python@3.12\n");
      if (command === "python3.12" && args[0] === "--version") {
        return ok("Python 3.12.11\n");
      }
      if (command === "python3.12" && args[0] === "-m" && args[1] === "venv") {
        return ok();
      }
      if (
        command.endsWith("/bin/python") &&
        args.join(" ") === "-m pip --version"
      ) {
        return ok("pip 25.0\n");
      }
      return fail(`unexpected command: ${command} ${args.join(" ")}`);
    });

    const { resolveBootstrapPython } = await import("./env.js");
    const result = resolveBootstrapPython({ installWithHomebrew: true });

    expect(result).toEqual({ ok: true, pythonBin: "python3.12" });
    expect(mocks.runCommand).not.toHaveBeenCalledWith(
      "brew",
      ["install", "python@3.12"],
      expect.anything(),
    );
  });

  it("installs Homebrew Python when python3 is too new for the managed venv", async () => {
    let brewPythonInstalled = false;
    const brewPythonBin = "/opt/homebrew/opt/python@3.12/bin/python3.12";

    mocks.commandExists.mockImplementation((command: string) =>
      ["python3", "brew"].includes(command),
    );
    mocks.existsSync.mockImplementation(
      (path) => brewPythonInstalled && String(path) === brewPythonBin,
    );
    mocks.runCommand.mockImplementation((command: string, args: string[]) => {
      if (command === "python3" && args[0] === "--version") {
        return ok("Python 3.14.4\n");
      }
      if (command === "brew" && args.join(" ") === "--prefix python@3.12") {
        return brewPythonInstalled
          ? ok("/opt/homebrew/opt/python@3.12\n")
          : fail();
      }
      if (
        command === "brew" &&
        args.join(" ") === "list --formula python@3.12"
      ) {
        return fail();
      }
      if (command === "brew" && args.join(" ") === "install python@3.12") {
        brewPythonInstalled = true;
        return ok();
      }
      if (command === brewPythonBin && args[0] === "--version") {
        return ok("Python 3.12.11\n");
      }
      if (command === brewPythonBin && args[0] === "-m" && args[1] === "venv") {
        return ok();
      }
      if (
        command.endsWith("/bin/python") &&
        args.join(" ") === "-m pip --version"
      ) {
        return ok("pip 25.0\n");
      }
      return fail(`unexpected command: ${command} ${args.join(" ")}`);
    });

    const { resolveBootstrapPython } = await import("./env.js");
    const result = resolveBootstrapPython({ installWithHomebrew: true });

    expect(result).toEqual({ ok: true, pythonBin: brewPythonBin });
    expect(mocks.runCommand).toHaveBeenCalledWith(
      "brew",
      ["install", "python@3.12"],
      expect.anything(),
    );
  });

  it("upgrades an installed Homebrew Python formula when no healthy candidate remains", async () => {
    let upgraded = false;
    const brewPythonBin = "/opt/homebrew/opt/python@3.12/bin/python3.12";

    mocks.commandExists.mockImplementation((command: string) =>
      ["brew"].includes(command),
    );
    mocks.existsSync.mockImplementation(
      (path) => String(path) === brewPythonBin,
    );
    mocks.runCommand.mockImplementation((command: string, args: string[]) => {
      if (command === "brew" && args.join(" ") === "--prefix python@3.12") {
        return ok("/opt/homebrew/opt/python@3.12\n");
      }
      if (
        command === "brew" &&
        args.join(" ") === "list --formula python@3.12"
      ) {
        return ok("python@3.12\n");
      }
      if (command === "brew" && args.join(" ") === "upgrade python@3.12") {
        upgraded = true;
        return ok();
      }
      if (command === brewPythonBin && args[0] === "--version") {
        return ok("Python 3.12.11\n");
      }
      if (command === brewPythonBin && args[0] === "-m" && args[1] === "venv") {
        return upgraded ? ok() : fail("ensurepip failed");
      }
      if (
        command.endsWith("/bin/python") &&
        args.join(" ") === "-m pip --version"
      ) {
        return ok("pip 25.0\n");
      }
      return fail(`unexpected command: ${command} ${args.join(" ")}`);
    });

    const { resolveBootstrapPython } = await import("./env.js");
    const result = resolveBootstrapPython({ installWithHomebrew: true });

    expect(result).toEqual({ ok: true, pythonBin: brewPythonBin });
    expect(mocks.runCommand).toHaveBeenCalledWith(
      "brew",
      ["upgrade", "python@3.12"],
      expect.anything(),
    );
  });

  it("reports a stale managed extractor before running an old self-check", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-env-test-"));
    const pyVenv = join(home, "py-venv");
    const pythonBin = join(pyVenv, "bin", "python");
    const pyInstallHash = join(pyVenv, ".slashcash.install-hash");
    mkdirSync(pyVenv, { recursive: true });
    writeFileSync(pyInstallHash, "stale");

    mocks.existsSync.mockImplementation((path) => {
      const value = String(path);
      return (
        value === pythonBin ||
        value === pyInstallHash ||
        value.includes(`${sep}packages${sep}pdf-extractor${sep}`)
      );
    });
    mocks.runCommand.mockImplementation((command: string, args: string[]) => {
      if (command === pythonBin && args[0] === "--version") {
        return ok("Python 3.12.11\n");
      }
      return fail(`unexpected command: ${command} ${args.join(" ")}`);
    });

    try {
      const { defaultConfig } = await import("../config/schema.js");
      const { ensurePythonEnvReady } = await import("./env.js");
      const result = await ensurePythonEnvReady({
        config: defaultConfig,
        paths: {
          home,
          config: join(home, "config.json"),
          credentials: join(home, "credentials.json"),
          db: join(home, "db.sqlite"),
          attachments: join(home, "attachments"),
          cache: join(home, "cache"),
          logs: join(home, "logs"),
          skills: join(home, "skills"),
          pyVenv,
          pyInstallHash,
          pidDir: join(home, "pid"),
          pidFile: join(home, "pid", "slashcash.pid.json"),
        },
        fix: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("extractor-stale");
      }
      expect(mocks.runCommand).not.toHaveBeenCalledWith(
        pythonBin,
        ["-m", "slashcash_pdf_extractor", "--self-check"],
        expect.anything(),
      );
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
