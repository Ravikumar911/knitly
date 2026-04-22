# Pivot — IMAP + App Password + Interactive Wizard (active plan)

> *Revision date: 2026-04-22. This document supersedes the onboarding + Gmail access sections of what used to be Phase 2 and Phase 3 (now [`phase-1.md`](./phase-1.md) and [`phase-2.md`](./phase-2.md) after the 2026-04-22 renumbering). Other workstreams (SQLite migration, analytics rewrite, skills, doctor, release, evals) are not changed by this pivot and keep their original plans.*
> *This is the **active** plan. The next execution agent works from this file. The phase docs and ADR-004 / ADR-011 (gws/gcloud parts) / ADR-022 are kept for history and marked superseded; do not implement against them.*

## Why we're pivoting inside the pivot

The Phase 2 + Phase 3 plan commits us to **two** hard prerequisites before a user can see a single Swiggy row:

1. A ~400 MB `google-cloud-sdk` Homebrew cask (ADR-011).
2. A six-step Google auth flow: `gcloud install → gcloud auth login → gws install → gws auth setup (creates a Google Cloud project, enables Gmail API, creates a Desktop OAuth client, adds the signed-in account as a test user, writes `~/.config/gws/client_secret.json`) → gws auth login --services gmail --readonly` (ADR-022).

And our onboarding wizard is a straight-line script: no chat-model prompt, no live progress stream, no cancel-safe idempotency, no "already in place" summary on re-run. The now-retired Phase 1/2 boundary audit (`audit-phase-1-2.md`, deleted on 2026-04-22; see git history and the residue in [`../current-state.md`](../current-state.md)) already flagged this as a block.

Two orthogonal problems. This pivot fixes both:

- **Auth simplification:** drop `gws` + `gcloud` for Gmail access. Use **IMAP + a Gmail App Password** from <https://myaccount.google.com/apppasswords>. Zero Homebrew installs for Google, zero Cloud Console walks, zero verified-app anxiety.
- **Onboarding UX:** model the CLI wizard on `../openclaw`'s `setup --wizard` (`openclaw:src/wizard/setup.ts`, `openclaw:src/wizard/clack-prompter.ts`). That means `intro` / `outro` / grouped `note` / `select` / `password` / `confirm` primitives via `@clack/prompts`, not a one-off readline helper. Step by step, visible state, cancellable, safe to rerun.

## Validation — will IMAP + App Password track Swiggy spends?

Verified against current Google documentation and product behaviour (2026-04-22):

1. **App passwords still exist and still work with IMAP.** Google's stance is "unnecessary in most cases" but app passwords remain supported for accounts that have 2-Step Verification enabled. Source: [Sign in with app passwords — Gmail Help](https://support.google.com/mail/answer/185833).
2. **IMAP is actively maintained.** IMAP has been enabled by default for consumer Gmail since January 2025 and Google recommends it as the third-party-client replacement for POP3 (which is being retired).
3. **Full MIME access is available.** IMAP `FETCH … BODY.PEEK[]` returns the complete RFC822 message — headers, HTML/text body, attachments, all parts — which is everything the Swiggy extractor needs.
4. **Swiggy emails are plain IMAP-visible messages.** Order confirmations, cancellations and receipts come from `noreply@swiggy.in` (and siblings) as regular Gmail messages; there is no Swiggy-side capability that requires the Gmail API REST surface over IMAP.
5. **IMAP servers:** `imap.gmail.com:993` over TLS is the stable endpoint.

### Known trade-offs we accept

- **Requires 2FA.** App passwords are only generatable if the account has 2-Step Verification turned on. The wizard detects the "wrong password / 2FA-not-on" failure and points the user at <https://myaccount.google.com/signinoptions/twosv>.
- **Blocked for Google Advanced Protection Program accounts** — a tiny minority; the wizard classifies that as a distinct error and tells the user this product is not compatible with APP for v1.
- **Blocked by some Workspace admin policies.** If the user is on a corporate Workspace tenant whose admin disabled "Less secure app access" / app passwords, the wizard says so and points at a personal Gmail account as the workaround for v1.
- **Password scope is broader than OAuth read-only.** An app password grants full IMAP/SMTP access; our client connects IMAP read-only, but the credential itself is not scoped. We document this honestly in the onboard banner.
- **Revocation on Google-password change.** If the user rotates their Google password, the app password is invalidated. `slashcash doctor` classifies this case with a clear "generate a new app password" fix.
- **No attachment-download side channel.** Some receipts ship as PDFs; those come inside the same IMAP `FETCH` as part of the MIME tree, so there is no separate attachment API to miss.

