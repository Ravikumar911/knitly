import {
  OnboardCancelledError,
  OnboardError,
  privacyTopBanner,
  runOnboardPipeline,
  type OnboardStepId,
  type RunOnboardPipelineResult,
  type UiOption,
  type UiPort,
  type UiSpinner,
} from "@workspace/tasks/onboard";
import { createAppOnboardHost, isOnboardComplete } from "./complete";
import { stepIdToScreen, type WizardScreen } from "./screens";

export const APP_PASSWORD_URL =
  "https://myaccount.google.com/apppasswords";

export const PRE_APP_PASSWORD_COPY = [
  "You are about to paste a Gmail app password, not your main Google password.",
  "Open Google App Passwords, enable 2-Step Verification if needed, then generate a 16-character password.",
  "If you ever want to revoke it, remove the app password from that page and rerun setup.",
].join("\n");

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_OLLAMA_CHAT_MODEL = "gemma4:latest";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
const DEFAULT_ANTHROPIC_CHAT_MODEL = "claude-haiku-4-5";

export type AssistantProviderChoice =
  | "ollama-local"
  | "openai-compatible"
  | "anthropic";

export type PendingPromptKind =
  | "select"
  | "text"
  | "password"
  | "confirm";

export type PendingPrompt = {
  kind: PendingPromptKind;
  message: string;
  options?: UiOption<string>[];
  initialValue?: string | boolean;
  placeholder?: string;
  defaultValue?: string;
};

export type ChecklistItem = {
  stepId: OnboardStepId;
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  message?: string;
};

export type OnboardSessionPhase =
  | "idle"
  | "running"
  | "awaiting"
  | "complete"
  | "error";

