import { CliError } from "../errors/format.js";
import { readStoredCredentials } from "./credentials.js";
import type { SlashcashPaths } from "./paths.js";
import type { SlashcashConfig } from "./schema.js";

export async function applyRuntimeEnv(input: {
  config: SlashcashConfig;
  paths: SlashcashPaths;
  query?: string;
  maxMessages?: number;
  port?: number;
}) {
  const { config, paths } = input;
  const gmail = config.gmail || {
    address: "",
    passwordStore: "keychain" as const,
    imapServer: "imap.gmail.com:993",
  };

  process.env.SQLITE_DB_PATH = paths.db;
  process.env.SLASHCASH_HOME = paths.home;
  process.env.SLASHCASH_ATTACHMENTS_DIR = paths.attachments;
  process.env.SLASHCASH_GMAIL_QUERY = input.query || config.sync.gmailQuery;
  process.env.SLASHCASH_SYNC_LIMIT = String(
    input.maxMessages || config.sync.maxMessages,
  );
  process.env.SLASHCASH_IMAP_SERVER = gmail.imapServer;
  process.env.OLLAMA_BASE_URL = config.ai.ollamaBaseUrl;
  process.env.OLLAMA_CHAT_MODEL = config.ai.chatModel;
  process.env.OLLAMA_VISION_MODEL = config.ai.visionModel;

  if (input.port !== undefined) {
    process.env.SLASHCASH_PORT = String(input.port);
  }

  if (process.env.SLASHCASH_IMAP_FIXTURE_DIR) {
    return null;
  }

  const credentials = await readStoredCredentials();
  if (!credentials) {
    throw new CliError({
      area: "auth",
      symptom: "Gmail credentials are not configured.",
      cause:
        "The IMAP sync needs a Gmail address and app password before it can connect.",
      fix: "Run `slashcash onboard` to save credentials, or `slashcash doctor --reset-credentials` to start over.",
      docs: "https://myaccount.google.com/apppasswords",
    });
  }

  process.env.SLASHCASH_GMAIL_ADDRESS = credentials.address;
  process.env.SLASHCASH_GMAIL_APP_PASSWORD = credentials.appPassword;
  process.env.SLASHCASH_GMAIL_PASSWORD_STORE = credentials.store;

  return credentials;
}