### Conclusion

IMAP + App Password is a correct, fully sufficient carrier for Swiggy ingest and materially simpler than BYO-GCP. The pivot stands.

## What gets kept

- Everything under `~/.slashcash/` (SQLite at `db.sqlite`, attachments, skills dir, logs).
- The entire Phase 2 analytics rewrite (W5), attachments route (W4), cron single-flight (W3), skills v1 (W7), evals harness (W10), standalone-bundle packaging (W8). None of them are auth-aware.
- The `Step { detect / install / verify }` pipeline shape from Phase 3 W1. Only the step list changes.
- `slashcash doctor` and its structured `Check` shape from Phase 3 W3.
- `slashcash privacy` as a command (copy gets rewritten; see B4).
- The `gmail-swiggy` skill manifest and the ingest query string (just the fetch backend changes).

## What gets deleted

Code the next agent removes as part of B1 (scope: the repo currently compiles with this code; the pivot is not done until it no longer exists):

- `packages/cli/src/doctor/gws-status.ts` + `gws-status.test.ts`
- `packages/cli/src/doctor/gws-diagnostics.ts` + `gws-diagnostics.test.ts`
- `packages/tasks/src/utils/gws.ts` + `gws.integration.test.ts`
- `packages/tasks/src/utils/gws-errors.ts` + `gws-errors.test.ts`
- The `gws-install`, `gws-setup`, `gws-login`, `gcloud-install`, `gcloud-auth` steps in `packages/cli/src/onboard/run.ts`.
- The `GWS_BREW_FORMULA` and `GCLOUD_BREW_CASK` constants and the `isGwsSetupComplete` / `isGmailApiEnabled` / `hasActiveGcloudAccount` / `gwsClientSecretPath` helpers in the same file.
- `SLASHCASH_GWS_FIXTURE_DIR` paths in `packages/e2e-tests/*`, bundled-skill manifests, and doctor fixtures (replaced with `SLASHCASH_IMAP_FIXTURE_DIR` under B3).
- The four `gws`/`gcloud`-specific privacy-copy constants in `packages/cli/src/privacy/copy.ts` (replaced in B4).

## What gets built

### B1 — Remove gws/gcloud surface (S)

One deletion PR. No behavioural change beyond "gws is gone". Wire the old onboard step ids (`gws-install` etc.) to a hard-fail telling the user to rerun `slashcash onboard` for the new IMAP flow, so anyone mid-migration gets a clean message.

Exit: `rg -w gws packages | wc -l` returns 0 across `packages/cli`, `packages/tasks`, `packages/e2e-tests`; `pnpm architecture-smells` gains a new forbidden-string check for `gws` / `gcloud` / `google-cloud-sdk` / `googleworkspace-cli` in any `packages/**/*.{ts,json,md}` source file outside of `packages/docs/` (which still carries the superseded ADRs and this pivot doc).

### B2 — Interactive wizard on `@clack/prompts` (M)

New module `packages/cli/src/wizard/` modelled on `../openclaw/src/wizard/`. Read **only** these files before writing ours — adopt patterns, do not copy code:

- `openclaw:src/wizard/setup.ts` for the top-level orchestration and group structure.
- `openclaw:src/wizard/prompts.ts` for the `WizardPrompter` interface (intro, outro, note, select, text, password, confirm, spinner, multiselect).
- `openclaw:src/wizard/clack-prompter.ts` for the `@clack/prompts` adapter and `WizardCancelledError` guard.
- `openclaw:src/terminal/note.ts` for grouped multi-line notes with titles.

