import { describe, expect, it } from "vitest";
import { formatCliError } from "./format.js";

describe("formatCliError", () => {
  it("prints the standard symptom/cause/fix block", () => {
    const block = formatCliError({
      area: "auth",
      symptom: "OAuth failed.",
      cause: "Google rejected the client.",
      fix: "Run `gws auth login`.",
    });

    expect(block).toBe(
      [
        "error[auth]: OAuth failed.",
        "  cause: Google rejected the client.",
        "  fix:   Run `gws auth login`.",
      ].join("\n"),
    );
  });
});
