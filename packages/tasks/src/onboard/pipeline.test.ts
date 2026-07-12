import { describe, expect, it, vi } from "vitest";
import { defaultConfig, type SlashcashConfig } from "../local-state/schema";
import type { SlashcashPaths } from "../local-state/paths";
import type { OnboardHost } from "./host";
import { runPipeline, type OnboardContext, type StepStatusEvent } from "./pipeline";
import { buildOnboardSteps, listOnboardStepIds } from "./steps";
import { ONBOARD_STEP_IDS, type UiPort, type UiSpinner } from "./types";

function createFakeSpinner(): UiSpinner {
  return {
    start: vi.fn(),
    message: vi.fn(),
    stop: vi.fn(),
    error: vi.fn(),
    cancel: vi.fn(),
  };
}

function createFakeUi(overrides: Partial<UiPort> = {}): UiPort {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    note: vi.fn(),
    select: vi.fn(async ({ initialValue }) => initialValue),
    text: vi.fn(async () => ""),
    password: vi.fn(async () => ""),
    confirm: vi.fn(async () => true),
    spinner: createFakeSpinner,
    ...overrides,
  };
}

function createPaths(home = "/tmp/slashcash-onboard-test"): SlashcashPaths {
  return {
    home,
    config: `${home}/config.json`,
    credentials: `${home}/credentials.json`,
    db: `${home}/db.sqlite`,
    attachments: `${home}/attachments`,
    cache: `${home}/cache`,
    logs: `${home}/logs`,
    skills: `${home}/skills`,
    pyVenv: `${home}/py-venv`,
    pyInstallHash: `${home}/py-venv/.slashcash.install-hash`,
    pidDir: `${home}/pid`,
    pidFile: `${home}/pid/slashcash.pid.json`,
  };
}

function createFakeHost(overrides: Partial<OnboardHost> = {}): OnboardHost {
  const paths = createPaths();
  let config: SlashcashConfig = structuredClone(defaultConfig);

  return {
    resolvePaths: () => paths,
    ensureStateDirs: vi.fn(),
    loadConfig: () => structuredClone(config),
    writeConfig: (next) => {
      config = structuredClone(next);
    },
    configExists: () => false,
    readAssistantCredential: vi.fn(async () => null),
    writeAssistantCredential: vi.fn(async () => undefined),
    readStoredCredentials: vi.fn(async () => null),
    writeStoredCredentials: vi.fn(async (input) => ({
      address: input.address,
      appPassword: input.appPassword,
      store: "file" as const,
    })),
    describeCredentialStore: (store) =>
      store === "keychain" ? "Keychain" : "credentials file",
    commandExists: vi.fn(() => false),
    runCommand: vi.fn(() => ({
      ok: false as const,
      stdout: "",
      stderr: "",
      code: 1,
    })),
    runInteractive: vi.fn(async () => 0),
    isOllamaReachable: vi.fn(async () => false),
    openUrl: vi.fn(),
    ensureLocalDatabase: vi.fn(async () => undefined),
    getLocalProfileEmail: vi.fn(async () => null),
    syncLocalProfileEmail: vi.fn(async () => undefined),
    verifyImapLogin: vi.fn(async () => ({ ok: true as const })),
    ensurePythonEnvReady: vi.fn(async () => ({
      ok: true as const,
      runtime: { pythonBin: "/usr/bin/python3" },
    })),
    installBundledSkills: vi.fn(),
    startDetachedCommand: vi.fn(() => 4242),
    resolveDashboardLaunchMode: () => "dev",
    ensureDashboardService: vi.fn(async () => undefined),
    ...overrides,
    // Keep mutable config access for assertions when writeConfig is overridden.
    ...(overrides.writeConfig || overrides.loadConfig
      ? {}
      : {
          loadConfig: () => structuredClone(config),
          writeConfig: (next: SlashcashConfig) => {
            config = structuredClone(next);
          },
        }),
  };
}

function createContext(
  partial: Partial<OnboardContext> & {
    host?: OnboardHost;
    ui?: UiPort;
    config?: SlashcashConfig;
  } = {},
): OnboardContext {
  const host = partial.host ?? createFakeHost();
  const config = partial.config ?? host.loadConfig();
  return {
    paths: host.resolvePaths(),
    config,
    dryRun: false,
    skipExternal: false,
    yes: false,
    nonInteractive: false,
    freshConfig: true,
    ui: partial.ui ?? createFakeUi(),
    host,
    pendingPassword: null,
    credentialStore: null,
    ...partial,
  };
}

describe("onboard step list", () => {
  it("keeps the former CLI detect→install→verify order", () => {
    expect(listOnboardStepIds()).toEqual([...ONBOARD_STEP_IDS]);
  });
});

