---
name: cursor-rules-meta
description: Maintain repo agent instructions in AGENTS.md and .agents/skills without Cursor-specific .mdc sprawl. Use when updating coding standards or migrating from editor-only rules.
---

# Maintain agent instructions (tool-agnostic)

## Single source of truth

- **Root** [`AGENTS.md`](../../../AGENTS.md) — repository-wide rules for Cursor, Claude Code, Codex, and other agents (includes **Agent workflow** — size-gated Matt Pocock SDLC).
- **`CLAUDE.md`** — symlink to `AGENTS.md` so Claude Code reads the same file.
- **Scoped** [`apps/main/AGENTS.md`](../../../apps/main/AGENTS.md) for deep, path-specific guidance.
- **Skills** — `.agents/skills/<skill>/SKILL.md` for reusable workflows (with YAML frontmatter: `name`, `description`).
- **Tracker / domain config** — `docs/agents/*.md` (written by `/setup-matt-pocock-skills`).

## When to update what

| Change                                        | Update                                        |
| --------------------------------------------- | --------------------------------------------- |
| New package or boundary                       | `AGENTS.md` architecture section              |
| Default coding workflow (grill / wayfinder)   | `AGENTS.md` **Agent workflow** section        |
| App-only Next/tRPC/AI pattern                 | `apps/main/AGENTS.md`                         |
| Repeatable workflow (PR checklist, migration) | New or existing skill under `.agents/skills/` |

## Conventions for skills

- One directory per skill: `.agents/skills/<kebab-name>/SKILL.md`.
- Frontmatter `description` should say **when** to load the skill (tool discovery).
- Keep skills DRY — link to `AGENTS.md` instead of duplicating repo maps.

## Do not

- Reintroduce a large `.cursor/rules/*.mdc` tree for general guidance — use `AGENTS.md` + skills.
- Document Supabase, Trigger.dev, or other stacks we do not use unless the project explicitly adopts them.

## Claude Code symlink

`.claude/skills` → `../.agents/skills` so Claude shares the same skill folders as the repo.
