# slashcash — Plan & Reference

This package is the single source of truth for the **slashcash** pivot: from a hosted SaaS at `slash.cash` / `app.slash.cash` to a **local-first, single-user CLI** that runs the existing dashboard on a user's machine, talks to a local LLM via Ollama, reads Gmail through the [`gws`](https://github.com/googleworkspace/cli) Google Workspace CLI, and stores everything in a local SQLite file.

This is a **fully local** pivot. There is no dual-run mode and no cloud fallback. The hosted app at `app.slash.cash` is being retired; the marketing site at `slash.cash` is updated at the end of Phase 2 to point at the CLI. See ADR-013 in [`reference/decisions.md`](./reference/decisions.md).

## How to read this

Read in order on your first pass:

1. [`vision.md`](./vision.md) — *Why we are doing this and the product principles.*
2. [`current-state.md`](./current-state.md) — *What exists today, every cloud coupling, every file that will move.*
3. [`architecture.md`](./architecture.md) — *Target topology, process model, data flow, config layout.*
4. [`roadmap/phase-1.md`](./roadmap/phase-1.md) — *Phase 1 — Foundation. The CLI skeleton, SQLite swap, local auth, AI provider swap.*
5. [`roadmap/phase-2.md`](./roadmap/phase-2.md) — *Phase 2 — Local-first feature parity. gws Gmail ingress, node-cron, analytics rewrite, attachments, skills.*

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
├── current-state.md       ← snapshot of today
├── architecture.md        ← the target
├── roadmap/
│   ├── phase-1.md         ← Foundation
│   └── phase-2.md         ← Local-first parity
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
