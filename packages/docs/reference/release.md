# Reference — Release verification

This document describes the end-user verification story for the **Desktop app** (ADR-028). Public npm publish is deprecated as the product release path; the bundled `slashcash` runtime is staged inside the desktop package.

## What the release workflow produces

Tag-triggered desktop release builds produce GitHub Release artifacts for macOS (arm64 in v1 packaging):

- a human-installable `.dmg` (website **Download for Mac**)
- a `.zip` for `electron-updater` (dmg-only updates break on Mac)
- `latest-mac.yml` (updater feed; must be on the same GitHub Release)
- optional checksum / SBOM attachments when the workflow attaches them

The desktop pack stages the same prebuilt Next standalone + CLI layout used historically by `pnpm pack:local` / `bundle:app` under the app’s `extraResources` (Bundled runtime), so the shell can spawn `slashcash` against `process.resourcesPath`.

## What users can verify

After a release:

1. Download the `.dmg` (or `.zip`) from the GitHub Release linked by the website CTA.
2. Compare checksums against any attached checksum file on that release, if present.
3. Confirm `latest-mac.yml` is present on the release when auto-update is enabled.
4. Launch the app on a clean macOS machine and complete **Desktop onboarding**.

## Pre-tag UI verify (agent-browser)

For launch → healthz → loopback `agent-browser` against real `~/.slashcash`, see [`desktop-verify.md`](./desktop-verify.md) and `./scripts/desktop-verify.sh`. CI must not mount personal home data; keep runner smoke to artifacts (+ temp-home healthz only).

## Local smoke path

Maintainers can rehearse packaging locally with the desktop pack pipeline (exact script names live with `apps/desktop` packaging work) and, where still useful for the bundled runtime tree:

```bash
SLASHCASH_HOME="$(mktemp -d)" pnpm pack:local
pnpm bundle:check
```

`pnpm pack:local` builds the CLI/runtime tree and runs the packed-install smoke for the dashboard layout and required runtime dependencies. The temp `SLASHCASH_HOME` keeps release rehearsal away from a developer's real local finance database. Desktop pack should consume that staged tree as `extraResources`, not publish it to npm as the product.

## CI smoke path

CI should exercise desktop pack / launch smoke (and any retained runtime pack checks) on PRs and pushes to `main` so the install path is exercised before a maintainer cuts a tag.

## What still requires a real release

These checks only exist on a real tagged GitHub Release:

- uploaded `.dmg` / `.zip` / `latest-mac.yml` presence
- clean-machine Desktop app install + Desktop onboarding dogfood
- updater feed reachability against the published release assets

## Signing, notarization, and Gatekeeper

v1 packaging may ship unsigned / ad-hoc builds (`CSC_IDENTITY_AUTO_DISCOVERY=false`) until signing and notarization are productized. Revisit when Gatekeeper friction blocks dogfood.

**First open and after auto-updates:** Gatekeeper may block or re-prompt for unsigned `.app` bundles (including ones swapped in by `electron-updater` from the GitHub Release `.zip`). If macOS says the app cannot be opened, right-click → **Open**, or clear quarantine with `xattr -dr com.apple.quarantine` on the app path. The desktop About panel and **Check for Updates…** menu note this caveat for end users.

## Deprecated: npm as product publish

The former npm Trusted Publishing / `pnpm release:verify-published` story (ADR-021) is **superseded for end-user release** by ADR-028. Do not restore `npm i -g slashcash` as the landing-page install path. Maintainer-only pack of the bundled runtime may remain for staging into the desktop app.
