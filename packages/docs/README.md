# slashcash — Plan & Reference

This package is the single source of truth for the **slashcash** pivot: from a hosted SaaS at `slash.cash` / `app.slash.cash` to a **local-first, single-user CLI** that runs the existing dashboard on a user's machine, talks to a local LLM via Ollama, reads Gmail through the [`gws`](https://github.com/googleworkspace/cli) Google Workspace CLI, and stores everything in a local SQLite file.

The hosted app stays alive in **dual-run** mode (the same monorepo ships both a hosted build and a local build) until the local CLI reaches feature parity.

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
- [`reference/decisions.md`](./reference/decisions.md) — ADR-style decisions captured during planning.
- [`reference/glossary.md`](./reference/glossary.md) — Terminology.

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
