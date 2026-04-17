import { describe, expect, it } from "vitest";
import {
  FINAL_SUMMARY,
  PRE_GCLOUD_AUTH,
  PRE_GWS_SETUP,
  PRE_GWS_LOGIN,
  TOP_BANNER,
} from "./copy.js";

describe("privacy copy", () => {
  it("keeps the top-of-onboard banner stable", () => {
    expect(TOP_BANNER).toBe(
      [
        "slashcash runs fully on your machine. Before we touch anything, the facts:",
        "  - Your Gmail token lives in the Google Cloud project gcloud is about to create in YOUR account. We never see it.",
        "  - Every email, PDF and analytics row stays under ~/.slashcash on this disk.",
        "  - PDFs are parsed by a local model (gemma3n:e4b via Ollama). No OpenAI, Anthropic or Mistral calls.",
        "  - The dashboard binds to 127.0.0.1. Nothing from the internet can reach it.",
        "  - No telemetry. The only outbound calls are Gmail fetches you authorise through gws.",
        "  - This CLI is published to npm with provenance and an SBOM. Re-read this any time with `slashcash privacy`.",
      ].join("\n"),
    );
  });

  it("keeps the pre-consent lines stable", () => {
    expect(PRE_GCLOUD_AUTH).toBe(
      [
        "Opening your browser for Google sign-in. gcloud needs your account to create a",
        "Google Cloud project in YOUR account - the Gmail OAuth client and the refresh",
        "token will live there, not on our servers.",
      ].join("\n"),
    );

    expect(PRE_GWS_SETUP).toBe(
      [
        "gws may ask `Run gws auth login now? [Y/n]`. Answer `n`.",
        "slashcash will run a Gmail read-only login in the next step.",
      ].join("\n"),
    );

    expect(PRE_GWS_LOGIN).toBe(
      [
        'Opening your browser for Gmail consent. You\'ll see a "Google hasn\'t verified',
        'this app" screen - click Advanced, then Continue. The app is the one gws auth setup',
        "just created in your own Cloud project. Gmail access is limited to read-only.",
      ].join("\n"),
    );
  });

  it("keeps the final summary stable", () => {
    expect(FINAL_SUMMARY).toBe(
      [
        "On this machine now:",
        "  ~/.slashcash/db.sqlite           your local database",
        "  ~/.slashcash/attachments/        downloaded PDFs",
        "  ~/.config/gws/client_secret.json your OAuth client (yours, not ours)",
        "  ~/.config/gws/<token>            your Gmail refresh token (yours, not ours)",
        "",
        "On our servers: nothing. slashcash has no backend.",
        "From here on, the only outbound calls slashcash makes are Gmail API calls",
        "you authorised through gws. Run `slashcash privacy` to re-read this.",
      ].join("\n"),
    );
  });
});
