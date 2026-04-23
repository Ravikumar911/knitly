# Phase 1 — Local-first feature parity

> _Goal: a user on a clean macOS box runs `npm i -g slashcash`, then `slashcash onboard`, then `slashcash start`, and ends up with the full Swiggy analytics and chat assistant experience, powered by their own Gmail and their own machine — with no outbound traffic outside their laptop after `onboard` finishes._

## Status

- **Shipped against fixtures.** Cron + single-flight mutex, PDF attachment storage + serving route, Swiggy analytics on SQLite (typed Drizzle tools; no raw SQL from the assistant), Ollama vision parsing path, skills registry v1 (bundled `gmail-swiggy`, `skills list/enable/disable`), packaging / release workflow scaffolding, expanded doctor surface, and evals-as-a-gate wiring.
- **Shipped through [`pivot-imap.md`](./pivot-imap.md).** The onboarding wizard, IMAP client + credential store, privacy copy rewrite, and fixture-backed IMAP E2E all landed through pivot stages P1-P5. Do not reopen the retired mailbox-tooling path here.

## Pending — hand to next agent

Fixture-backed gates are green (`pnpm e2e:phase-2`, local attachments route, skill toggle, analytics snapshots against seed). Real-account dogfood remaining:

- [ ] Run extraction without `SLASHCASH_SYNC_SKIP_AI=1`, using a real local Ollama model.
- [ ] Verify cron ticks ingest real mail over time (not only manual `slashcash sync --full`).
- [ ] Ask the assistant a real Swiggy analytics question after ingest and verify the numeric answer matches what the snapshot-backed analytics return.

The equivalent live-account Gmail dogfood under the IMAP path lives in [`pivot-imap.md`](./pivot-imap.md) § P6; do that there, not here.

## Verification

```bash
pnpm e2e:phase-2
pnpm --filter @workspace/tasks test
pnpm --filter @workspace/database test
pnpm architecture-smells
pnpm fixtures:check
```
