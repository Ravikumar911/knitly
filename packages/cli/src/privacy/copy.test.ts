import { describe, expect, it } from "vitest";
import { FINAL_SUMMARY, PRE_APP_PASSWORD_INPUT, TOP_BANNER } from "./copy.js";

describe("privacy copy", () => {
  it("keeps the top-of-onboard banner stable", () => {
    expect(TOP_BANNER).toBe(
      [
        "slashcash runs fully on your machine. Before we touch anything, the facts:",
        "  - Your Gmail app password is stored in the macOS Keychain (or ~/.slashcash if Keychain is unavailable). We never see it.",
        "  - Every email, PDF and analytics row stays under ~/.slashcash on this disk.",
        "  - PDFs are converted to text by local Docling, then your local Ollama model maps email + PDF text. No OpenAI, Anthropic or Mistral calls.",
        "  - The dashboard binds to 127.0.0.1. Nothing from the internet can reach it.",
        "  - No telemetry. The only outbound calls are Gmail IMAP connections you authorised with an app password.",
        "  - This CLI is published to npm with provenance and an SBOM. Re-read this any time with `slashcash privacy`.",
      ].join("\n"),
    );
  });

  it("keeps the pre-password note stable", () => {
    expect(PRE_APP_PASSWORD_INPUT).toBe(
      [
        "You are about to paste a Gmail app password, not your main Google password.",
        "Generate it at https://myaccount.google.com/apppasswords after enabling 2-Step Verification.",
        "If you ever want to revoke it, remove the app password from that page and rerun `slashcash onboard`.",
      ].join("\n"),
    );
  });

  it("keeps the final summary stable", () => {
    expect(
      FINAL_SUMMARY({ credentialStore: "macOS Keychain: service `slashcash`" }),
    ).toBe(
      [
        "On this machine now:",
        "  ~/.slashcash/db.sqlite      your local database",
        "  ~/.slashcash/attachments/   downloaded PDFs",
        "  ~/.slashcash/skills/        bundled local skills",
        "  macOS Keychain: service `slashcash`  your Gmail app password",
        "",
        "On our servers: nothing. slashcash has no backend.",
        "Run `slashcash privacy` to re-read this.",
      ].join("\n"),
    );
  });
});
