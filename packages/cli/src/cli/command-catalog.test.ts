import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  status: vi.fn(),
  doctor: vi.fn(),
  reset: vi.fn(),
  config: vi.fn(),
  db: vi.fn(),
  privacy: vi.fn(),
  sync: vi.fn(),
  skills: vi.fn(),
  logs: vi.fn(),
}));

vi.mock("./registry/start.js", () => ({ register: mocks.start }));
vi.mock("./registry/stop.js", () => ({ register: mocks.stop }));
vi.mock("./registry/status.js", () => ({ register: mocks.status }));
vi.mock("./registry/doctor.js", () => ({ register: mocks.doctor }));
vi.mock("./registry/reset.js", () => ({ register: mocks.reset }));
vi.mock("./registry/config.js", () => ({ register: mocks.config }));
vi.mock("./registry/db.js", () => ({ register: mocks.db }));
vi.mock("./registry/privacy.js", () => ({ register: mocks.privacy }));
vi.mock("./registry/sync.js", () => ({ register: mocks.sync }));
vi.mock("./registry/skills.js", () => ({ register: mocks.skills }));
vi.mock("./registry/logs.js", () => ({ register: mocks.logs }));

describe("command catalog", () => {
  const allRegisters = Object.values(mocks);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads only the requested command when help is not involved", async () => {
    const { registerCommands } = await import("./command-catalog.js");
    const program = new Command();

    await registerCommands(program, ["status"]);

    expect(mocks.status).toHaveBeenCalledOnce();
    for (const register of allRegisters.filter(
      (candidate) => candidate !== mocks.status,
    )) {
      expect(register).not.toHaveBeenCalled();
    }
  });

  it("loads every command when help is requested", async () => {
    const { registerCommands } = await import("./command-catalog.js");
    const program = new Command();

    await registerCommands(program, ["status", "--help"]);

    for (const register of allRegisters) {
      expect(register).toHaveBeenCalledOnce();
      expect(register).toHaveBeenCalledWith(program);
    }
  });

  it("does not register an onboard command loader", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./command-catalog.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toContain('id: "onboard"');
  });
});
