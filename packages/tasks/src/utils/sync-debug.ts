type DebugDetails = Record<string, unknown>;

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
