import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repairPhase1State: vi.fn(),
  runDoctor: vi.fn(),
}));

vi.mock("../../doctor/repairs.js", () => ({
  repairPhase1State: mocks.repairPhase1State,
}));

vi.mock("../../doctor/run.js", () => ({
  runDoctor: mocks.runDoctor,
}));

describe("doctor command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects the unsupported --fix and --json combination", async () => {
    const { register } = await import("./doctor.js");
    const program = new Command();
    register(program);

    await expect(
      program.parseAsync(["doctor", "--fix", "--json"], { from: "user" }),
    ).rejects.toMatchObject({
      name: "CliError",
      block: expect.objectContaining({
        area: "config",
      }),
    });
    expect(mocks.repairPhase1State).not.toHaveBeenCalled();
    expect(mocks.runDoctor).not.toHaveBeenCalled();
  });

  it("runs repairs before the doctor pipeline when --fix is enabled", async () => {
    const { register } = await import("./doctor.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["doctor", "--fix", "--quick"], { from: "user" });

    expect(mocks.repairPhase1State).toHaveBeenCalledOnce();
    expect(mocks.runDoctor).toHaveBeenCalledWith({ fix: true, quick: true });
  });
});
