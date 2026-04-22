import { describe, expect, it } from "vitest";
import { CliError, formatCliError, normalizeCliError } from "./format.js";

describe("CLI error formatting", () => {
  it("prints the standard symptom/cause/fix block", () => {
    const block = formatCliError({
      area: "auth",
      symptom: "OAuth failed.",
      cause: "Google rejected the client.",
      fix: "Run `slashcash onboard`.",
    });

    expect(block).toBe(
      [
        "error[auth]: OAuth failed.",
        "  cause: Google rejected the client.",
        "  fix:   Run `slashcash onboard`.",
      ].join("\n"),
    );
  });

  it("prints optional docs links", () => {
    const block = formatCliError({
      area: "config",
      symptom: "Config is invalid.",
      cause: "The JSON schema check failed.",
      fix: "Rewrite the config.",
      docs: "packages/docs/reference/testing.md",
    });

    expect(block).toContain("docs:  packages/docs/reference/testing.md");
  });

  it("normalizes typed, block-shaped, and generic errors", () => {
    const cliError = new CliError({
      area: "network",
      symptom: "Ollama is down.",
      cause: "The local server refused the connection.",
      fix: "Start Ollama and retry.",
    });

    expect(normalizeCliError(cliError)).toEqual(cliError.block);
    expect(normalizeCliError({
      area: "filesystem",
      symptom: "State dir missing.",
      cause: "The folder was deleted.",
      fix: "Run `slashcash doctor --fix`.",
    })).toEqual({
      area: "filesystem",
      symptom: "State dir missing.",
      cause: "The folder was deleted.",
      fix: "Run `slashcash doctor --fix`.",
    });
    expect(normalizeCliError(new Error("boom"))).toEqual({
      area: "runtime",
      symptom: "Command failed.",
      cause: "boom",
      fix: "Run `slashcash doctor --fix`, then retry the command.",
    });
  });
});
