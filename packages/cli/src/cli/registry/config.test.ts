import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfigValue: vi.fn(),
  loadConfig: vi.fn(),
  setConfigValue: vi.fn(),
  resolvePaths: vi.fn(),
}));

vi.mock("../../config/load.js", () => ({
  getConfigValue: mocks.getConfigValue,
  loadConfig: mocks.loadConfig,
  setConfigValue: mocks.setConfigValue,
}));

vi.mock("../../config/paths.js", () => ({
  resolvePaths: mocks.resolvePaths,
}));

describe("config command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.resolvePaths.mockReturnValue({
      config: "/tmp/slashcash/config.json",
    });
  });

  it("prints the config path", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./config.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["config", "path"], { from: "user" });

    expect(logSpy).toHaveBeenCalledWith("/tmp/slashcash/config.json");
  });

  it("prints scalar and object config values", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.getConfigValue.mockReturnValue("tiny-local");
    mocks.loadConfig.mockReturnValue({ updates: { checkOnVersion: true } });

    const { register } = await import("./config.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["config", "get", "ai.chatModel"], { from: "user" });
    await program.parseAsync(["config", "get"], { from: "user" });

    expect(logSpy).toHaveBeenNthCalledWith(1, "tiny-local");
    expect(logSpy).toHaveBeenNthCalledWith(2, JSON.stringify({ updates: { checkOnVersion: true } }, null, 2));
  });

  it("persists config changes", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./config.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["config", "set", "server.port", "4242"], { from: "user" });

    expect(mocks.setConfigValue).toHaveBeenCalledWith("server.port", "4242");
    expect(logSpy).toHaveBeenCalledWith("Set server.port");
  });
});
