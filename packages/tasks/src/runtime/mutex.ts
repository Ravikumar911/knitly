export type MutexRunResult<T> =
  | { status: "ran"; value: T }
  | { status: "skipped"; reason: "busy" };

const active = new Map<string, Promise<unknown>>();

export function isSyncActive(key = "default") {
  return active.has(key);
}

export async function runSingleFlight<T>(
  fn: () => Promise<T>,
  key = "default",
): Promise<MutexRunResult<T>> {
  if (active.has(key)) {
    return { status: "skipped", reason: "busy" };
  }

  const run = fn();
  active.set(key, run);

  try {
    const value = await run;
    return { status: "ran", value };
  } finally {
    if (active.get(key) === run) {
      active.delete(key);
    }
  }
}