Add `@clack/prompts` ^1.2.0 as a CLI runtime dep (`pnpm --filter slashcash add @clack/prompts`). Keep the `Step` pipeline from Phase 3 W1 — it is still the right primitive — and re-express it on top of the new prompter so every `install` hook owns its progress line and every pre-action disclosure renders through `prompter.note` with a title.

New step list, in order, all interactive:

1. `welcome` — `intro("slashcash setup")`, prints the revised top-of-onboard banner (see B4).
2. `homebrew` — detect or point at <https://brew.sh>.
3. `chat-model` — the one `select` question we keep from ADR-018. Default `gemma3n:e4b`.
4. `ollama-install`, `ollama-service`, `ollama-pull` — detect-or-install; `ollama-pull` streams live progress via the spinner primitive (openclaw's spinner pattern).
5. `gmail-account` — `text` prompt for the Gmail address. Validated as an RFC-5322 addr-spec ending in a domain.
6. `gmail-app-password` — `password` prompt. 16-char space-tolerant mask ("xxxx xxxx xxxx xxxx" accepted; spaces stripped). Before the prompt, a `note` explains what an app password is, how to generate one at <https://myaccount.google.com/apppasswords>, and that 2FA must be on. The `note` links are copy-and-paste, not clickable-by-CLI.
7. `imap-verify` — attempt a live `imap.gmail.com:993` LOGIN with the provided credentials. Close the connection immediately after `LOGIN OK`. Success → persist into the OS keychain (B3). Failure → classified IMAP error (B3) with a retry option inside the wizard.
8. `state-dir`, `db-migrate`, `bundled-skills`, `final-summary` — unchanged from the current pipeline, but the final summary uses the new privacy copy from B4.

All steps honour `--yes` (accept defaults, still requires the Gmail + password prompts because they have no safe default), `--non-interactive` (fails fast if any prompt would be needed), and `SLASHCASH_E2E=1` (skips the prompts and the network touch; fixture-based IMAP from B3).

Cancellation (SIGINT or clack's internal cancel symbol) routes through `WizardCancelledError` and the same "run `slashcash doctor --fix` to resume" line we already have.

Exit: `slashcash onboard` on a clean mac walks every step; re-run on a finished machine completes in <1s and prints the "already in place" summary; cancelling mid `ollama-pull` leaves a partial pull that `doctor --fix` completes.

### B3 — IMAP client, credential store, ingest rewrite (M)

Replace the `gws` subprocess wrapper with an IMAP fetch module. Concretely:

- New `packages/tasks/src/gmail/imap-client.ts` on top of [`imapflow`](https://www.npmjs.com/package/imapflow) (maintained, typed, supports streaming bodies and modseq). Surface a typed API that mirrors the old `gws` wrapper signature: `listMessages(query)`, `fetchMessage(uid)`; use Gmail IMAP extensions `X-GM-RAW` (for the existing skill query string) and `X-GM-THRID` (for thread dedupe). Bodies come out as `{ headers, text, html, attachments }` using [`mailparser`](https://www.npmjs.com/package/mailparser); `attachments[*].content` is a Buffer we write under `~/.slashcash/attachments/`.
- New `packages/cli/src/config/credentials.ts` stores the Gmail address and app password. Primary: `keytar` (macOS Keychain; service `slashcash`, account `gmail-app-password@<email>`) — `keytar` ships prebuilt binaries so the `better-sqlite3`-style install story stays intact. Fallback: `~/.slashcash/credentials.json` with mode `0600` and a `warn: true` field that makes `doctor` remind the user their password is stored plaintext. Credential reads go through one function; writes through another; deletions on `doctor --reset-credentials` and on classified `imap-auth-failed`.
- Rewire `packages/tasks/src/trigger/processEmails.ts` (retained name; still not Trigger.dev) to call the IMAP client instead of `gws`. The rest of the pipeline (RFC822 parsing, AI extraction, attachment write, dedupe, `email_sync_status` writes) is unchanged — `imapflow` delivers the same RFC822 payload shape the parser already consumes.
- Closed error union in `packages/tasks/src/utils/imap-errors.ts`: `{imap-connect-failed, imap-tls-failed, imap-auth-failed-bad-password, imap-auth-failed-no-2fa, imap-auth-failed-advanced-protection, imap-auth-failed-workspace-policy, imap-rate-limited, imap-quota-exceeded, mailbox-not-selectable, unknown}`. Each signature is anchored to the literal responses Gmail IMAP returns (e.g. `[ALERT] Please log in via your web browser`, `[AUTHENTICATIONFAILED]`, `UNAVAILABLE`). Doctor gets one new check `gmail-imap` whose repair table maps the union to a one-command fix or a URL.
- Fixture mode: `SLASHCASH_IMAP_FIXTURE_DIR=<dir>` reads `.eml` files from disk instead of talking to a real server. Mirror what `SLASHCASH_GWS_FIXTURE_DIR` does today. E2E scenarios point at that.

Exit: with a real Gmail + real app password on a maintainer account, `slashcash sync --full` populates `parsed_emails` and `transactions_v2` end-to-end; fixture mode keeps `pnpm e2e:phase-2` green; `imap-auth-failed-bad-password` from a deliberately-wrong password prints the symptom/cause/fix block, never a raw IMAP protocol dump.

### B4 — Rewritten privacy copy + ADR-024 (S)

Rewrite `packages/cli/src/privacy/copy.ts` for the IMAP surface. The moments stay the same (per ADR-023's principle) but the copy changes:

```text
slashcash runs fully on your machine. Before we touch anything, the facts:
  - Your Gmail app password is stored in the macOS Keychain (or ~/.slashcash if Keychain is unavailable). We never see it.
  - Every email, PDF and analytics row stays under ~/.slashcash on this disk.
  - PDFs are parsed by a local model (gemma3n:e4b via Ollama). No OpenAI, Anthropic or Mistral calls.
  - The dashboard binds to 127.0.0.1. Nothing from the internet can reach it.
  - No telemetry. The only outbound calls are Gmail IMAP connections you authorised with an app password.
  - This CLI is published to npm with provenance and an SBOM. Re-read this any time with `slashcash privacy`.
```

- Drop `TOP_BANNER`'s reference to "the Google Cloud project gcloud is about to create".
- Drop `PRE_GCLOUD_AUTH`, `PRE_GWS_SETUP`, `PRE_GWS_LOGIN`.
- Add `PRE_APP_PASSWORD_INPUT`: one short block shown before the password prompt that explains what the user will paste, what it is not (their main Google password), and the revocation URL (<https://myaccount.google.com/apppasswords> has the "Remove" button per app).
- Rewrite `FINAL_SUMMARY` to point at `~/.slashcash/credentials.json` (if fallback was used) or "macOS Keychain: service `slashcash`" (if keytar succeeded).

Snapshot tests in `packages/cli/src/privacy/copy.test.ts` are regenerated; each snapshot change lands in the same PR as the ADR edit.

Exit: `slashcash onboard` prints each block at the right moment; `slashcash privacy` renders the new banner; the `e2e:phase-3` privacy-phrase assertion matches the new stable phrase.

### B5 — Doc, ADR and config cleanup (S)

- **ADRs.** Add ADR-024 (IMAP + App Password) and ADR-025 (interactive wizard on `@clack/prompts`) to `reference/decisions.md`. Mark ADR-004, ADR-011 (gws/gcloud parts), ADR-018 (single-question scope extended to cover the Gmail credential pair), ADR-022, and ADR-023 (copy pointers) as superseded by ADR-024 with a dated in-place note. Keep the old text per repo convention.
- **Config.** Remove all `gws`/`google.*` keys from `packages/cli/src/config/schema.ts`. Add a new `gmail` section: `{ address: string, passwordStore: "keychain" | "file", imapServer: "imap.gmail.com:993" (pinned constant — not user-editable in v1) }`. `config.json` never contains the password itself; that lives behind `credentials.ts`.
- **Reference docs.** Update `reference/cli.md` (new prompts, no `--skip-auth`), `reference/env-vars.md` (drop `GOOGLE_*`, add `SLASHCASH_IMAP_FIXTURE_DIR`, document `keytar` behaviour), `reference/file-changes.md` (reflects the new file list), `reference/glossary.md` (IMAP + app password entries), `reference/skills.md` (update the `gmail-swiggy` example to use the IMAP backend), and `reference/testing.md` (E2E scenario updates).
- **Architecture.** `reference/architecture.md` diagrams and prose: replace the `gws` box with an `imap.gmail.com` box and a `credentials.ts` box.
- **README + AGENTS.md.** Drop the gws/gcloud lines; add two lines about the app password flow.

Exit: `pnpm architecture-smells` is green with the new `gws`/`gcloud` forbidden-string rule; a grep of the source tree (excluding `packages/docs/`) returns zero `gws` or `gcloud` hits; every `reference/*.md` command the user could copy-paste actually exists and works.

## Re-ordered execution plan (replaces the original Phase 2 W1/W2 and Phase 3 W1/W2 — now folded into the post-rename [`phase-1.md`](./phase-1.md) and [`phase-2.md`](./phase-2.md) — in their entirety)

The next agent runs these in this order. Each stage ends on a commit that leaves the repo green on `pnpm typecheck`, `pnpm lint`, `pnpm architecture-smells`, and the relevant `pnpm e2e:phase-*`.

| # | Workstream | Size | Depends on |
|---|------------|------|-----------|
| P0 | B5 docs/ADR scaffolding (this file lands, ADR-024 and ADR-025 drafted) | S | — |
| P1 | B1 remove gws/gcloud code + tests + fixtures | S | P0 |
| P2 | B3 IMAP client + credentials store + ingest rewrite (fixture-first) | M | P1 |
| P3 | B2 interactive wizard on `@clack/prompts`, wired to B3 | M | P2 |
| P4 | B4 privacy copy rewrite + snapshots + `slashcash privacy` update | S | P3 |
| P5 | B5 finish: `reference/*.md` parity, architecture doc diff, README/AGENTS.md | S | P4 |
| P6 | Real-account E2E dogfood: clean-machine `npm i -g slashcash`, generate an app password, full Swiggy ingest; mark the `phase-1.md` / `phase-2.md` (post-rename) "Pending — hand to next agent" items that this pivot retires | S | P5 |

The testing-pyramid and release phases (post-rename [`phase-3.md`](./phase-3.md) and [`phase-4.md`](./phase-4.md)) are unaffected by this pivot and stay in their original order after P6.

## Exit gate for the pivot

Done when **all** of these hold:

1. A clean macOS machine with Homebrew, after `npm i -g slashcash` and `slashcash onboard`, reaches a populated Swiggy dashboard with a single wizard pass. No `gcloud`, no `gws`, no Cloud Console click-through. The only external input required is a Gmail address and a 16-char app password.
2. `slashcash doctor` is green; every `imap-*` failure mode has a tested symptom/cause/fix repair.
3. `rg -w "gws|gcloud"` returns zero hits under `packages/cli`, `packages/tasks`, `packages/e2e-tests`, `apps/`, `README.md`, `AGENTS.md`. Hits in `packages/docs/` are only the superseded ADRs and this pivot doc.
4. The `e2e:phase-2` and `e2e:phase-3` scripted scenarios (script names unchanged across the 2026-04-22 roadmap renumbering) are rewritten against the IMAP pipeline and pass on fixtures; the new Phase-pivot E2E (clean-mac + real account) passes once on a maintainer dogfood and is scripted for CI behind a secret app-password vault.
5. ADR-024, ADR-025, the superseded-notes on ADR-004 / ADR-011 / ADR-018 / ADR-022 / ADR-023, and every reference doc change are in one PR bundle per stage so the migration is auditable.

## What this pivot explicitly is not

- **Not a return to hosted.** ADR-013 (no dual-run) stands. Loopback-only dashboard stands. Local-first stands.
- **Not a multi-provider abstraction for email.** Gmail-only in v1. Other providers (Outlook, Fastmail, Proton) are a separate decision after v1, probably behind a different skill.
- **Not an OAuth implementation.** If and when we absorb the Google OAuth verification cost (ADR-004's revisit trigger), we will flip back to an OAuth-based flow in a future ADR-0xx — not by reviving `gws`.
- **Not a replacement for the `Step` pipeline.** The pipeline is still correct. Only the step list and the UI shell change.
