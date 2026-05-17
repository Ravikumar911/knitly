# Phase 3 — Parallelize IMAP, extraction, and writes

> _Phase 3 of 5 in the Swiggy ingest pivot. Depends on [`phase-1.md`](./phase-1.md) and [`phase-2.md`](./phase-2.md). Read [`pdf-extractor.md`](./pdf-extractor.md) first._ > _Status: Shipped. Owner: codex._

## Goal

A 365-day Swiggy sync (`from:(swiggy.in) newer_than:365d`) for a normal personal mailbox completes in **under 20 seconds end-to-end** on a developer machine, including IMAP fetch, PDF subprocess extraction, deterministic mapping, and SQLite writes. SQLite stays consistent and Gmail is not abused.

This phase is **only about parallelism**. It does not change extraction logic.

## Performance target

- **Hard target**: 1-year Swiggy sync (~hundreds of messages, mix of transactional and promotional) completes in `< 20s` from `runEmailSync` start to finish on a 4-core developer laptop with the venv warm.
- **Stretch target**: `< 10s` for the same workload.
- **Floor**: deterministic — every message produces exactly one outcome (`processed`, `skipped_existing`, `skipped_non_transaction`, or `failed`).

If the target is not met after Phase 3 ships, file a follow-up issue with bench numbers; do not regress correctness to chase the number.

## Parallelism model

One sync run, three bounded stages connected by async queues. The stages run concurrently on the same Node event loop; PDF subprocesses are the only thing spawned outside Node.

```
┌──────────────┐     ┌────────────────┐     ┌─────────────────┐     ┌────────────────┐
│  IMAP fetch  │ ──> │ Attachment FS  │ ──> │ PDF + body      │ ──> │ SQLite write   │
│  (concurrent │     │ write          │     │ extraction      │     │ (single writer)│
│  by message) │     │ (per message)  │     │ (concurrent     │     │                │
│              │     │                │     │ subprocesses)   │     │                │
└──────────────┘     └────────────────┘     └─────────────────┘     └────────────────┘
       ▲                                                                     │
       └─────────── progress + outcome classification ───────────────────────┘
```

### Concurrency knobs and defaults

Add these env knobs (and config fields under `sync.concurrency` in `~/.slashcash/config.json`):

| Knob                                 | Default                          | Notes                                                                                                       |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SLASHCASH_SYNC_FETCH_CONCURRENCY`   | `4`                              | Max in-flight IMAP `fetchOne` calls. `imapflow` serializes per-mailbox, so this is bounded by Gmail anyway. |
| `SLASHCASH_SYNC_EXTRACT_CONCURRENCY` | `min(4, os.cpus().length - 1)`   | Max parallel `python -m slashcash_pdf_extractor` subprocesses.                                              |
| `SLASHCASH_SYNC_WRITE_CONCURRENCY`   | `1`                              | Always 1 in v1; SQLite is a single writer with `better-sqlite3`.                                            |
| `SLASHCASH_SYNC_MAX_MESSAGES`        | unset (= unlimited for `--full`) | Existing limit; behavior unchanged.                                                                         |
| `SLASHCASH_SYNC_PDF_TIMEOUT_MS`      | `30000`                          | Per-PDF subprocess timeout (existing, surfaced explicitly).                                                 |

All knobs are documented in `packages/docs/reference/env-vars.md` after this phase.

## Work items

### 3.1 Bounded concurrency helper

Create `packages/tasks/src/runtime/pool.ts`:

- Tiny in-repo implementation; do not add `p-limit` or similar deps.
- Exports `createWorkPool<T, R>(opts: { concurrency: number, work: (item: T) => Promise<R> })` returning an object with `submit(item)` (returns a `Promise<R>`) and `drain()` (resolves when all submitted work has settled).
- Each pool tracks in-flight count, queues submitted items, and starts the next item on settlement.

Tests:

- 100 work items, concurrency 5, all complete; max in-flight never exceeds 5.
- Worker rejection does not drop other queued items.
- `drain()` rejects with the first error if any worker threw and `failFast` is true; otherwise resolves with all settlement results.

### 3.2 Bulk "already processed" check

Add to `@workspace/database`:

```ts
export async function getProcessedEmailIds(
  userId: string,
  emailIds: string[],
): Promise<Set<string>>;
```

Replaces the per-message `isEmailProcessed(...)` call inside the loop. One DB roundtrip instead of N.

### 3.3 Stage the runner

Rewrite `packages/tasks/src/trigger/processEmails.ts` from the current sequential `for` loop into stages:

1. **List**. `listMessages(query, maxMessages)` → array of refs (unchanged).
2. **Filter**. Call `getProcessedEmailIds(userId, refs.map(r => r.id))`. Build the working set of new refs. Increment `skipped_existing` for the rest.
3. **Fetch + write attachments**. Use a fetch pool (`SLASHCASH_SYNC_FETCH_CONCURRENCY`) to call `fetchMessage(ref.id)` and persist attachments via `writeAttachmentFile`. As each message is fetched, push `{ ref, fetched, emailData }` into the extract queue.
4. **Extract**. Use an extract pool (`SLASHCASH_SYNC_EXTRACT_CONCURRENCY`) running the per-message extraction (`extractTransactionFromEmail` from Phase 1/2). The pool stages are independent; an extraction never blocks the next fetch.
5. **Write**. Funnel every successful extraction into a single-writer queue and call `storeEmailData` + `storeTransactionV2Input` + `updateEmailData` sequentially. Wrap related writes in a transaction (`db.transaction(...)`) so a partial failure does not leave a `parsed_emails` row without a `transactions_v2` row.
6. **Progress**. Update `email_sync_status.progress` after each terminal outcome (any of the four classifications). Existing `updateSyncProgress` works; just call it from the writer stage.

The single-flight mutex stays at the outer `runEmailSync` level. There is no parallelism across runs; only inside one run.

### 3.4 Outcome classification

Replace the current `processedCount / skippedCount / errorCount` counters with a single typed accumulator:

```ts
type SyncOutcome =
  | { kind: "processed"; messageId: string; transactionId: string }
  | { kind: "skipped_existing"; messageId: string }
  | { kind: "skipped_non_transaction"; messageId: string; reason: string }
  | { kind: "failed"; messageId: string; error: ImapError | ExtractionError };

