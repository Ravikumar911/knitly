export const TOP_BANNER = [
  "slashcash runs fully on your machine. Before we touch anything, the facts:",
  "  - Gmail sync is being rebased onto a local IMAP flow. Credentials stay on this machine; we never see them.",
  "  - Every email, PDF and analytics row stays under ~/.slashcash on this disk.",
  "  - PDFs are parsed by a local model (gemma3n:e4b via Ollama). No OpenAI, Anthropic or Mistral calls.",
  "  - The dashboard binds to 127.0.0.1. Nothing from the internet can reach it.",
  "  - No telemetry. The only outbound calls are the local services you explicitly configure.",
  "  - This CLI is published to npm with provenance and an SBOM. Re-read this any time with `slashcash privacy`.",
].join("\n");

export const FINAL_SUMMARY = [
  "On this machine now:",
  "  ~/.slashcash/db.sqlite      your local database",
  "  ~/.slashcash/attachments/   downloaded PDFs",
  "  ~/.slashcash/skills/        bundled local skills",
  "",
  "On our servers: nothing. slashcash has no backend.",
  "The Gmail mailbox flow is being migrated in the next phase.",
  "Run `slashcash privacy` to re-read this.",
].join("\n");
