import {
  chmodSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { loadConfig, writeConfig } from "./load.js";
import { resolvePaths } from "./paths.js";

const KEYCHAIN_SERVICE = "slashcash";

type KeytarModule = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(
    service: string,
    account: string,
    password: string,
  ): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

type FileCredentialShape = {
  gmail?: {
    address?: string;
    appPassword?: string;
  };
  assistant?: Record<string, { apiKey?: string }>;
  warn?: boolean;
};

export type StoredGmailCredentials = {
  address: string;
  appPassword: string;
  store: "keychain" | "file";
};

export type StoredAssistantCredential = {
  provider: "openai-compatible" | "anthropic";
  apiKey: string;
  store: "keychain" | "file";
};

export type CredentialState = {
  address: string;
  store: "keychain" | "file" | null;
  warning: string | null;
};

export async function readStoredCredentials(): Promise<StoredGmailCredentials | null> {
  const config = loadConfig({ createIfMissing: true });
  const address = (config.gmail?.address || "").trim();
  const fileCredentials = readCredentialsFile();

  const resolvedAddress =
    address || fileCredentials?.gmail?.address?.trim() || "";
  if (!resolvedAddress) return null;

  if ((config.gmail?.passwordStore || "keychain") === "keychain") {
    const keychainPassword = await readKeychainPassword(resolvedAddress);
    if (keychainPassword) {
      return {
        address: resolvedAddress,
        appPassword: keychainPassword,
        store: "keychain",
      };
    }
  }

  const filePassword = fileCredentials?.gmail?.appPassword?.trim();
  if (filePassword) {
    return {
      address: resolvedAddress,
      appPassword: filePassword,
      store: "file",
    };
  }

  return null;
}

export async function writeStoredCredentials(input: {
  address: string;
  appPassword: string;
}): Promise<StoredGmailCredentials> {
  const address = input.address.trim().toLowerCase();
  const appPassword = input.appPassword.replace(/\s+/g, "");
  const config = loadConfig({ createIfMissing: true });

  const keytar = await loadKeytar();
  if (keytar) {
    try {
      await keytar.setPassword(
        KEYCHAIN_SERVICE,
        keychainAccount(address),
        appPassword,
      );
      deleteCredentialsFile();
      writeConfig({
        ...config,
        gmail: {
          address,
          passwordStore: "keychain",
          imapServer: "imap.gmail.com:993",
        },
      });
      return {
        address,
        appPassword,
        store: "keychain",
      };
    } catch {
      // Fall through to the plaintext file fallback below.
    }
  }

  writeCredentialsFile({
    gmail: {
      address,
      appPassword,
    },
    warn: true,
  });
  writeConfig({
    ...config,
    gmail: {
      address,
      passwordStore: "file",
      imapServer: "imap.gmail.com:993",
    },
  });

  return {
    address,
    appPassword,
    store: "file",
  };
}

export async function resetStoredCredentials(): Promise<void> {
  const config = loadConfig({ createIfMissing: true });
  const fileCredentials = readCredentialsFile();
  const address =
    (config.gmail?.address || "").trim() ||
    fileCredentials?.gmail?.address?.trim() ||
    "";

  if (address) {
    const keytar = await loadKeytar();
    if (keytar) {
      try {
        await keytar.deletePassword(KEYCHAIN_SERVICE, keychainAccount(address));
      } catch {
        // Ignore keychain cleanup failures and continue deleting the fallback file.
      }
    }
  }

  deleteCredentialsFile();
}

export async function readAssistantCredential(
  provider: "openai-compatible" | "anthropic",
): Promise<StoredAssistantCredential | null> {
  const envKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY;
  if (envKey?.trim()) {
    return {
      provider,
      apiKey: envKey.trim(),
      store: "file",
    };
  }

  const keytar = await loadKeytar();
  if (keytar) {
    const keychainValue = await keytar.getPassword(
      KEYCHAIN_SERVICE,
      assistantKeychainAccount(provider),
    );
    if (keychainValue) {
      return {
        provider,
        apiKey: keychainValue,
        store: "keychain",
      };
    }
  }

  const fileCredentials = readCredentialsFile();
  const apiKey = fileCredentials?.assistant?.[provider]?.apiKey?.trim();
  return apiKey
    ? {
        provider,
        apiKey,
        store: "file",
      }
    : null;
}

export async function writeAssistantCredential(input: {
  provider: "openai-compatible" | "anthropic";
  apiKey: string;
}): Promise<StoredAssistantCredential> {
  const apiKey = input.apiKey.trim();
  const keytar = await loadKeytar();
  if (keytar) {
    try {
      await keytar.setPassword(
        KEYCHAIN_SERVICE,
        assistantKeychainAccount(input.provider),
        apiKey,
      );
      return {
        provider: input.provider,
        apiKey,
        store: "keychain",
      };
    } catch {
      // Fall through to the file store.
    }
  }

  const current = readCredentialsFile() ?? { warn: true };
  writeCredentialsFile({
    ...current,
    assistant: {
      ...(current.assistant ?? {}),
      [input.provider]: { apiKey },
    },
    warn: true,
  });
  return {
    provider: input.provider,
    apiKey,
    store: "file",
  };
}

export async function clearAssistantCredential(
  provider?: "openai-compatible" | "anthropic",
) {
  const providers = provider
    ? [provider]
    : (["openai-compatible", "anthropic"] as const);
  const keytar = await loadKeytar();
  if (keytar) {
    for (const candidate of providers) {
      await keytar.deletePassword(
        KEYCHAIN_SERVICE,
        assistantKeychainAccount(candidate),
      );
    }
  }

  const current = readCredentialsFile();
  if (!current?.assistant) return;
  const assistant = { ...current.assistant };
  for (const candidate of providers) {
    delete assistant[candidate];
  }
  writeCredentialsFile({
    ...current,
    assistant,
    warn: current.warn ?? true,
  });
}

export async function getCredentialState(): Promise<CredentialState> {
  const config = loadConfig({ createIfMissing: true });
  const fileCredentials = readCredentialsFile();
  const address =
    (config.gmail?.address || "").trim() ||
    fileCredentials?.gmail?.address?.trim() ||
    "";

  if (!address) {
    return {
      address: "",
      store: null,
      warning: null,
    };
  }

  if ((config.gmail?.passwordStore || "keychain") === "keychain") {
    const keychainPassword = await readKeychainPassword(address);
    if (keychainPassword) {
      return {
        address,
        store: "keychain",
        warning: null,
      };
    }
  }

  if (fileCredentials?.gmail?.appPassword?.trim()) {
    return {
      address,
      store: "file",
      warning:
        "Gmail app password is stored in ~/.slashcash/credentials.json. Move it to Keychain by rerunning `slashcash onboard`.",
    };
  }

  return {
    address,
    store: null,
    warning: null,
  };
}

export function keychainAccount(address: string) {
  return `gmail-app-password@${address.trim().toLowerCase()}`;
}

export function assistantKeychainAccount(provider: string) {
  return `assistant-api-key@${provider}`;
}

export function describeCredentialStore(store: "keychain" | "file" | null) {
  if (store === "keychain") {
    return "macOS Keychain: service `slashcash`";
  }
  if (store === "file") {
    return "~/.slashcash/credentials.json";
  }
  return "not stored";
}

async function readKeychainPassword(address: string) {
  const keytar = await loadKeytar();
  if (!keytar) return null;

  try {
    return await keytar.getPassword(KEYCHAIN_SERVICE, keychainAccount(address));
  } catch {
    return null;
  }
}

async function loadKeytar(): Promise<KeytarModule | null> {
  try {
    const imported = await import("keytar");
    const candidate = (
      imported as { default?: Partial<KeytarModule> } & Partial<KeytarModule>
    ).getPassword
      ? (imported as Partial<KeytarModule>)
      : imported.default;
    if (
      candidate &&
      typeof candidate.getPassword === "function" &&
      typeof candidate.setPassword === "function" &&
      typeof candidate.deletePassword === "function"
    ) {
      return candidate as KeytarModule;
    }
    return null;
  } catch {
    return null;
  }
}

function readCredentialsFile(): {
  gmail?: {
    address?: string;
    appPassword?: string;
  };
  assistant?: Record<string, { apiKey?: string }>;
  warn?: boolean;
} | null {
  const paths = resolvePaths();
  if (!existsSync(paths.credentials)) return null;

  try {
    return JSON.parse(readFileSync(paths.credentials, "utf8")) as {
      gmail?: {
        address?: string;
        appPassword?: string;
      };
      assistant?: Record<string, { apiKey?: string }>;
      warn?: boolean;
    };
  } catch {
    return null;
  }
}

function writeCredentialsFile(value: FileCredentialShape) {
  const paths = resolvePaths();
  writeFileSync(paths.credentials, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(paths.credentials, 0o600);
}

function deleteCredentialsFile() {
  const paths = resolvePaths();
  rmSync(paths.credentials, { force: true });
}
