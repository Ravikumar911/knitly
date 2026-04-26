export type WorkPoolOptions<T, R> = {
  concurrency: number;
  work: (item: T, signal?: AbortSignal) => Promise<R>;
  failFast?: boolean;
  signal?: AbortSignal;
};

export type WorkPoolSettlement<R> =
  | { status: "fulfilled"; value: R }
  | { status: "rejected"; reason: unknown };

export function createWorkPool<T, R>(opts: WorkPoolOptions<T, R>) {
  const concurrency = Math.max(1, Math.floor(opts.concurrency || 1));
  const queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (reason: unknown) => void;
  }> = [];
  const settlements: Array<WorkPoolSettlement<R>> = [];
  const drainWaiters: Array<{
    resolve: (value: Array<WorkPoolSettlement<R>>) => void;
    reject: (reason: unknown) => void;
  }> = [];
  let active = 0;
  let submitted = 0;
  let firstError: unknown = null;
  let closed = false;

  const maybeDrain = () => {
    if (active > 0 || queue.length > 0) return;
    if (settlements.length < submitted) return;
    const waiters = drainWaiters.splice(0);
    for (const waiter of waiters) {
      if (opts.failFast && firstError) {
        waiter.reject(firstError);
      } else {
        waiter.resolve([...settlements]);
      }
    }
  };

  const pump = () => {
    while (active < concurrency && queue.length > 0) {
      const job = queue.shift();
      if (!job) continue;
      active += 1;
      Promise.resolve()
        .then(() => {
          if (opts.signal?.aborted) {
            throw opts.signal.reason || new Error("Work pool aborted.");
          }
          return opts.work(job.item, opts.signal);
        })
        .then((value) => {
          settlements.push({ status: "fulfilled", value });
          job.resolve(value);
        })
        .catch((reason) => {
          if (!firstError) firstError = reason;
          settlements.push({ status: "rejected", reason });
          job.reject(reason);
        })
        .finally(() => {
          active -= 1;
          pump();
          maybeDrain();
        });
    }
    maybeDrain();
  };

  return {
    submit(item: T): Promise<R> {
      if (closed) {
        return Promise.reject(new Error("Work pool is closed."));
      }
      submitted += 1;
      return new Promise<R>((resolve, reject) => {
        queue.push({ item, resolve, reject });
        pump();
      });
    },
    drain(): Promise<Array<WorkPoolSettlement<R>>> {
      closed = true;
      pump();
      return new Promise((resolve, reject) => {
        drainWaiters.push({ resolve, reject });
        maybeDrain();
      });
    },
  };
}
