import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveDesktopSlashcashHome, resolveSlashcashHome } from "./paths.js";

describe("path resolution", () => {
  const previousHome = process.env.SLASHCASH_HOME;
  const previousXdgDataHome = process.env.XDG_DATA_HOME;

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.SLASHCASH_HOME;
    } else {
      process.env.SLASHCASH_HOME = previousHome;
    }

    if (previousXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = previousXdgDataHome;
    }
  });

  it("keeps the CLI default under ~/.slashcash", () => {
    delete process.env.SLASHCASH_HOME;

    expect(resolveSlashcashHome()).toContain(join(".slashcash"));
  });

  it("resolves the macOS desktop home under Application Support", () => {
    expect(
      resolveDesktopSlashcashHome({
        platform: "darwin",
        homeDir: "/Users/alex",
      }),
    ).toBe("/Users/alex/Library/Application Support/slash.cash");
  });

  it("resolves the Windows desktop home under AppData", () => {
    expect(
      resolveDesktopSlashcashHome({
        platform: "win32",
        homeDir: "C:\\Users\\Alex",
        appData: "C:\\Users\\Alex\\AppData\\Roaming",
      }),
    ).toBe("C:\\Users\\Alex\\AppData\\Roaming\\slash.cash");
  });

  it("resolves the Linux desktop home under XDG data home", () => {
    process.env.XDG_DATA_HOME = "/home/alex/.local/state";

    expect(
      resolveDesktopSlashcashHome({
        platform: "linux",
        homeDir: "/home/alex",
      }),
    ).toBe("/home/alex/.local/state/slash.cash");
  });
});