describe("onboard pipeline skips", () => {
  it("skips external assistant tooling when skipExternal is set", async () => {
    const events: StepStatusEvent[] = [];
    const host = createFakeHost();
    const ctx = createContext({
      host,
      yes: true,
      dryRun: true,
      skipExternal: true,
      config: {
        ...defaultConfig,
        assistant: {
          provider: "ollama-local",
          baseUrl: "http://127.0.0.1:11434/v1",
          chatModel: "gemma4:latest",
        },
      },
    });

    await runPipeline(ctx, buildOnboardSteps(), {
      onStatus: (event) => events.push(event),
    });

    const byId = Object.fromEntries(events.map((event) => [event.stepId, event]));
    expect(byId.homebrew?.status).toBe("skipped");
    expect(byId["ollama-install"]?.status).toBe("skipped");
    expect(byId["ollama-service"]?.status).toBe("skipped");
    expect(byId["ollama-pull"]?.status).toBe("skipped");
    expect(byId["state-dir"]?.status).toBe("skipped");
    expect(byId["db-migrate"]?.status).toBe("skipped");
    expect(host.ensureLocalDatabase).toHaveBeenCalled();
    expect(host.installBundledSkills).toHaveBeenCalled();
  });

  it("skips Ollama steps for hosted assistant providers", async () => {
    const events: StepStatusEvent[] = [];
    let profileEmail: string | null = null;
    const host = createFakeHost({
      readAssistantCredential: vi.fn(async () => ({
        provider: "openai-compatible" as const,
        apiKey: "sk-test",
        store: "file" as const,
      })),
      readStoredCredentials: vi.fn(async () => ({
        address: "user@gmail.com",
        appPassword: "abcdefghijklmnop",
        store: "file" as const,
      })),
      getLocalProfileEmail: vi.fn(async () => profileEmail),
      syncLocalProfileEmail: vi.fn(async (_db, email) => {
        profileEmail = email;
      }),
      startDetachedCommand: vi.fn(() => 99),
    });
    const ctx = createContext({
      host,
      freshConfig: false,
      config: {
        ...defaultConfig,
        assistant: {
          provider: "openai-compatible",
          baseUrl: "https://api.openai.com/v1",
          chatModel: "gpt-5.4-mini",
        },
        gmail: {
          ...defaultConfig.gmail,
          address: "user@gmail.com",
        },
      },
    });

    await runPipeline(ctx, buildOnboardSteps(), {
      onStatus: (event) => events.push(event),
    });

    const byId = Object.fromEntries(events.map((event) => [event.stepId, event]));
    expect(byId["assistant-provider"]?.status).toBe("skipped");
    expect(byId.homebrew?.message).toContain("hosted");
    expect(byId["ollama-install"]?.message).toContain("hosted");
    expect(byId["ollama-service"]?.message).toContain("hosted");
    expect(byId["ollama-pull"]?.message).toContain("hosted");
    expect(ctx.ui.select).not.toHaveBeenCalled();
  });

  it("applies yes defaults for a fresh ollama assistant without prompting", async () => {
    const ui = createFakeUi();
    let saved: SlashcashConfig | null = null;
    let profileEmail: string | null = null;
    const host = createFakeHost({
      configExists: () => false,
      writeConfig: (next) => {
        saved = structuredClone(next);
      },
      loadConfig: () => structuredClone(defaultConfig),
      readStoredCredentials: vi.fn(async () => ({
        address: "user@gmail.com",
        appPassword: "abcdefghijklmnop",
        store: "file" as const,
      })),
      getLocalProfileEmail: vi.fn(async () => profileEmail),
      syncLocalProfileEmail: vi.fn(async (_db, email) => {
        profileEmail = email;
      }),
      startDetachedCommand: vi.fn(() => 99),
    });
    const ctx = createContext({
      host,
      ui,
      yes: true,
      skipExternal: true,
      freshConfig: true,
      config: {
        ...structuredClone(defaultConfig),
        gmail: {
          ...defaultConfig.gmail,
          address: "user@gmail.com",
        },
      },
    });

    await runPipeline(ctx, buildOnboardSteps());

    expect(ui.select).not.toHaveBeenCalled();
    expect(saved?.assistant.provider ?? ctx.config.assistant.provider).toBe(
      "ollama-local",
    );
    expect(ctx.config.assistant.chatModel).toBe("gemma4:latest");
  });

  it("skips gmail and kickoff steps in dry-run mode", async () => {
    const events: StepStatusEvent[] = [];
    const ctx = createContext({
      dryRun: true,
      skipExternal: true,
      yes: true,
    });

    await runPipeline(ctx, buildOnboardSteps(), {
      onStatus: (event) => events.push(event),
    });

    const byId = Object.fromEntries(events.map((event) => [event.stepId, event]));
    expect(byId["gmail-account"]?.status).toBe("skipped");
    expect(byId["gmail-app-password"]?.status).toBe("skipped");
    expect(byId["imap-verify"]?.status).toBe("skipped");
    expect(byId["kickoff-sync"]?.status).toBe("skipped");
    expect(byId["dashboard-service"]?.status).toBe("skipped");
  });
});
