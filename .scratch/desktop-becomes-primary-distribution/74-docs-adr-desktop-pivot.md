# Research: What docs and ADRs must flip for the desktop pivot?

**Ticket:** [What docs and ADRs must flip for the desktop pivot?](https://github.com/Ravikumar911/knitly/issues/74)  
**Map:** [Desktop becomes primary distribution](https://github.com/Ravikumar911/knitly/issues/67)  
**Date:** 2026-07-12  
**Mode:** Complete with recommended defaults (no interactive grill)

## Recommendation (decision)

**Yes — write one new ADR** in `packages/docs/reference/decisions.md`:

> **ADR-028 — Desktop is primary distribution; npm CLI install deprecated**

It records the hard-to-reverse distribution flip and **supersedes** the desktop-as-non-goal / npm-as-product stance that still lives in vision, architecture, and older ADRs. Do **not** rewrite ADR-001/009/013/021 in place; annotate them with a short “Scope updated / partially superseded by ADR-028” banner (same pattern as ADR-022 → ADR-024) and point implementers at the files below.

**CONTEXT.md:** already canonical for product language. Implement phase should **not** invent new root terms; sync `packages/docs/reference/glossary.md` to match CONTEXT, and stop treating glossary/`slashcash` as “the npm package end users install.”

## Why one new ADR (domain-modeling bar)

| Criterion | Met? |
|-----------|------|
| Hard to reverse | Yes — primary install channel, release artifacts, website CTA, onboard surface |
| Surprising without context | Yes — ADR-001 rejected `apps/desktop`; vision Non-goals ban “desktop GUI”; architecture “Not in v1” lists “desktop shell” |
| Real trade-off | Yes — keep public npm + CLI-as-product vs desktop-primary + deprecate `npm i -g slashcash` |

A scattered edit pass without ADR-028 would leave future readers with conflicting “CLI is the product” principles and no decision record.

## Locked product language (already in root `CONTEXT.md`)

Use these as the only end-user vocabulary; glossary must adopt them:

| Term | Meaning | Avoid |
|------|---------|--------|
| **Desktop app** | Primary product the person downloads and runs (Electron shell + local dashboard + bundled runtime) | CLI product, npm package (as the product), “desktop shell” as optional secondary |
| **Bundled runtime** | `slashcash` package shipped inside the desktop app to supervise the local server and machine-side setup | end-user CLI, global npm install, `npm i -g slashcash` |
| **State directory** | `~/.slashcash/` — single on-disk home for config, SQLite, attachments, related state | Electron `userData` / Application Support as a separate product store |
| **Desktop onboarding** | First-launch setup inside the desktop app UI (former CLI onboard scope) | `slashcash onboard`, terminal wizard, marketing-site onboarding |

## Scan findings (what still says npm/CLI-primary)

### `packages/docs/vision.md`

- “Globally installed from npm”; marketing “points at the CLI”; “Distribution is a public npm package. The product is the CLI.”
- Principle 1: “The CLI is the product.”
- Target audience: comfortable with `npm i -g`.
- Non-goals: “Mobile, desktop GUI or system tray app.”
- Success: clean machine via `npm i -g slashcash`.

### `packages/docs/architecture.md`

- Opening: user installs from npm; `slashcash onboard` / `start` as the story.
- CLI section frames `packages/cli` as the user-facing bin surface.
- **Not in v1:** “desktop shell”.

### `packages/docs/reference/decisions.md` (named ADRs)

| ADR | Conflict with destination | Implement treatment |
|-----|---------------------------|---------------------|
| **ADR-001** | Rejected “Extracting a new `apps/desktop`” | Keep core (reuse Next dashboard). Banner: rejected **rewrite** of the dashboard into a separate app; **Electron shell wrapping the same dashboard** is ADR-028. |
| **ADR-009** | Prebuilt Next standalone “inside the published npm package” / `npm i -g` | Keep technical choice (prebuilt standalone). Banner: artifact destination is **desktop `extraResources` / bundled runtime**, not the end-user npm product. |
| **ADR-013** | Marketing site “point at the CLI” | Keep “no dual-run / fully local”. Banner: marketing CTA → **Download for Mac** (desktop), not CLI install. |
| **ADR-021** | Tag release → pack CLI → **publish npm** + install smoke | Banner: **superseded for end-user release** by ADR-028 (GitHub Releases `.dmg`/`.zip`/`latest-mac.yml`). npm publish removed from product path; maintainer/dev pack may remain separately. |

### `packages/docs/reference/release.md`

Entire doc is npm Trusted Publishing / packed tarball / `release:verify-published`. Must become desktop release verification (GitHub Release artifacts, checksums if kept, updater feed) in implement.

### `packages/docs/reference/glossary.md`

- **slashcash** = “The npm package and CLI” → redefine as bundled runtime (CONTEXT), not end-user install product.
- **onboard** = `slashcash onboard` → **Desktop onboarding** (CONTEXT); drop terminal wizard as canonical.
- **standalone output** / PID / doctor — keep, but frame as runtime internals where needed.

### `README.md`

Published install = `npm i -g slashcash` + `slashcash onboard`. Flip to desktop download / local-dev paths; CLI commands as maintainer/`pnpm` tooling.

### Root `CONTEXT.md`

Already flipped. **No new CONTEXT terms required** for this ticket. Implement: only touch CONTEXT if glossary sync reveals a missing Avoid line (unlikely).

## Exact files to update in implement phase

### Must update (this ticket’s scope)

1. `packages/docs/reference/decisions.md` — **add ADR-028**; banners on ADR-001, 009, 013, 021  
2. `packages/docs/vision.md` — distribution, principles, audience, non-goals, success criteria  
3. `packages/docs/architecture.md` — one-paragraph picture; CLI → bundled runtime; remove “desktop shell” from Not in v1; add desktop app process sketch  
4. `packages/docs/reference/release.md` — desktop GitHub Releases / updater verification (replace npm-primary story)  
5. `packages/docs/reference/glossary.md` — align with CONTEXT terms; deprecate npm-as-product wording  
6. `README.md` — end-user install = desktop; npm/CLI not the product CTA  

### Already done

7. `CONTEXT.md` — Desktop app / Bundled runtime / State directory / Desktop onboarding  

### Related docs (flip in same implement PR or immediate follow-up so gates don’t contradict)

8. `packages/docs/reference/testing.md` — clean-machine `npm i -g` scenarios → desktop launch / pack smoke  
9. `packages/docs/current-state.md` — release/dogfood language still npm-centric  
10. `packages/docs/roadmap/phase-5.md` — success path `npm i -g` → desktop  

### Explicitly out of this research ticket (other map tickets / implement)

- `apps/website/**` marketing copy and `INSTALL_COMMAND` (map already owns website CTA)  
- Code deletion of `slashcash onboard` (onboarding tickets)  
- Map #67 body updates (per instructions: **do not** update map #67 from this ticket)

## ADR-028 sketch (for implement; do not edit decisions.md yet)

**Title.** Desktop is primary distribution; npm CLI install deprecated  

**Decision.**

- Primary product distribution is the **Desktop app** (macOS; packaging per ticket #68).
- End users install via website **Download for Mac** → GitHub Release artifacts; updates via electron-updater.
- `packages/cli` remains as **Bundled runtime** inside the app — not a supported global npm install path.
- Public **npm publish / `npm i -g slashcash` CTAs are deprecated** for the product.
- **Desktop onboarding** replaces end-user `slashcash onboard`.
- **State directory** stays `~/.slashcash/`.

**Why.** Non-developer-friendly install; one primary path; matches locked map #67 preferences.

**Supersedes / updates.** Vision/architecture desktop non-goals; end-user reading of ADR-001’s `apps/desktop` rejection; ADR-009/021 npm-as-product release; ADR-013 marketing→CLI.

**Rejected.** Keeping npm as co-equal install; Electron `userData` as data home; deleting `packages/cli` entirely.

**Revisit if.** Signing/notarization changes distribution; Windows/Linux desktop ships; intentional return of a supported CLI-only install for power users.

## Out of scope for implement of this research

- Editing the docs files in this grilling session (research/decision only — done here).  
- Updating map issue #67.  
- Implementing packaging, website, or onboarding UI.
