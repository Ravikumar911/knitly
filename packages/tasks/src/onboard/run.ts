import type { OnboardHost } from "./host";
import type { OnboardContext, StepStatusEvent } from "./pipeline";
import { runPipeline } from "./pipeline";
import {
  buildFinalSummary,
  buildOnboardSteps,
  privacyTopBanner,
} from "./steps";
import {
  OnboardCancelledError,
  type OnboardStepId,
  type UiPort,
} from "./types";

export type RunOnboardPipelineOptions = {
  ui: UiPort;
  host: OnboardHost;
  dryRun?: boolean;
  skipExternal?: boolean;
  yes?: boolean;
  nonInteractive?: boolean;
  showPrivacyBanner?: boolean;
  onStatus?: (event: StepStatusEvent) => void;
  onCancelMessage?: (stepId: string) => void;
};

export type RunOnboardPipelineResult = {
  summary: ReturnType<typeof buildFinalSummary>;
  steps: OnboardStepId[];
};

export async function runOnboardPipeline(
  options: RunOnboardPipelineOptions,
): Promise<RunOnboardPipelineResult> {
  const paths = options.host.resolvePaths();
  const freshConfig = !options.host.configExists(paths);
  const ctx: OnboardContext = {
    paths,
    config: options.host.loadConfig({ createIfMissing: true }),
    dryRun: options.dryRun === true,
    skipExternal: options.skipExternal === true || options.dryRun === true,
    yes: options.yes === true,
    nonInteractive: options.nonInteractive === true,
    freshConfig,
    ui: options.ui,
    host: options.host,
    pendingPassword: null,
    credentialStore: null,
  };

  const activeState = { step: "welcome" };
  const onCancel = () => {
    options.onCancelMessage?.(activeState.step);
  };

  if (typeof process !== "undefined" && typeof process.once === "function") {
    process.once("SIGINT", onCancel);
  }

  try {
    ctx.ui.intro("slashcash setup");
    if (
      options.showPrivacyBanner !== false &&
      process.env.SLASHCASH_E2E !== "1"
    ) {
      ctx.ui.note(privacyTopBanner());
    }

    const steps = buildOnboardSteps();
    await runPipeline(ctx, steps, {
      activeStep: activeState,
      onStatus: options.onStatus,
    });

    const summary = buildFinalSummary(ctx);
    ctx.ui.outro(
      `Onboarding complete. Dashboard: ${summary.dashboard}`,
    );
    return {
      summary,
      steps: steps.map((step) => step.id),
    };
  } catch (error) {
    if (error instanceof OnboardCancelledError) {
      throw error;
    }
    throw error;
  } finally {
    if (typeof process !== "undefined" && typeof process.off === "function") {
      process.off("SIGINT", onCancel);
    }
  }
}
