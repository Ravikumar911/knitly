import type { OnboardStepId } from "@workspace/tasks/onboard";

export type WizardScreen =
  | "welcome"
  | "assistant"
  | "ollama"
  | "gmail"
  | "app-password"
  | "imap"
  | "finishing"
  | "ready";

export const WIZARD_SCREEN_ORDER: readonly WizardScreen[] = [
  "welcome",
  "assistant",
  "ollama",
  "gmail",
  "app-password",
  "imap",
  "finishing",
  "ready",
] as const;

export function stepIdToScreen(stepId: OnboardStepId): WizardScreen {
  switch (stepId) {
    case "welcome":
      return "welcome";
    case "assistant-provider":
      return "assistant";
    case "homebrew":
    case "ollama-install":
    case "ollama-service":
    case "chat-model":
    case "ollama-pull":
      return "ollama";
    case "gmail-account":
      return "gmail";
    case "gmail-app-password":
      return "app-password";
    case "imap-verify":
      return "imap";
    case "state-dir":
    case "db-migrate":
    case "local-profile":
    case "python-env":
    case "bundled-skills":
    case "kickoff-sync":
    case "dashboard-service":
      return "finishing";
  }
}

export function screenLabel(screen: WizardScreen): string {
  switch (screen) {
    case "welcome":
      return "Welcome";
    case "assistant":
      return "Assistant";
    case "ollama":
      return "Local setup";
    case "gmail":
      return "Gmail";
    case "app-password":
      return "App password";
    case "imap":
      return "Connect";
    case "finishing":
      return "Finishing";
    case "ready":
      return "Ready";
  }
}
