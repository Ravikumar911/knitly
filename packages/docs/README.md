# slashcash — Plan & Reference

This package is the single source of truth for the **slashcash** pivot: from a hosted SaaS at `slash.cash` / `app.slash.cash` to a **local-first, single-user CLI** that runs the existing dashboard on a user's machine, talks to a local LLM via Ollama, reads Gmail over IMAP with a user-issued app password (see ADR-024), and stores everything in a local SQLite file.

This is a **fully local** pivot. There is no dual-run mode and no cloud fallback. The hosted app at `app.slash.cash` is being retired; the marketing site at `slash.cash` is updated when the CLI reaches feature parity to point at it. See ADR-013 in [`reference/decisions.md`](./reference/decisions.md).

## How to read this

Read in order on your first pass:

1. [`vision.md`](./vision.md) — *Why we are doing this and the product principles.*
2. [`current-state.md`](./current-state.md) — *What exists today, every cloud coupling, every file that moved, and the retired-phase summary.*
3. [`architecture.md`](./architecture.md) — *Target topology, process model, data flow, config layout.*
4. [`roadmap/pivot-imap.md`](./roadmap/pivot-imap.md) — **Active execution plan** (2026-04-22). Gmail access pivots from `gws`/`gcloud` to IMAP + app password; onboarding rebases onto an interactive `@clack/prompts` wizard.
5. [`roadmap/phase-1.md`](./roadmap/phase-1.md) — *Phase 1 — Local-first feature parity. Real-account dogfood items; fixture-backed workstreams already shipped.*
6. [`roadmap/phase-2.md`](./roadmap/phase-2.md) — *Phase 2 — Onboarding, progress and error UX. One remaining clean-machine cancel-recovery item; wizard rewrite owned by `pivot-imap.md`.*
7. [`roadmap/phase-3.md`](./roadmap/phase-3.md) — *Phase 3 — The full testing pyramid. Coverage floors, boundary integration specs, analytics snapshots, smell-test extensions.*
8. [`roadmap/phase-4.md`](./roadmap/phase-4.md) — *Phase 4 — Release, packaging, observability, docs polish. Real tag release, clean-machine publish verify, real eval threshold, server-side perf gates.*

> **Retired on 2026-04-22.** The original Phase 1 (Foundation: Supabase/Trigger/remote-AI rip-out, Postgres → SQLite, loopback dashboard, CLI skeleton) and the Phase 1/2 boundary audit shipped and were deleted; surviving items live under "Phase 1 — retired" in [`current-state.md`](./current-state.md). The remaining roadmap was then renumbered: old phase-2 → phase-1, old phase-3 → phase-2, old phase-4 → phase-3, old phase-5 → phase-4. Older text elsewhere in this doc set still uses the original numbering where it was naming workstreams ("Phase 2 W10", "Phase 3 W1", etc.); those are plan identifiers, not file paths, and they remain meaningful against git history.

Each phase doc now contains only the `## Pending — hand to next agent` items (shipped history lives in git). A fresh chat can pick up any phase doc (or `pivot-imap.md`) and work the list from top to bottom.

Then dip into reference as needed:

- [`reference/cli.md`](./reference/cli.md) — Full CLI command surface.
- [`reference/config.md`](./reference/config.md) — `~/.slashcash/` layout and config schema.
- [`reference/skills.md`](./reference/skills.md) — How a `slashcash` skill is structured on disk.
- [`reference/env-vars.md`](./reference/env-vars.md) — Exhaustive env-var matrix (hosted vs local).
- [`reference/file-changes.md`](./reference/file-changes.md) — Per-file change list (the swap list).
- [`reference/testing.md`](./reference/testing.md) — Testing philosophy and the end-to-end gate for each phase.
- [`reference/decisions.md`](./reference/decisions.md) — ADR-style decisions captured during planning.
- [`reference/glossary.md`](./reference/glossary.md) — Terminology.

## Standing conventions

Two rules apply across every phase and every workstream. They are called out again in each phase doc so they don't get lost:

- **Continuously learn from `../openclaw`.** The openclaw repo (sibling checkout at `../openclaw`) is a mature CLI with patterns we trust: entry shim, lazy command catalog, doctor repair sequencing, state-directory conventions, schema validation at external boundaries, closed-code `Result` returns, prompt-cache stability, skill folder format. When a design question has a proven answer there, adopt the **pattern**. Never copy code.
- **End to end after every phase.** A phase is not done until the scenario in [`reference/testing.md`](./reference/testing.md) passes from a clean state on a real machine. Unit tests are a permanent baseline; the E2E scenario is the merge gate.

## Folder shape

```
packages/docs/
├── README.md              ← you are here
├── vision.md              ← the "why"
├── current-state.md       ← snapshot of today + retired-phase summary
├── architecture.md        ← the target
├── roadmap/
│   ├── pivot-imap.md      ← ACTIVE execution plan (IMAP + interactive wizard)
│   ├── phase-1.md         ← Local-first parity — Pending items
│   ├── phase-2.md         ← Onboarding, progress, error UX — Pending items
│   ├── phase-3.md         ← Full testing pyramid — Pending items
│   └── phase-4.md         ← Release, packaging, observability — Pending items
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
