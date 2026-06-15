import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  installBundledSkills: vi.fn(),
  listInstalledSkills: vi.fn(),
  setSkillEnabled: vi.fn(),
}));

vi.mock("../../skills/registry.js", () => ({
  installBundledSkills: mocks.installBundledSkills,
  listInstalledSkills: mocks.listInstalledSkills,
  setSkillEnabled: mocks.setSkillEnabled,
}));

describe("skills command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("prints a helpful message when no skills are installed", async () => {
    mocks.listInstalledSkills.mockReturnValue([]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./skills.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["skills", "list"], { from: "user" });

    expect(mocks.installBundledSkills).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith("No skills installed.");
  });

  it("lists installed skills and toggles them on demand", async () => {
    mocks.listInstalledSkills.mockReturnValue([
      {
        id: "gmail-swiggy",
        enabled: true,
        manifest: {
          version: "1.0.0",
          description: "Sync supported receipts from Gmail",
        },
      },
      {
        id: "alpha-skill",
        enabled: false,
        manifest: {
          version: "0.2.0",
          description: "Custom local automation",
        },
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./skills.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["skills", "list"], { from: "user" });
    await program.parseAsync(["skills", "enable", "gmail-swiggy"], {
      from: "user",
    });
    await program.parseAsync(["skills", "disable", "alpha-skill"], {
      from: "user",
    });

    expect(logSpy.mock.calls[0]?.[0]).toContain(
      "gmail-swiggy 1.0.0 Sync supported receipts from Gmail",
    );
    expect(logSpy.mock.calls[1]?.[0]).toContain(
      "alpha-skill 0.2.0 Custom local automation",
    );
    expect(mocks.setSkillEnabled).toHaveBeenNthCalledWith(
      1,
      "gmail-swiggy",
      true,
    );
    expect(mocks.setSkillEnabled).toHaveBeenNthCalledWith(
      2,
      "alpha-skill",
      false,
    );
    expect(logSpy).toHaveBeenCalledWith("Enabled gmail-swiggy.");
    expect(logSpy).toHaveBeenCalledWith("Disabled alpha-skill.");
  });
});
