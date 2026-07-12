# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, when it exists (created lazily by `/domain-modeling` via `/grill-with-docs`).
- **`packages/docs/reference/glossary.md`** — existing product glossary.
- **`packages/docs/reference/decisions.md`** — existing ADRs (ADR-001…).
- **`docs/adr/`** — additional ADRs written by `/domain-modeling` when that layout is used; read any that touch the area you're about to work in.

If `CONTEXT.md` or `docs/adr/` don't exist yet, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. `/domain-modeling` creates them lazily when terms or decisions actually get resolved. Always prefer the existing `packages/docs/reference/` sources when present.

## File structure

Single-context layout for this monorepo:

```
/
├── CONTEXT.md                          ← optional; built by /grill-with-docs
├── docs/
│   ├── agents/                         ← tracker + domain consumer rules
│   └── adr/                            ← optional new ADRs from domain-modeling
└── packages/docs/reference/
    ├── glossary.md                     ← existing glossary
    └── decisions.md                    ← existing ADRs
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md` or `packages/docs/reference/glossary.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR (in `packages/docs/reference/decisions.md` or `docs/adr/`), surface it explicitly rather than silently overriding:

> _Contradicts ADR-024 (IMAP app password) — but worth reopening because…_
