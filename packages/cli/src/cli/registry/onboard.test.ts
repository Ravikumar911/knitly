import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runOnboard: vi.fn(),
}));

vi.mock("../../onboard/run.js", () => ({
  runOnboard: mocks.runOnboard,
}));

describe("onboard command", () => {
  const previousE2E = process.env.SLASHCASH_E2E;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (previousE2E === undefined) {
      delete process.env.SLASHCASH_E2E;
    } else {
      process.env.SLASHCASH_E2E = previousE2E;
    }
  });

  it("hides internal auth-skipping flags outside E2E mode", async () => {
    delete process.env.SLASHCASH_E2E;
    const { register } = await import("./onboard.js");
    const program = new Command();
    register(program);

    const command = program.commands[0]!;
    expect(command.options.find((option) => option.long === "--skip-external")?.hidden).toBe(true);
    expect(command.options.find((option) => option.long === "--skip-auth")?.hidden).toBe(true);
  });

  it("forwards parsed options to the onboard runner", async () => {
    process.env.SLASHCASH_E2E = "1";
    const { register } = await import("./onboard.js");
    const program = new Command();
    register(program);

    const command = program.commands[0]!;
    expect(command.options.find((option) => option.long === "--skip-external")?.hidden).toBe(false);
    expect(command.options.find((option) => option.long === "--skip-auth")?.hidden).toBe(false);

    await program.parseAsync(
      ["onboard", "--yes", "--non-interactive", "--dry-run", "--skip-external", "--skip-auth"],
      { from: "user" },
    );

    expect(mocks.runOnboard).toHaveBeenCalledWith({
      yes: true,
      nonInteractive: true,
      dryRun: true,
      skipExternal: true,
      skipAuth: true,
    });
  });
});
