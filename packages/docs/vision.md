# Vision

> **Revision on 2026-07-12 (ADR-028).** Primary distribution is the **Desktop app** (Download for Mac → GitHub Releases). Public npm / `npm i -g slashcash` is deprecated as the product install path; `packages/cli` remains as the **Bundled runtime** inside the app. **Desktop onboarding** replaces end-user `slashcash onboard`. The **State directory** stays `~/.slashcash/`. See ADR-028.

> **Revision on 2026-04-26.** The Gmail access story shipped end-to-end: IMAP + a user-issued Gmail app password (ADR-024) replaces the original `gws` + `gcloud` path (ADR-004, ADR-011, ADR-022), and the `@clack/prompts` wizard (ADR-025) replaces the original readline-only script. The current PDF extractor pivot, captured in [`roadmap/pdf-extractor.md`](./roadmap/pdf-extractor.md), makes Swiggy ingest deterministic: a local Python package (Docling when available, plus PyMuPDF/pdfplumber fallback) extracts text/tables/fields via `child_process.spawn`, and TypeScript maps the result without an LLM. Assistant models are optional post-onboarding. The rest of this document — local-first posture, loopback auth boundary, single-user, `~/.slashcash/`, no telemetry — is unchanged. Paragraphs below that still mention `gws` are kept for historical continuity; treat them as superseded where they conflict.

## The problem we are pivoting away from

slash.cash today is a hosted SaaS at `slash.cash` / `app.slash.cash`. To use it, a person signs up, grants Google OAuth to our Google client so we can read their Gmail, and then lives with the fact that refresh tokens, parsed emails and PDF attachments sit in **our** Supabase project and PDFs get parsed in **our** OpenAI/Mistral account.

It works. It also asks people to trust us with their entire transactional inbox, refresh tokens that can resurrect access for years, and PDFs that often carry card-tail digits, addresses and order details.

Most prospects don't get past that ask. They want the product. They don't want a third party holding the keys.

## What we're building instead

A local-first, single-user **Desktop app** that the person downloads and runs on their own laptop (macOS). First launch runs **Desktop onboarding**: privacy disclosures, machine prep, Gmail address + 16-character app password from <https://myaccount.google.com/apppasswords>, and optional assistant setup. The app boots the existing dashboard on `127.0.0.1` and schedules an in-process cron worker that pulls Gmail over IMAP (`imap.gmail.com:993`), parses it deterministically, and writes everything to a single SQLite file under the **State directory** (`~/.slashcash/`).

The hosted app at `slash.cash` / `app.slash.cash` is being **retired** as part of this pivot. The marketing site stays as a landing page that points at **Download for Mac**; the hosted dashboard goes away once the desktop product reaches feature parity. There is no "cloud mode" in the codebase — one code path, one product, fully local. Public npm install is not the product path (ADR-028).

## What changes under the hood

- Data lives on the user's disk, under `~/.slashcash/`.
- There is no hosted auth. The server binds to loopback only; that's the boundary.
- Gmail is read over IMAP using a user-issued app password stored in the macOS Keychain (or, as a clearly-flagged fallback, in `~/.slashcash/credentials.json` with mode `0600`). We don't ship a Google client ID, don't run an OAuth flow, and don't install `gcloud` or `gws`.
- Swiggy ingest is deterministic (local PDF extractor); assistant chat is optional and uses a configured local or user-supplied provider.
- Background work is a `node-cron` schedule inside the same Node process that runs the Next.js dashboard. No Trigger.dev, no queues.
- Distribution is the **Desktop app** via GitHub Releases. The `slashcash` package ships as the **Bundled runtime** inside that app, not as a supported global npm install.

## Product principles

These are the tiebreakers for any ambiguous design choice in either phase.

