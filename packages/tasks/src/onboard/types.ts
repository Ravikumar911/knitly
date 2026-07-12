export type UiOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

export type UiSpinner = {
  start(message?: string): void;
  message(message?: string): void;
  stop(message?: string): void;
  error(message?: string): void;
  cancel(message?: string): void;
};

/** Injectable UI port for onboard prompts — no clack in the library. */
export interface UiPort {
  intro(title: string): void;
  outro(message: string): void;
  note(message: string, title?: string): void;
  select<T extends string>(options: {
    message: string;
    options: UiOption<T>[];
    initialValue: T;
  }): Promise<T>;
  text(options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string | undefined) => string | Error | undefined;
  }): Promise<string>;
  password(options: {
    message: string;
    validate?: (value: string | undefined) => string | Error | undefined;
  }): Promise<string>;
  confirm(options: {
    message: string;
    initialValue?: boolean;
  }): Promise<boolean>;
  spinner(): UiSpinner;
}

export type DetectResult =
  | { done: true; message?: string }
  | { done: false; message?: string };

export type OnboardStepId =
  | "welcome"
  | "assistant-provider"
  | "homebrew"
  | "ollama-install"
  | "ollama-service"
  | "chat-model"
  | "ollama-pull"
  | "state-dir"
  | "db-migrate"
  | "gmail-account"
  | "gmail-app-password"
  | "imap-verify"
  | "local-profile"
  | "python-env"
  | "bundled-skills"
  | "kickoff-sync"
  | "dashboard-service";

export const ONBOARD_STEP_IDS: readonly OnboardStepId[] = [
  "welcome",
  "assistant-provider",
  "homebrew",
  "ollama-install",
  "ollama-service",
  "chat-model",
  "ollama-pull",
  "state-dir",
  "db-migrate",
  "gmail-account",
  "gmail-app-password",
  "imap-verify",
  "local-profile",
  "python-env",
  "bundled-skills",
  "kickoff-sync",
  "dashboard-service",
] as const;

export type OnboardErrorArea =
  | "auth"
  | "network"
  | "binary"
  | "schema"
  | "config"
  | "filesystem"
  | "runtime"
  | "internal";

export type OnboardErrorBlock = {
  area: OnboardErrorArea;
  symptom: string;
  cause: string;
  fix: string;
  docs?: string;
};

export class OnboardError extends Error {
  readonly block: OnboardErrorBlock;

  constructor(block: OnboardErrorBlock) {
    super(block.symptom);
    this.name = "OnboardError";
    this.block = block;
  }
}

export class OnboardCancelledError extends Error {
  constructor() {
    super("Setup cancelled.");
    this.name = "OnboardCancelledError";
  }
}
