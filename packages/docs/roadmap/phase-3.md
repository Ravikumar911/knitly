# Phase 3 — The full testing pyramid

> _Goal: every layer of [`../reference/testing.md`](../reference/testing.md) actually exists. Unit covers each package, integration covers every boundary module, E2E covers every user-visible flow. CI runs all three layers on every push, fails on coverage regression, runs on a Node version matrix. Tests next to the code, integration tests for the seams, end-to-end tests that exercise the binary the user runs._

## Status

- **Shipped.** Shared Vitest infrastructure at `packages/typescript-config/vitest.base.ts`, per-package `vitest.config.ts` in `packages/cli`, `packages/tasks`, `packages/database`, `packages/ui`, `apps/main`, smoke unit tests in those five packages, v8 coverage via `test:coverage` (with isolated temp `SLASHCASH_HOME` / `SQLITE_DB_PATH` global setup), `packages/e2e-tests/architecture-smells.test.ts` with forbidden-import / forbidden-directory / forbidden-DB / forbidden-env rules wired into `pnpm architecture-smells`, `pnpm fixtures:check`, a `phase-4.ts` meta scenario that runs the five package Vitest suites, the PR / nightly / release workflow scaffolding, `e2e:phase-1`..`e2e:phase-5` runners, customer-journey Playwright coverage (`dashboard.spec.ts`, `transactions.spec.ts`, `assistant-feedback.spec.ts`) that boots the app through `slashcash start`, and the IMAP boundary integration spec at `packages/tasks/src/gmail/imap-client.integration.test.ts`.

## Pending — hand to next agent

- [!] Enforce the real coverage floors: **80%** for `packages/cli`, `packages/database`, `packages/tasks`; **70%** for `apps/main`; **60%** for `packages/ui`. Fail CI on regression.
  - _Blocked on the integration-spec and analytics-snapshot work below. Measured baseline on 2026-04-18: `slashcash` 9.85%, `@workspace/tasks` 8.69%, `@workspace/database` 9.09%, `@workspace/ui` 0.03%, `@knitly/main` 1.67%. Flipping the floors now without the test work makes CI permanently red._
- [ ] Land the remaining boundary integration specs named in W3 of the original plan: Ollama provider (`packages/cli/src/runtime/ollama.integration.test.ts`), doctor pipeline (`packages/cli/src/doctor/run.integration.test.ts`), cron single-flight mutex (`packages/tasks/src/runtime/mutex.integration.test.ts`), attachment-serving route (`apps/main/app/api/attachments/[id]/route.integration.test.ts`), skill registry (`packages/cli/src/skills/registry.integration.test.ts`), assistant route (`apps/main/app/api/assistant/route.integration.test.ts`), CLI error formatter (`packages/cli/src/errors/format.integration.test.ts`), skill jobs registry (`packages/cli/src/skills/jobs.integration.test.ts`).
- [ ] Pin each analytics procedure's output to a snapshot under `packages/database/test-fixtures/analytics/`; iterate every export of `queries/insights/swiggyAnalytics.ts` in a single snapshot test file; fail CI on uncommitted snapshot changes.
- [ ] Extend `architecture-smells.test.ts` with the two rules that are not yet covered: an AST-walk (`ts-morph`) asserting every CLI-reachable `throw` / `console.error` goes through a registered error class (`OnboardError`, `GwsError`/`ImapError`, `DoctorError`, `RuntimeError`), and the `--help` ↔ `reference/cli.md` parity check.
- [ ] Add the W9 stretch items where they pay off: property-based classifier test with `fast-check`, manifest-schema contract test, mutation run on `queries/insights/` via Stryker.
- [ ] Configure GitHub branch protection on `main` so every `pr.yml` job is required. Today `pr.yml` only runs `smells`, `lint-and-types`, `unit`, and `phase-1-e2e`; integration / Playwright / `e2e-phase-3` / `e2e-phase-4` jobs need to be added and then required.

## Verification

```bash
pnpm --filter slashcash --filter @workspace/tasks --filter @workspace/database --filter @workspace/ui --filter @knitly/main test
pnpm --filter slashcash --filter @workspace/tasks --filter @workspace/database --filter @workspace/ui --filter @knitly/main test:coverage
pnpm architecture-smells
pnpm fixtures:check
pnpm --filter @workspace/e2e-tests test        # Playwright
pnpm e2e:all
```

## Out of scope

Cross-platform matrix (Linux, Windows) for unit and E2E stays out per ADR-007 / ADR-008. Phase 3 only adds Linux smell tests as an early-warning. Performance benchmarks and security scans live in Phase 4.
