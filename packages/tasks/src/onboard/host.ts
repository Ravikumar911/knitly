import type { SlashcashConfig } from "../local-state/schema";
import type { SlashcashPaths } from "../local-state/paths";
import type {
  StoredAssistantCredential,
  StoredGmailCredentials,
} from "../local-state/credentials";
import type { CommandResult } from "../utils/subprocess";

export type PythonEnvCheck =
  | { ok: true; runtime: { pythonBin: string } }
  | { ok: false };

export type ImapVerifyResult =
  | { ok: true }
  | {
      ok: false;
      error: {
        symptom: string;
        cause: string;
        fix: string;
        docsUrl?: string;
        message: string;
      };
    };

export type DashboardLaunchMode = "packaged" | "dev";

/** Platform side effects injectable for tests and alternate runtimes. */
export type OnboardHost = {
  resolvePaths(): SlashcashPaths;
  ensureStateDirs(paths: SlashcashPaths): void;
  loadConfig(options?: { createIfMissing?: boolean }): SlashcashConfig;
  writeConfig(config: SlashcashConfig): void;
  configExists(paths: SlashcashPaths): boolean;

  readAssistantCredential(
    provider: "openai-compatible" | "anthropic",
  ): Promise<StoredAssistantCredential | null>;
  writeAssistantCredential(input: {
    provider: "openai-compatible" | "anthropic";
    apiKey: string;
  }): Promise<void>;
  readStoredCredentials(): Promise<StoredGmailCredentials | null>;
  writeStoredCredentials(input: {
    address: string;
    appPassword: string;
  }): Promise<StoredGmailCredentials>;
  describeCredentialStore(store: "keychain" | "file" | null): string;

  commandExists(command: string): boolean;
  runCommand(
    command: string,
    args: string[],
    options?: { timeoutMs?: number },
  ): CommandResult;
  runInteractive(command: string, args: string[]): Promise<number>;

  isOllamaReachable(baseUrl: string, timeoutMs: number): Promise<boolean>;
  openUrl(url: string): void;

  ensureLocalDatabase(dbPath: string): Promise<void>;
  getLocalProfileEmail(dbPath: string): Promise<string | null>;
  syncLocalProfileEmail(dbPath: string, email: string): Promise<void>;

  verifyImapLogin(input: {
    address: string;
    appPassword?: string;
  }): Promise<ImapVerifyResult>;

  ensurePythonEnvReady(input: {
    config: SlashcashConfig;
    paths: SlashcashPaths;
  }): Promise<PythonEnvCheck>;

  installBundledSkills(): void;
  startDetachedCommand(paths: SlashcashPaths, args: string[]): number;
  resolveDashboardLaunchMode(): DashboardLaunchMode;
  ensureDashboardService(input: { port: number }): Promise<void>;
};