1. **Local-first, not a self-host variant.** The Desktop app is the product. It's not a second-class deployment of a hosted system, and it is not "install our npm CLI."
2. **Single-user is a feature.** No login, no roles, no teams. Loopback bind is the auth boundary. This unlocks dramatic UI and code simplifications.
3. **One download to install, one app to run.** Anything the user has to do beyond Desktop onboarding and launching the app needs a repair path (`doctor --fix` / in-app equivalent) that does it for them.
4. **Reuse what works, delete what doesn't.** The Next.js dashboard, the Drizzle schema and the Swiggy analytics are keepers. The Supabase surface, the Trigger.dev package, the Google OAuth dance, the PostgREST storage path and the hosted-only pages are on the chopping block.
5. **One code path.** No mode switches, no cloud escape hatches, no branches to maintain. If a file is cloud-only, it's deleted, not gated.
6. **No telemetry.** The local app makes no outbound calls we didn't ask for. Version checks / auto-updates, if any, are explicit product surfaces (see desktop packaging), not silent phone-homes of finance data.
7. **User owns their Gmail credential.** We don't ship OAuth flows, client secrets or token tables. The user generates an app password at Google, pastes it once during Desktop onboarding, and we store it in the OS keychain where possible. Revocation is the user's one-click action in their Google account.
8. **Skills are user-extensible.** Reading Gmail is one capability; bank statements, Sheets, and calendar are others. These are modeled as skills — folders with a frontmatter runbook and a manifest — so the surface area can grow without rewriting the shell.
9. **Doctor over silent migrations.** When the config or the filesystem drifts, repair is explicit. Startup does not mutate user state on its own.
10. **Schemas at boundaries.** Every external input — config file, Gmail responses, persisted JSON — is validated with a schema before it enters typed code.
11. **Trust is surfaced, not buried.** The product's privacy guarantees (no server-side tokens, no cloud parsing, no telemetry, loopback-only dashboard) are shown at Desktop onboarding and kept reachable forever through an in-app / runtime privacy surface. We never rely on the ADRs or the landing page alone to do that job.

## Target audience for v1

v1 ships for **people on macOS** who can download a desktop app, enable 2-Step Verification on their Google account if they haven't already, and paste a 16-character app password once during Desktop onboarding. Primary markets are the US and India. Comfort with `npm i -g` is **not** required. The ADR-024 "IMAP + app password" flow is the v1 default: a single paste, no OAuth app-verification track, no Cloud Console walk, no `gcloud` cask. Any scenario that genuinely requires OAuth-scoped read-only access (e.g. Advanced Protection Program users or locked-down Workspace tenants) is a distinct product motion that would reopen ADR-004; it is out of v1 scope.

## Non-goals

Stated so we don't re-argue mid-phase.

- Multi-user / multi-tenant local mode.
- Mobile or system-tray-only product (the Desktop app with a full dashboard UI is in scope; a tray-only / headless secondary product is not).
- Cross-device sync.
- A hosted "premium" tier layered on the local product.
- A pluggable multi-provider LLM abstraction as a required ingest dependency.
- Windows or Linux support in v1. macOS only.
- Preserving the hosted app. It is being sunset.
- Supporting `npm i -g slashcash` as a co-equal end-user install path (ADR-028).

## Success criteria for the pivot

The pivot is done — i.e. it's what `slash.cash` recommends on the landing page — when all of these are true:

1. A clean macOS machine goes from **Download for Mac** to a populated dashboard in under ten minutes, including any first-run machine prep Desktop onboarding requires.
2. The dashboard at `http://127.0.0.1:<port>` (or the embedded desktop window) shows real Swiggy analytics computed from the user's actual Gmail, with no unexpected outbound network calls after onboarding completes.
3. The chat assistant answers Swiggy questions using a configured local or user-supplied provider at a quality level agreed against the existing eval suite.
4. Doctor / repair is green after a clean Desktop onboarding, with no undocumented manual steps required.
5. The hosted dashboard is off; `slash.cash` points at **Download for Mac**; there are no remaining references to Supabase, Trigger.dev, OpenAI or Mistral in the shipping code as required cloud backends.
