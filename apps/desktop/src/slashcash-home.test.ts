import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveDesktopProductHome } from "./slashcash-home.js";

describe("resolveDesktopProductHome", () => {
  const previousHome = process.env.SLASHCASH_HOME;

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.SLASHCASH_HOME;
    } else {
      process.env.SLASHCASH_HOME = previousHome;
    }
  });

  it("defaults to ~/.slashcash under the given home directory", () => {
    delete process.env.SLASHCASH_HOME;

    expect(resolveDesktopProductHome({}, "/Users/alex")).toBe(
      join("/Users/alex", ".slashcash"),
    );
  });

  it("lets SLASHCASH_HOME override the default", () => {
    expect(
      resolveDesktopProductHome(
        { SLASHCASH_HOME: "/tmp/custom-slashcash" },
        "/Users/alex",
      ),
    ).toBe("/tmp/custom-slashcash");
  });
});
