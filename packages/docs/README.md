# slashcash — Plan & Reference

This package is the single source of truth for the **slashcash** local-first, single-user CLI that runs the existing dashboard on a user's machine, reads Gmail over IMAP with a user-issued app password (ADR-024), extracts Swiggy invoices with local deterministic Python libraries, optionally talks to a configured chat provider for the assistant, and stores everything in a local SQLite file.

This is a **fully local** product. There is no dual-run mode and no cloud fallback. The hosted app at `app.slash.cash` is being retired; the marketing site at `slash.cash` is updated when the CLI reaches feature parity to point at it. See ADR-013 in [`reference/decisions.md`](./reference/decisions.md).

## How to read this

Read in order on your first pass:

1. [`vision.md`](./vision.md) — _Why we are doing this and the product principles._
2. [`current-state.md`](./current-state.md) — _What ships today, the retired-phase summary, and the pre-pivot snapshot kept for historical context._
3. [`architecture.md`](./architecture.md) — _Target topology, process model, data flow, config layout — including deterministic Python-backed Swiggy extraction._
4. [`roadmap/pdf-extractor.md`](./roadmap/pdf-extractor.md) — **Active execution plan index** (2026-04-26). Splits the pivot into [`phase-1.md`](./roadmap/phase-1.md) (deterministic Python extractor), [`phase-2.md`](./roadmap/phase-2.md) (remove AI from ingest), [`phase-3.md`](./roadmap/phase-3.md) (parallel sync), [`phase-4.md`](./roadmap/phase-4.md) (fast onboarding + post-onboarding assistant setup), and [`phase-5.md`](./roadmap/phase-5.md) (fixtures, dogfood, cleanup).

> **Retired on 2026-04-23.** The five roadmap files that drove the hosted → local-first migration (`phase-1.md` … `phase-4.md`, `pivot-imap.md`) shipped and were deleted on this date. Their one-line summaries live in the "Retired phase docs" section of [`current-state.md`](./current-state.md); their full history is reachable via `git log -- packages/docs/roadmap/<file>`. A fresh chat should pick up `roadmap/pdf-extractor.md` and work it top to bottom.

Then dip into reference as needed:

- [`reference/cli.md`](./reference/cli.md) — Full CLI command surface.
- [`reference/config.md`](./reference/config.md) — `~/.slashcash/` layout and config schema.
- [`reference/skills.md`](./reference/skills.md) — How a `slashcash` skill is structured on disk.
- [`reference/env-vars.md`](./reference/env-vars.md) — Exhaustive env-var matrix.
- [`reference/file-changes.md`](./reference/file-changes.md) — Per-file change list (historical + PDF-extractor addendum).
- [`reference/testing.md`](./reference/testing.md) — Testing philosophy and the end-to-end gate for each phase.
- [`reference/decisions.md`](./reference/decisions.md) — ADR-style decisions captured during planning.
- [`reference/glossary.md`](./reference/glossary.md) — Terminology.

## Standing conventions

Two rules apply across every workstream. They are called out in each active roadmap file so they don't get lost:

- **Continuously learn from `../openclaw`.** The openclaw repo (sibling checkout at `../openclaw`) is a mature CLI with patterns we trust: entry shim, lazy command catalog, doctor repair sequencing, state-directory conventions, schema validation at external boundaries, closed-code `Result` returns, prompt-cache stability, skill folder format. When a design question has a proven answer there, adopt the **pattern**. Never copy code.
- **End to end after every stage.** A stage is not done until the scenario in [`reference/testing.md`](./reference/testing.md) passes from a clean state on a real machine for the feature it introduces. Unit tests are a permanent baseline; the E2E scenario is the merge gate.

## Folder shape

```
packages/docs/
├── README.md              ← you are here
├── vision.md              ← the "why"
├── current-state.md       ← what ships today + retired-phase summary
├── architecture.md        ← the target
├── roadmap/
│   ├── pdf-extractor.md   ← ACTIVE plan index (deterministic Swiggy ingest)
│   ├── phase-1.md         ← Lock the deterministic Python extractor
│   ├── phase-2.md         ← Remove AI from ingestion
│   ├── phase-3.md         ← Parallelize IMAP / PDF / writes
│   ├── phase-4.md         ← Fast onboarding + assistant provider setup
│   └── phase-5.md         ← Fixtures, golden tests, dogfood, cleanup
└── reference/
    ├── cli.md
    ├── config.md
    ├── skills.md
    ├── env-vars.md
    ├── file-changes.md
    ├── testing.md
    ├── decisions.md
    └── glossary.md
```

## Status legend

Throughout the docs:

- `[ ]` — not started
- `[~]` — in progress
- `[x]` — done
- `[!]` — blocked / needs decision

## Convention

When citing files in this monorepo, paths are **repo-root relative** (e.g. `apps/main/trpc/init.ts`). When citing patterns from the reference repo we borrow from, the prefix `openclaw:` is used (e.g. `openclaw:src/entry.ts`).