export type OnboardSessionSnapshot = {
  complete: boolean;
  welcomeAcknowledged: boolean;
  phase: OnboardSessionPhase;
  screen: WizardScreen;
  activeStepId: OnboardStepId | null;
  pending: PendingPrompt | null;
  spinnerMessage: string | null;
  checklist: ChecklistItem[];
  error: {
    symptom: string;
    cause: string;
    fix: string;
    docs?: string;
  } | null;
  summary: RunOnboardPipelineResult["summary"] | null;
  privacyBanner: string;
  preAppPasswordCopy: string;
  appPasswordUrl: string;
  assistantProvider: string;
  needsAssistantChoice: boolean;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type AnswerValue = string | boolean;

function providerDefaults(provider: AssistantProviderChoice) {
  if (provider === "anthropic") {
    return {
      provider,
      baseUrl: DEFAULT_ANTHROPIC_BASE_URL,
      chatModel: DEFAULT_ANTHROPIC_CHAT_MODEL,
    } as const;
  }
  if (provider === "openai-compatible") {
    return {
      provider,
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      chatModel: DEFAULT_OPENAI_CHAT_MODEL,
    } as const;
  }
  return {
    provider: "ollama-local" as const,
    baseUrl: DEFAULT_OLLAMA_BASE_URL,
    chatModel: DEFAULT_OLLAMA_CHAT_MODEL,
  };
}

class OnboardWizardSession {
  welcomeAcknowledged = false;
  phase: OnboardSessionPhase = "idle";
  activeStepId: OnboardStepId | null = null;
  pending: PendingPrompt | null = null;
  spinnerMessage: string | null = null;
  checklist: ChecklistItem[] = [];
  error: OnboardSessionSnapshot["error"] = null;
  summary: RunOnboardPipelineResult["summary"] | null = null;
  useRecommendedDefaults = true;

  private answerDeferred: Deferred<AnswerValue> | null = null;
  private runPromise: Promise<void> | null = null;
  private cancelled = false;

  async getSnapshot(): Promise<OnboardSessionSnapshot> {
    const host = createAppOnboardHost();
    const paths = host.resolvePaths();
    const configExists = host.configExists(paths);
    let assistantProvider = "none";
    if (configExists) {
      try {
        assistantProvider = host.loadConfig().assistant.provider;
      } catch {
        assistantProvider = "none";
      }
    }

    // Resume past welcome when setup already started in a prior session.
    if (
      !this.welcomeAcknowledged &&
      configExists &&
      assistantProvider !== "none"
    ) {
      this.welcomeAcknowledged = true;
    }

    const complete =
      this.phase === "complete" || (await isOnboardComplete(host));
    const needsAssistantChoice =
      !complete &&
      this.welcomeAcknowledged &&
      this.phase === "idle" &&
      assistantProvider === "none";

    return {
      complete,
      welcomeAcknowledged: this.welcomeAcknowledged,
      phase: complete && this.phase === "idle" ? "complete" : this.phase,
      screen: this.resolveScreen({
        complete,
        needsAssistantChoice,
        assistantProvider,
      }),
      activeStepId: this.activeStepId,
      pending: this.pending,
      spinnerMessage: this.spinnerMessage,
      checklist: this.checklist,
      error: this.error,
      summary: this.summary,
      privacyBanner: privacyTopBanner(),
      preAppPasswordCopy: PRE_APP_PASSWORD_COPY,
      appPasswordUrl: APP_PASSWORD_URL,
      assistantProvider,
      needsAssistantChoice,
    };
  }

  acknowledgeWelcome() {
    this.welcomeAcknowledged = true;
    return this.getSnapshot();
  }

  async start(input: {
    useRecommendedDefaults?: boolean;
    provider?: AssistantProviderChoice;
    apiKey?: string;
  } = {}) {
    if (this.phase === "running" || this.phase === "awaiting") {
      return this.getSnapshot();
    }

    const host = createAppOnboardHost();

    if (await isOnboardComplete(host)) {
      this.phase = "complete";
      this.welcomeAcknowledged = true;
      return this.getSnapshot();
    }

    this.welcomeAcknowledged = true;
    this.useRecommendedDefaults = input.useRecommendedDefaults !== false;
    this.cancelled = false;
    this.error = null;
    this.summary = null;
    this.checklist = [];
    this.spinnerMessage = null;
    this.pending = null;
    this.phase = "running";

    if (input.provider) {
      await this.applyAssistantChoice(host, input.provider, input.apiKey);
    }

    const ui = this.createUiPort();

    this.runPromise = runOnboardPipeline({
      ui,
      host,
      yes: this.useRecommendedDefaults,
      showPrivacyBanner: false,
      onStatus: (event) => {
        this.activeStepId = event.stepId;
        const existing = this.checklist.find(
          (item) => item.stepId === event.stepId,
        );
        const nextStatus =
          event.status === "started"
            ? "running"
            : event.status === "skipped"
              ? "skipped"
              : "done";
        if (existing) {
          existing.status = nextStatus;
          existing.message = event.message ?? existing.message;
          existing.label = event.label;
        } else {
          this.checklist.push({
            stepId: event.stepId,
            label: event.label,
            status: nextStatus,
            message: event.message,
          });
        }
      },
      onCancelMessage: () => {
        this.cancelled = true;
      },
    })
      .then((result) => {
        if (this.cancelled) {
          this.phase = "idle";
          return;
        }
        this.summary = result.summary;
        this.phase = "complete";
        this.activeStepId = null;
        this.pending = null;
        this.spinnerMessage = null;
      })
      .catch((error: unknown) => {
        if (error instanceof OnboardCancelledError || this.cancelled) {
          this.phase = "idle";
          this.pending = null;
          this.spinnerMessage = null;
          return;
        }

        if (error instanceof OnboardError) {
          this.error = {
            symptom: error.block.symptom,
            cause: error.block.cause,
            fix: error.block.fix,
            docs: error.block.docs,
          };
        } else if (
          error &&
          typeof error === "object" &&
          "symptom" in error &&
          "cause" in error &&
          "fix" in error
        ) {
          const block = error as {
            symptom: string;
            cause: string;
            fix: string;
            docs?: string;
          };
          this.error = {
            symptom: block.symptom,
            cause: block.cause,
            fix: block.fix,
            docs: block.docs,
          };
        } else {
          this.error = {
            symptom:
              error instanceof Error ? error.message : "Onboarding failed.",
            cause: "An unexpected error stopped setup.",
            fix: "Retry setup from this screen. Progress already saved will be reused.",
          };
        }
        this.phase = "error";
        this.pending = null;
        this.spinnerMessage = null;
      })
      .finally(() => {
        this.runPromise = null;
        this.answerDeferred = null;
      });

    await Promise.race([
      this.runPromise,
      new Promise((resolve) => setTimeout(resolve, 75)),
    ]);

    return this.getSnapshot();
  }

  async answer(input: {
    value: AnswerValue;
    useRecommendedDefaults?: boolean;
  }) {
    if (typeof input.useRecommendedDefaults === "boolean") {
      this.useRecommendedDefaults = input.useRecommendedDefaults;
    }

    if (!this.answerDeferred || this.phase !== "awaiting") {
      throw new Error("No onboarding prompt is waiting for an answer.");
    }

    const deferred = this.answerDeferred;
    this.answerDeferred = null;
    this.pending = null;
    this.phase = "running";
    deferred.resolve(input.value);

    await Promise.race([
      this.runPromise ?? Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 75)),
    ]);

    return this.getSnapshot();
  }

  async openAppPasswordUrl() {
    const host = createAppOnboardHost();
    host.openUrl(APP_PASSWORD_URL);
    return { ok: true as const, url: APP_PASSWORD_URL };
  }

  async cancel() {
    this.cancelled = true;
    if (this.answerDeferred) {
      this.answerDeferred.reject(new OnboardCancelledError());
      this.answerDeferred = null;
    }
    this.pending = null;
    this.spinnerMessage = null;
    this.phase = "idle";
    return this.getSnapshot();
  }

  /** Test helper — reset singleton state between cases. */
  resetForTests() {
    this.welcomeAcknowledged = false;
    this.phase = "idle";
    this.activeStepId = null;
    this.pending = null;
    this.spinnerMessage = null;
    this.checklist = [];
    this.error = null;
    this.summary = null;
    this.useRecommendedDefaults = true;
    this.cancelled = false;
    this.answerDeferred = null;
    this.runPromise = null;
  }

  private async applyAssistantChoice(
    host: ReturnType<typeof createAppOnboardHost>,
    provider: AssistantProviderChoice,
    apiKey?: string,
  ) {
    const config = host.loadConfig({ createIfMissing: true });
    const defaults = providerDefaults(provider);
    config.assistant = {
      provider: defaults.provider,
      baseUrl: defaults.baseUrl,
      chatModel: defaults.chatModel,
    };
    if (provider === "ollama-local") {
      config.ai.ollamaBaseUrl = defaults.baseUrl;
      config.ai.chatModel = defaults.chatModel;
      config.ai.visionModel ||= defaults.chatModel;
    }
    host.writeConfig(config);

    if (provider === "openai-compatible" || provider === "anthropic") {
      const existing = await host.readAssistantCredential(provider);
      if (!existing) {
        const key = apiKey?.trim();
        if (!key) {
          throw new Error("API key is required for the hosted assistant.");
        }
        await host.writeAssistantCredential({ provider, apiKey: key });
      }
    }
  }

  private resolveScreen(input: {
    complete: boolean;
    needsAssistantChoice: boolean;
    assistantProvider: string;
  }): WizardScreen {
    if (input.complete || this.phase === "complete") {
      return "ready";
    }
    if (!this.welcomeAcknowledged) {
      return "welcome";
    }
    if (input.needsAssistantChoice) {
      return "assistant";
    }
    if (this.activeStepId) {
      return stepIdToScreen(this.activeStepId);
    }
    if (this.pending) {
      return this.pendingToScreen(this.pending);
    }
    if (this.phase === "idle") {
      return input.assistantProvider === "none" ? "assistant" : "finishing";
    }
    if (this.phase === "error") {
      return this.activeStepId
        ? stepIdToScreen(this.activeStepId)
        : "finishing";
    }
    return "finishing";
  }

  private pendingToScreen(pending: PendingPrompt): WizardScreen {
    const message = pending.message.toLowerCase();
    if (
      message.includes("extraction and chat") ||
      message.includes("api key") ||
      message.includes("anthropic") ||
      message.includes("openai")
    ) {
      return "assistant";
    }
    if (message.includes("chat model")) {
      return "ollama";
    }
    if (message.includes("gmail address")) {
      return "gmail";
    }
    if (message.includes("app password")) {
      return "app-password";
    }
    if (message.includes("retry with a different")) {
      return "imap";
    }
    return this.activeStepId
      ? stepIdToScreen(this.activeStepId)
      : "finishing";
  }

  private createUiPort(): UiPort {
    const park = async <T extends AnswerValue>(
      pending: PendingPrompt,
    ): Promise<T> => {
      if (
        pending.kind === "select" &&
        this.useRecommendedDefaults &&
        /chat model/i.test(pending.message)
      ) {
        return (pending.initialValue as T) ?? (("gemma4:latest" as unknown) as T);
      }

      if (
        pending.kind === "text" &&
        /press enter to open google app passwords/i.test(pending.message)
      ) {
        try {
          createAppOnboardHost().openUrl(APP_PASSWORD_URL);
        } catch {
          // UI can still open the URL manually.
        }
        return "" as T;
      }

      this.pending = pending;
      this.phase = "awaiting";
      this.spinnerMessage = null;
      this.answerDeferred = createDeferred<AnswerValue>();
      return (await this.answerDeferred.promise) as T;
    };

    return {
      intro: () => {},
      outro: () => {},
      note: () => {},
      select: async (options) =>
        park({
          kind: "select",
          message: options.message,
          options: options.options,
          initialValue: options.initialValue,
        }),
      text: async (options) =>
        park({
          kind: "text",
          message: options.message,
          placeholder: options.placeholder,
          defaultValue: options.defaultValue,
        }),
      password: async (options) =>
        park({
          kind: "password",
          message: options.message,
        }),
      confirm: async (options) =>
        park({
          kind: "confirm",
          message: options.message,
          initialValue: options.initialValue,
        }),
      spinner: (): UiSpinner => ({
        start: (message) => {
          this.spinnerMessage = message ?? null;
          if (this.phase !== "awaiting") {
            this.phase = "running";
          }
        },
        message: (message) => {
          this.spinnerMessage = message ?? this.spinnerMessage;
        },
        stop: (message) => {
          this.spinnerMessage = message ?? null;
        },
        error: (message) => {
          this.spinnerMessage = message ?? null;
        },
        cancel: (message) => {
          this.spinnerMessage = message ?? null;
        },
      }),
    };
  }
}

const globalForOnboard = globalThis as typeof globalThis & {
  __slashcashOnboardSession?: OnboardWizardSession;
};

export function getOnboardSession(): OnboardWizardSession {
  if (!globalForOnboard.__slashcashOnboardSession) {
    globalForOnboard.__slashcashOnboardSession = new OnboardWizardSession();
  }
  return globalForOnboard.__slashcashOnboardSession;
}
