# Phase 2 — Onboarding, progress and error UX

> *Goal: a first-time user runs `slashcash onboard` and is walked, step by step, from a blank machine to a green system. They see what's happening at every moment, they can re-run safely, and when something goes wrong they get a one-line symptom, a one-line cause, and the one command that fixes it.*

## Status

- **Shipped.** Phase 1/2 leak cleanup + architectural smell gate, `doctor --quick` / `--json` + standardised `error[<area>]: symptom / cause: … / fix: … / docs: …` block, skill-driven cron registry (mutex-keyed, `skills:changed` event), `reference/cli.md` / `reference/config.md` / `reference/decisions.md` (ADR-018, ADR-019) in sync with behaviour, the `slashcash privacy` command, and the `packages/cli/src/privacy/copy.ts` single-source-of-truth.
- **Superseded by [`pivot-imap.md`](./pivot-imap.md).** The onboarding wizard rewrite (step pipeline around `@clack/prompts`) and the `gws`/`gcloud` error classifier are folded into pivot stages B1–B4. The ADR-023 privacy copy wired through `gws`/`gcloud` consent moments is rewritten for the IMAP surface by B4.

## Pending — hand to next agent

One item survives: the clean-machine cancellation recovery. It's architecture-neutral — it verifies the runner / progress / doctor-resume pipeline, not the `gws` path — and carries across to the new IMAP wizard.

- [!] Kill `slashcash onboard` mid-`ollama pull`, confirm the wizard exits non-zero with the cancellation message, then run `slashcash doctor --fix` and confirm it finishes the pull and lands green.
  - *Blocked on a disposable clean macOS machine (maintainer machines already have Ollama state).*

The live-Google failure-mode matrix, the clean-machine full-onboard, and the mid-`gws auth setup` cancel path that used to live here are all retired under ADR-024; they do not come back. The IMAP-surface equivalents live in [`pivot-imap.md`](./pivot-imap.md) § P6.

## Verification

```bash
pnpm --filter slashcash typecheck
pnpm --filter slashcash test
pnpm e2e:phase-3
pnpm architecture-smells
```
