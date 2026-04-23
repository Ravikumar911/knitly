# Phase 2 — Onboarding, progress and error UX

> _Goal: a first-time user runs `slashcash onboard` and is walked, step by step, from a blank machine to a green system. They see what's happening at every moment, they can re-run safely, and when something goes wrong they get a one-line symptom, a one-line cause, and the one command that fixes it._

## Status

- **Shipped.** Phase 1/2 leak cleanup + architectural smell gate, `doctor --quick` / `--json` + standardised `error[<area>]: symptom / cause: … / fix: … / docs: …` block, skill-driven cron registry (mutex-keyed, `skills:changed` event), `reference/cli.md` / `reference/config.md` / `reference/decisions.md` in sync with behaviour, the `slashcash privacy` command, the `@clack/prompts` onboarding wizard, the IMAP credential flow, and the rewritten IMAP privacy copy.
- **Only manual dogfood remains.** The former wizard/auth gap is closed in repo code; the remaining work in this phase is clean-machine cancellation recovery on a disposable macOS box.

## Pending — hand to next agent

One item survives: the clean-machine cancellation recovery. It's architecture-neutral — it verifies the runner / progress / doctor-resume pipeline, not the `gws` path — and carries across to the new IMAP wizard.

- [!] Kill `slashcash onboard` mid-`ollama pull`, confirm the wizard exits non-zero with the cancellation message, then run `slashcash doctor --fix` and confirm it finishes the pull and lands green.
  - _Blocked on a disposable clean macOS machine (maintainer machines already have Ollama state)._

The live-Google failure-mode matrix, the clean-machine full-onboard, and the mid-`gws auth setup` cancel path that used to live here are all retired under ADR-024; they do not come back. The IMAP-surface equivalents live in [`pivot-imap.md`](./pivot-imap.md) § P6.

## Verification

```bash
pnpm --filter slashcash typecheck
pnpm --filter slashcash test
pnpm e2e:phase-3
pnpm architecture-smells
```
