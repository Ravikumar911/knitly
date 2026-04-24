export function resolveAiExtractionTimeoutMs() {
  const configured = Number(
    process.env.SLASHCASH_AI_EXTRACTION_TIMEOUT_MS || 45_000,
  );
  return Number.isFinite(configured) && configured > 0 ? configured : 45_000;
}

export function createAiAbortController() {
  const timeoutMs = resolveAiExtractionTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(
      new Error(`AI extraction timed out after ${timeoutMs}ms.`),
    );
  }, timeoutMs);

  return {
    signal: controller.signal,
    timeoutMs,
    clear: () => clearTimeout(timeout),
  };
}
