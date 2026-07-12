# Research: How do we extract onboard logic without the CLI command?

**Ticket:** [How do we extract onboard logic without the CLI command?](https://github.com/Ravikumar911/knitly/issues/71)  
**Map:** [Desktop becomes primary distribution](https://github.com/Ravikumar911/knitly/issues/67)  
**Blocked by:** #70 (sequence) — this note assumes full CLI parity in desktop UI and doctor stays CLI-only for v1.

## Recommendation (decision)

1. **Extract a headless onboard pipeline** from `packages/cli/src/onboard/run.ts` into **`@workspace/tasks`** (e.g. `packages/tasks/src/onboard/`), with:
   - the existing `Step` detect → install → verify shape
   - an injectable **UI port** (prompts/select/password/spinner/note) — no `@clack/prompts` in the library
   - side effects (Homebrew, Ollama, Keychain, IMAP verify, python env, kickoff sync) staying in the library

2. **Expose it to the desktop UI via tRPC** in `apps/main` (`onboard` router): status + run-step / submit-answer mutations. The Next server already runs as Node under `slashcash server run` and `@knitly/main` already depends on `@workspace/tasks` + `keytar` — **do not** add an `apps/main` → `slashcash` dependency (circular with the CLI bundle).

3. **Delete** the `slashcash onboard` command and its registry wiring. Keep doctor as a separate CLI surface for v1 (not deleted here).

4. **Gate the product**: if onboard incomplete, dashboard routes redirect to `/onboard` wizard UI that drives the tRPC steps in the sequence from #70.

## Why not keep logic in `packages/cli` only?

The CLI package **bundles** `@knitly/main`. Importing `slashcash` from `apps/main` for onboard creates a cycle and fights workspace boundaries. `@workspace/tasks` is already the home for machine-side ingest/setup work the dashboard server can call.

## Module sketch

```text
packages/tasks/src/onboard/
  types.ts          # Step, OnboardContext, UiPort
  pipeline.ts       # runPipeline / listSteps / getStatus
  steps/*.ts        # welcome, assistant, homebrew, … (moved from CLI)
  index.ts

apps/main/trpc/routers/onboard.ts
  status.query()
  currentStep.query()
  answer.mutation()   # advances one interactive step
  runAuto.mutation()  # runs non-interactive detect/install steps

apps/main/app/.../onboard/  # wizard UI
```

CLI: remove `register onboard`; optionally re-export nothing.

## Testing seam

Highest seam: **headless pipeline with a fake UiPort** (unit tests in `packages/tasks`) + tRPC procedure tests / e2e that complete Gmail steps against fixtures. Prefer not testing Electron for onboard logic.

## Answer in one line

**Move headless onboard steps to `@workspace/tasks` with an injectable UI port; drive them from an `onboard` tRPC router + `/onboard` UI; delete the CLI command; no `apps/main`→`slashcash` import.**
