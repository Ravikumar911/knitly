import { describe, expect, it } from "vitest";
import { commandExists } from "./subprocess.js";

describe("commandExists", () => {
  it("checks PATH without shell argument warnings", () => {
    expect(commandExists("node")).toBe(true);
    expect(commandExists("slashcash-definitely-missing")).toBe(false);
  });
});
