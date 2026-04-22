import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(packageRoot, "../..");
export const playwrightStateRoot = join(repoRoot, ".artifacts", "playwright");
export const playwrightHome = join(playwrightStateRoot, "slashcash-home");
export const playwrightDbPath = join(playwrightHome, "db.sqlite");
export const playwrightAttachmentsDir = join(playwrightHome, "attachments");
export const gwsFixtureDir = join(packageRoot, "fixtures", "gws");

export const appPort = Number(process.env.PLAYWRIGHT_APP_PORT || 3301);
export const mockOllamaPort = Number(
  process.env.PLAYWRIGHT_MOCK_OLLAMA_PORT || 3302,
);

export const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${appPort}`;
export const mockOllamaBaseUrl = `http://127.0.0.1:${mockOllamaPort}/v1`;

export function createPlaywrightEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    SLASHCASH_HOME: playwrightHome,
    SQLITE_DB_PATH: playwrightDbPath,
    SLASHCASH_ATTACHMENTS_DIR: playwrightAttachmentsDir,
    SLASHCASH_GWS_FIXTURE_DIR: gwsFixtureDir,
    SLASHCASH_SYNC_SKIP_AI: "1",
    SLASHCASH_DOCTOR_SKIP_OLLAMA:
      process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA || "1",
    SLASHCASH_DOCTOR_SKIP_GWS: process.env.SLASHCASH_DOCTOR_SKIP_GWS || "1",
    SLASHCASH_NO_OPEN: "1",
    SLASHCASH_PORT: String(appPort),
    OLLAMA_BASE_URL: mockOllamaBaseUrl,
    OLLAMA_CHAT_MODEL: "mock-swiggy",
    OLLAMA_VISION_MODEL: "mock-swiggy",
  };
}

export function shellEnvPrefix(
  env: Record<string, string | undefined>,
): string {
  return Object.entries(env)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${shellEscape(value!)}`)
    .join(" ");
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
