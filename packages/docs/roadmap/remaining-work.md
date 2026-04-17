# Remaining work — phase-by-phase

> Snapshot after the Phase 3/4/5 implementation pass. This file separates what is implemented in the repo from what still needs real-machine, external-service, or deeper-test follow-up. Use this as the handoff checklist for the next implementation chat.

## Phase 1 — Local-first foundation

**Repo status.** The source pivot is in place and the fixture-backed Phase 1 E2E passes.

**Pending.**

- Run Phase 1 on a real clean macOS machine without `SLASHCASH_DOCTOR_SKIP_OLLAMA=1`.
- Verify the assistant stream against a real local Ollama model, not the skipped fixture path.
- Confirm no hidden hosted/auth leftovers after a production build, not just source smell checks.

## Phase 2 — Gmail ingest and local data

**Repo status.** The fixture-backed Gmail ingest, local attachment route, skill toggle, and Phase 2 E2E pass.

**Pending.**

- Run real `gws auth login` with a dedicated Google account.
- Sync against a real deterministic Swiggy inbox, not `SLASHCASH_GWS_FIXTURE_DIR`.
- Run extraction without `SLASHCASH_SYNC_SKIP_AI=1`, using the real local model.
- Verify cron ticks ingest real mail over time, not only manual `slashcash sync --full`.
- Ask the assistant a real Swiggy analytics question after ingest and verify the numeric answer.

## Phase 3 — Onboarding, progress and error UX

**Repo status.** The onboarding wizard, progress output, single model prompt, hidden E2E flags, `gws` diagnostics, doctor `--quick` / `--json`, and Phase 3 E2E are implemented.

**Pending.**

- Run real blank-machine `slashcash onboard`: Homebrew, Ollama, model pull, `gws`, auth, DB, bundled skill install.
- Kill onboard during a real `ollama pull`, then confirm `slashcash doctor --fix` resumes cleanly.
- Exercise real `gws` auth failures where possible: `invalid_client`, `access_denied`, `redirect_uri_mismatch`.
- Add or strengthen exact `--help` output versus `reference/cli.md` parity testing.

## Phase 4 — Full testing pyramid

**Repo status.** Lightweight package tests, fixture checks, architecture smell gate, PR/nightly workflow scaffolding, and the Phase 4 meta scenario are wired.

**Pending.**

- Full Vitest setup across packages with shared config and coverage thresholds.
- Real coverage gates: 80% for CLI/database/tasks, 70% for app, 60% for UI.
- Boundary integration tests for every promised area: Ollama provider, doctor pipeline, attachment route, assistant route, skill registry, CLI error formatter, cron/mutex.
- Analytics snapshot tests for every analytics query.
- Expanded Playwright UI E2E for dashboard, transaction filters, assistant streaming UI, PDF viewer, and settings.
- Mutation, property, and contract tests from Phase 4 W9.
- Make required GitHub branch protection match the `pr.yml` checks.

## Phase 5 — Release, packaging, observability

**Repo status.** Release workflow, eval gate, logs command, structured log rotation, bundle check, perf harness, local pack path, and bundled-server smoke path are implemented.

**Pending.**

- Push a real version tag and run the GitHub release workflow with `NPM_TOKEN`.
- Confirm npm provenance, SBOM upload, checksum upload, and published package smoke in GitHub.
- Run `npm i -g slashcash@<version>` on a clean macOS machine and complete onboard from the published package.
- Replace fixture eval threshold with a real baseline from model runs on real or approved data.
- Add hard dashboard SSR and assistant first-token performance gates; current bench covers CLI/dev paths.
- Document and check package verification instructions for users after the first release.
- DNS/decommission outside the repo: point `slash.cash` to the CLI story, shut down or redirect `app.slash.cash`, and clean hosted infra.

## Cross-cutting handoff

- Stage and commit the current implementation before starting the next phase-fix pass.
- Decide whether to clean existing Next lint warnings. They do not fail `pnpm lint`, but they add noise.
- Run one final real-world dogfood pass before calling v1 done.

## Useful verification commands

The fixture/local gates that were green at this handoff:

```bash
pnpm typecheck
pnpm lint
pnpm architecture-smells
pnpm fixtures:check
pnpm --filter slashcash test
pnpm --filter @workspace/tasks test
pnpm --filter @workspace/database test
pnpm e2e:phase-1
pnpm e2e:phase-2
pnpm e2e:phase-3
pnpm e2e:phase-4
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm e2e:phase-5
pnpm pack:local
```

Some of those commands need fixture or skip environment variables on machines without Ollama or a real `gws` account; see `reference/env-vars.md` and `reference/testing.md`.
