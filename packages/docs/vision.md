# Vision

## The problem we are pivoting away from

slash.cash today is a hosted SaaS at `slash.cash` / `app.slash.cash`. To use it, a person signs up, grants Google OAuth to our Google client so we can read their Gmail, and then lives with the fact that refresh tokens, parsed emails and PDF attachments sit in **our** Supabase project and PDFs get parsed in **our** OpenAI/Mistral account.

It works. It also asks people to trust us with their entire transactional inbox, refresh tokens that can resurrect access for years, and PDFs that often carry card-tail digits, addresses and order details.

Most prospects don't get past that ask. They want the product. They don't want a third party holding the keys.

## What we're building instead

A local-first, single-user app that the person installs on their own laptop. Globally installed from npm. Onboarded by a single command that prepares the machine (Homebrew, Ollama, the `gemma3n:e4b` model, `gcloud`, the `gws` Google Workspace CLI, `gws auth setup`, and scoped Gmail consent). Started by a single command that boots the existing dashboard on `127.0.0.1` and schedules an in-process cron worker that pulls Gmail through `gws`, parses it with the local model, and writes everything to a single SQLite file.

The hosted app at `slash.cash` / `app.slash.cash` is being **retired** as part of this pivot. The marketing site stays, as a landing page that points at the CLI; the hosted dashboard goes away once the CLI reaches feature parity. There is no "cloud mode" in the codebase — one code path, one product, fully local.

## What changes under the hood

- Data lives on the user's disk, under `~/.slashcash/`.
- There is no auth. The server binds to loopback only; that's the boundary.
- Gmail is read through `gws`, using the user's own Google credentials managed by `gws`. We don't ship a Google client ID.
- Parsing happens through a local Ollama server with `gemma3n:e4b`. We don't call OpenAI, Mistral, Anthropic or anything else.
- Background work is a `node-cron` schedule inside the same Node process that runs the Next.js dashboard. No Trigger.dev, no queues.
- Distribution is a public npm package. The product is the CLI.

## Product principles

These are the tiebreakers for any ambiguous design choice in either phase.

1. **Local-first, not a self-host variant.** The CLI is the product. It's not a second-class deployment of a hosted system.
2. **Single-user is a feature.** No login, no roles, no teams. Loopback bind is the auth boundary. This unlocks dramatic UI and code simplifications.
3. **One command to install, one command to run.** Anything the user has to do beyond `slashcash onboard` and `slashcash start` needs a `slashcash doctor --fix` that does it for them.
4. **Reuse what works, delete what doesn't.** The Next.js dashboard, the Drizzle schema and the Swiggy analytics are keepers. The Supabase surface, the Trigger.dev package, the Google OAuth dance, the PostgREST storage path and the hosted-only pages are on the chopping block.
5. **One code path.** No mode switches, no cloud escape hatches, no branches to maintain. If a file is cloud-only, it's deleted, not gated.
6. **No telemetry.** The local app makes no outbound calls we didn't ask for. Version checks, if any, are opt-in.
7. **gws owns Google.** We don't ship OAuth flows, client secrets or token tables. `gws` handles auth, its own state, and its own renewal.
8. **Skills are user-extensible.** Reading Gmail is one capability; bank statements, Sheets, and calendar are others. These are modeled as skills — folders with a frontmatter runbook and a manifest — so the surface area can grow without CLI changes.
9. **Doctor over silent migrations.** When the config or the filesystem drifts, `slashcash doctor --fix` repairs it explicitly. Startup does not mutate user state on its own.
10. **Schemas at boundaries.** Every external input — CLI argv, config file, `gws` output, Gmail responses, persisted JSON — is validated with a schema before it enters typed code.
11. **Trust is surfaced, not buried.** The product's privacy guarantees (no server-side tokens, no cloud parsing, no telemetry, loopback-only dashboard, BYO Google Cloud project) are shown to the user at onboarding — at the top of `slashcash onboard` and again in one factual line right before each browser consent — and kept reachable forever through `slashcash privacy`. We never rely on the ADRs or the landing page to do that job; if the wizard doesn't say it, it doesn't count.

## Target audience for v1

v1 ships for **developers on macOS** — people who are already comfortable typing `npm i -g <package>`, following a CLI prompt through two browser OAuth consents, and clicking past a one-time "Google hasn't verified this app" warning. Primary markets are the US and India. This is the constraint that makes the ADR-004 / ADR-022 "BYO-GCP via gcloud + `gws auth setup`" flow the right v1 default: technical users pay the two-consent cost once and gain a fully-local product where their Gmail token lives in their own Google Cloud project, not ours. A non-developer audience would be a distinct product motion with a signed macOS bundle and a verified shared OAuth client; that is explicitly out of v1 scope and is the future condition recorded in ADR-022's "Revisit if" block.

## Non-goals

Stated so we don't re-argue mid-phase.

- A non-developer / consumer audience in v1 (see "Target audience for v1" above).
- Multi-user / multi-tenant local mode.
- Mobile, desktop GUI or system tray app.
- Cross-device sync.
- A hosted "premium" tier layered on the CLI.
- A pluggable multi-provider LLM abstraction.
- Windows or Linux support in v1. macOS only.
- Preserving the hosted app. It is being sunset.

## Success criteria for the pivot

The pivot is done — i.e. it's what `slash.cash` recommends on the landing page — when all of these are true:

1. A clean macOS machine goes from `npm i -g slashcash` to a populated dashboard in under ten minutes, including the model download.
2. The dashboard at `http://127.0.0.1:<port>` shows real Swiggy analytics computed from the user's actual Gmail, with no outbound network calls after `onboard` completes.
3. The chat assistant answers Swiggy questions using `gemma3n:e4b` locally at a quality level agreed against the existing eval suite (see Phase 2 W10).
4. `slashcash doctor` is green after a clean `onboard`, with no manual steps required.
5. The hosted dashboard is off; `slash.cash` points at the CLI; there are no remaining references to Supabase, Trigger.dev, OpenAI or Mistral in the shipping code.
