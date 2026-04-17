export type MutexRunResult<T> =
  | { status: "ran"; value: T }
  | { status: "skipped"; reason: "busy" };

let active: Promise<unknown> | null = null;

export function isSyncActive() {
  return active !== null;
}

export async function runSingleFlight<T>(fn: () => Promise<T>): Promise<MutexRunResult<T>> {
  if (active) {
    return { status: "skipped", reason: "busy" };
  }

  const run = fn();
  active = run;

  try {
    const value = await run;
    return { status: "ran", value };
  } finally {
    if (active === run) {
      active = null;
    }
  }
}
