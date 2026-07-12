import type { DetectResult, OnboardStepId, UiPort } from "./types";
import type { OnboardHost } from "./host";
import type { SlashcashConfig } from "../local-state/schema";
import type { SlashcashPaths } from "../local-state/paths";

export type OnboardContext = {
  paths: SlashcashPaths;
  config: SlashcashConfig;
  dryRun: boolean;
  skipExternal: boolean;
  yes: boolean;
  nonInteractive: boolean;
  freshConfig: boolean;
  ui: UiPort;
  host: OnboardHost;
  pendingPassword: string | null;
  credentialStore: "keychain" | "file" | null;
};

export type OnboardStep = {
  id: OnboardStepId;
  label: string;
  detect(ctx: OnboardContext): Promise<DetectResult> | DetectResult;
  install(ctx: OnboardContext): Promise<void> | void;
  verify(ctx: OnboardContext): Promise<void> | void;
};

export type StepStatusEvent = {
  stepId: OnboardStepId;
  label: string;
  status: "skipped" | "done";
  message?: string;
};

export async function runPipeline(
  ctx: OnboardContext,
  steps: OnboardStep[],
  options: {
    onStatus?: (event: StepStatusEvent) => void;
    activeStep?: { step: string };
  } = {},
) {
  for (const step of steps) {
    if (options.activeStep) {
      options.activeStep.step = step.id;
    }
    const detected = await step.detect(ctx);
    if (detected.done) {
      options.onStatus?.({
        stepId: step.id,
        label: step.label,
        status: "skipped",
        message: detected.message,
      });
      continue;
    }

    await step.install(ctx);
    await step.verify(ctx);
    options.onStatus?.({
      stepId: step.id,
      label: step.label,
      status: "done",
    });
  }
}
