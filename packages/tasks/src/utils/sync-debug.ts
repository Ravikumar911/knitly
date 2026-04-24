type DebugDetails = Record<string, unknown>;

/** One line per source / PDF / merge when set, or with full `SLASHCASH_SYNC_DEBUG`. */
export function isPipelineStepLogEnabled() {
  return process.env.SLASHCASH_PIPELINE_STEPS === "1" || isSyncDebugEnabled();
}

/**
 * High-level email/PDF source → model trace. Enable with
 * `SLASHCASH_PIPELINE_STEPS=1` (three lines only) or any `SYNC_DEBUG` (same lines plus detail).
 */
export function logPipelineStep(
  lane: "source-model" | "pdf-extractor" | "pdf" | "merge",
  data: DebugDetails,
) {
  if (!isPipelineStepLogEnabled()) return;
  const payload =
    data && Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : "";
  console.log(`[slashcash:pipeline:${lane}]${payload}`);
}

export function isSyncDebugEnabled() {
  return (
    process.env.SLASHCASH_SYNC_DEBUG === "1" ||
    process.env.SLASHCASH_DEBUG === "1"
  );
}

export function syncDebug(message: string, details?: DebugDetails) {
  if (!isSyncDebugEnabled()) return;

  if (details && Object.keys(details).length > 0) {
    console.log(`[slashcash:sync] ${message} ${JSON.stringify(details)}`);
    return;
  }

  console.log(`[slashcash:sync] ${message}`);
}

export function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: typeof error,
    message: String(error),
  };
}