type EmailSyncResult = {
  success: true;
  totalFound: number;
  outcomes: SyncOutcome[]; // for tests/audit
  counts: {
    processed: number;
    skipped_existing: number;
    skipped_non_transaction: number;
    failed: number;
  };
};
```

The CLI/tRPC layer formats `counts` for the user; tests assert on `outcomes`. Update the existing `EmailSyncResult` type and any consumers.

### 3.5 Cancellation and timeouts

- Pass an `AbortSignal` from `runEmailSync` down through the pools. `slashcash sync --cancel` (future feature) and process exit must drain cleanly.
- A single PDF subprocess timing out (`pdf-extractor-timeout`) classifies its message as `failed` and **does not** stop other in-flight work.
- A fatal IMAP credential error stops queueing new fetches but lets in-flight extractions finish and writes drain.

### 3.6 Bench harness

Add `packages/e2e-tests/bench/sync-1y.ts`:

- Builds a synthetic mailbox of 200 `.eml` fixtures (mix: 60% transactional with PDF, 30% body-only transactional, 10% promotion/newsletter).
- Runs `runEmailSync` with the IMAP fixture backend and the real Python venv.
- Records: total wall time, p50/p95/p99 per-message processing time, effective messages/sec, peak memory, peak in-flight subprocesses.
- Writes a JSON summary under `.artifacts/bench/sync-1y-<timestamp>.json` and a one-line console summary.
- Hooks into `pnpm bench`.

## Files touched (expected)

- `packages/tasks/src/runtime/pool.ts` (new)
- `packages/tasks/src/runtime/pool.test.ts` (new)
- `packages/tasks/src/trigger/processEmails.ts`
- `packages/tasks/src/trigger/processEmails.test.ts`
- `packages/database/src/queries/operations/emails.ts` (new `getProcessedEmailIds`)
- `packages/database/src/index.ts`
- `packages/cli/src/config/schema.ts` (sync.concurrency block)
- `packages/cli/src/config/runtime-env.ts` (env passthrough)
- `packages/docs/reference/env-vars.md`
- `packages/docs/reference/config.md`
- `packages/e2e-tests/bench/sync-1y.ts` (new)
- `packages/e2e-tests/fixtures/imap/` (add bench fixtures)

## Verification commands

```bash
pnpm --filter @workspace/tasks test --run pool
pnpm --filter @workspace/tasks test --run processEmails
pnpm --filter @workspace/database test
pnpm bench
SLASHCASH_IMAP_FIXTURE_DIR=packages/e2e-tests/fixtures/imap \
  pnpm --filter @workspace/tasks dev   # spot check
pnpm e2e:ingest
pnpm architecture-smells
pnpm typecheck
```

## Acceptance

- The bench harness runs the 200-fixture synthetic mailbox and reports total time. Target `< 20s`; record actual.
- Re-running `slashcash sync --full` against the same mailbox produces zero new transactions (idempotent).
- No `unhandledRejection` or `MaxListenersExceededWarning` during the bench run.
- `outcomes.length === totalFound` for every run; the four counts always sum to `totalFound`.
- Killing the bench process mid-run leaves SQLite in a queryable state (no `database is locked` errors on next start).
- `pnpm architecture-smells` passes (no chat-model imports under `packages/tasks/`).
- `pnpm e2e:ingest` passes with the new staged runner.

## Out of scope

- Onboarding flow (Phase 4).
- Adding new merchant providers.
- Switching SQLite away from `better-sqlite3` or introducing WAL multi-writer setups.
- Long-lived Python sidecar processes — v1 keeps `spawn` per PDF.
