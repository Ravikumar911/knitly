# Research: How does release CI ship desktop and drop npm?

**Ticket:** [How does release CI ship desktop and drop npm?](https://github.com/Ravikumar911/knitly/issues/69)  
**Map:** [Desktop becomes primary distribution](https://github.com/Ravikumar911/knitly/issues/67)  
**Blocked by:** [#68 packaging](https://github.com/Ravikumar911/knitly/issues/68) — decided; see `68-package-macos-desktop.md`  
**Date:** 2026-07-12

## Recommendation (decision)

Retarget `.github/workflows/release.yml` so a `v*.*.*` tag matching **`apps/desktop/package.json`** runs quality gates on Ubuntu, builds **unsigned macOS arm64** artifacts on **`macos-14`**, creates a **GitHub Release** with `.dmg` + `.zip` + `latest-mac.yml` (+ blockmaps if emitted), then deploys the website. **Delete the entire npm publish path** (`publish` job, OIDC/`npm-release` environment use, tarball checksum/manifest attach, `verify-published-install`).

Keep `packages/cli` as the **bundled runtime** staged into Electron `extraResources` (per #68). Do not publish `slashcash` to npm from CI anymore.

## Current state (what changes)

| Piece today | Role | After |
|-------------|------|--------|
| `preflight` (ubuntu) | Version from `packages/cli`; npm-not-published gate; gates; `pack:local` + `release:check`; upload `.tgz` | Version from `apps/desktop`; drop npm gate; keep quality gates; optional CLI bundle smoke only |
| `publish` (ubuntu, `npm-release`) | `npm publish` + verify-published + `gh release create` with tarball | **Delete job** |
| `publish-website` | Vercel after `publish` | Keep; depend on desktop release job instead of npm |
| `install-smoke.yml` | `pack:local` + `release:check` on PR/main | Keep CLI bundle smoke; drop/repurpose npm `release:check` |
| Root `pack:local` | Build + `bundle:app` + `pnpm pack` + pack-smoke | Evolve into desktop-prep + optional tarball; see below |
| `release:check` | npm metadata + `npm pack --dry-run` file list | Strip publishability rules; validate **staged runtime tree** |
| `release:verify-published` | Post-npm install smoke | **Remove from CI**; deprecate script |

## Recommended job graph

```text
on:
  push.tags: v*.*.*
  workflow_dispatch:   # dry-run: gates + mac pack + upload artifacts; no GitHub Release, no Vercel

concurrency: publish-${{ github.ref }}  # keep

preflight (ubuntu-latest)
  ├─ version gate: apps/desktop/package.json ↔ tag
  ├─ architecture-smells, typecheck
  ├─ website build
  ├─ eval:gate (SLASHCASH_EVAL_SKIP_MODEL=1)
  └─ (optional) CLI bundle smoke: build + bundle:app + bundle:check
       — NOT npm pack / release:check npm metadata
       — NOT required to upload .tgz artifacts

build-macos (macos-14)          # Apple Silicon runner; needs: preflight
  ├─ CSC_IDENTITY_AUTO_DISCOVERY=false
  ├─ pnpm install --frozen-lockfile
  ├─ desktop pack pipeline (#68):
  │    main/database/tasks/cli build → bundle:app → stage extraResources/slashcash
  │    → Electron ABI rebuild → @knitly/desktop build → electron-builder --mac dmg zip --arm64 --publish never
  └─ upload-artifact: apps/desktop/release/*
       expected: slash.cash-*-mac-arm64.dmg, .zip, latest-mac.yml, *.blockmap (if present)

create-release (ubuntu-latest)  # if: push tag only; needs: preflight, build-macos
  ├─ download macos artifacts
  ├─ permissions: contents: write
  └─ gh release create "$TAG" \
         *.dmg *.zip latest-mac.yml *.blockmap \
         --title "$TAG" --generate-notes
     # Do NOT attach slashcash-*.tgz / .sha256 / package-manifest

publish-website (ubuntu-latest) # if: push tag only; needs: preflight, create-release
  └─ unchanged Vercel pull/build/deploy (website-production env)
```

### Why this split

- **Version + cheap gates on Ubuntu** — same as today; no macOS minutes for typecheck/eval.
- **Pack on `macos-14`** — electron-builder needs a Mac host for native arm64 dmg/zip; matches #68 “arm64 only”.
- **`--publish never` + `gh release create`** — keeps release notes/permissions in one place (today already uses `gh`), avoids fighting electron-builder’s GitHub publisher, and still ships `latest-mac.yml` as a normal asset so electron-updater’s GitHub provider can find it.
- **Website after release** — download links on the site (#73) should see the Release exist; ordering matches current “after publish” intent without npm.

### workflow_dispatch (rehearsal)

Dry run = `preflight` + `build-macos` + artifact upload only. Skip `create-release` and `publish-website`. Summary text should say “push `v{desktopVersion}` to create the GitHub Release and deploy the website” — not “publish to npm”.

## Version gate

```bash
VERSION=$(node -p "require('./apps/desktop/package.json').version")
# on tag push:
test "v${VERSION}" = "${GITHUB_REF_NAME}"
```

**Source of truth:** `apps/desktop/package.json` (locked).

**CLI version:** no longer gates the tag. At implement, either:

1. **Preferred:** stop treating `packages/cli` version as a product version — leave it free, or set `private: true` and ignore for tags; or  
2. Soft-assert CLI version equals desktop (nice for logs) but **fail the gate only on desktop ↔ tag mismatch**.

Remove:

- `PACKAGE_DIR=packages/cli` / `PACKAGE_NAME=slashcash` as release identity  
- `npm view slashcash@…` “already published” checks in preflight and publish

Optional later: assert GitHub Release for this tag does not already exist (`gh release view`) to make re-runs safe.

## Artifacts on the GitHub Release

| Asset | Required | Consumer |
|-------|----------|----------|
| `slash.cash-{version}-mac-arm64.dmg` | yes | Humans / website (#73) |
| `slash.cash-{version}-mac-arm64.zip` | yes | electron-updater |
| `latest-mac.yml` | yes | electron-updater feed |
| `*.blockmap` | if electron-builder emits | differential updates |
| `slashcash-*.tgz`, `slashcash.sha256`, `slashcash-package-manifest.json` | **no** | delete from workflow |

Do not keep attaching the npm tarball “for completeness” — that reintroduces a second distribution channel.

## What to delete / deprecate from the npm path

### Workflow / CI

- Entire **`publish` job** in `release.yml` (npm Trusted Publishing, Node 24 npm upgrade, `npm publish --provenance`, `verify-published-install`, tarball `gh release create`).
- Preflight steps that only serve npm: resolve version from CLI, npm-not-published, attach checksum, generate package manifest, upload `.tgz` artifact.
- Job dependency `publish-website needs: [preflight, publish]` → `needs: [preflight, create-release]` (names as implement prefers).
- Stop requiring GitHub Environment **`npm-release`** for tag releases (can leave the env unused; no need to delete in GH UI in this ticket).
- Root scripts still named for npm: `release:verify-published` — remove from CI; deprecate or delete script when docs catch up.
- Root `"release": "turbo run build && changeset publish"` — out of band for desktop tags; do not wire it into `release.yml`. Changeset policy for internal packages is a separate cleanup if needed.

### Scripts that stay but change meaning

| Script | Keep? | Evolution |
|--------|-------|-----------|
| `pnpm pack:local` | yes, reshaped | See next section |
| `pnpm release:check` | reshape or rename | Drop `private !== true`, `publishConfig.access`, and other npm-publishability asserts; validate staged `extraResources` / pack-stage file list (same required paths as today’s pack dry-run: `entry.js`, standalone `server.js`, `BUILD_ID`, no `.env`/tests). Prefer rename to something like `bundle:stage-check` at implement. |
| `bundle:check` / `bundle:pack-smoke` | yes | Still prove CLI runtime layout; pack-smoke can install from **stage dir** or a local tarball without implying npm publish |
| `verify-published-install.mjs` | no for CI | Delete or quarantine under `packages/cli/scripts/` as unused |
| `packages/docs/reference/release.md` | update in implement/docs follow-up | Rewrite around GitHub Release + dmg/zip/`latest-mac.yml`; remove Trusted Publishing section as the active path |

### CLI package.json flags (implement follow-up, not blocking CI graph)

- Set `"private": true` on `slashcash` when ready so accidental `npm publish` / changeset publish fails closed.
- Remove or ignore `publishConfig` once private.

## How `pack:local` / `release:check` evolve

### Today

```text
pack:local =
  turbo build @knitly/main + slashcash
  → bundle:app → bundle:check
  → pnpm --dir packages/cli pack   # produces .tgz
  → bundle:pack-smoke              # install tarball locally
```

`release:check` = npm metadata + `npm pack --dry-run` file list.

### Target

Treat packing as **two layers**:

1. **Runtime stage (required for desktop + CI smoke)**  
   Build + `bundle:app` + stage directory (`packages/cli/pack-stage/slashcash` per #68) with the same files npm `files` would have included (`bin`, `dist`, `bundled-skills`, `package.json`, …).  
   Check: `bundle:check` + stage-check (evolved `release:check`).

2. **npm tarball (optional / local-only)**  
   `pnpm pack` is no longer a release gate. Keep as a maintainer convenience or drop once stage-check covers the file list. `bundle:pack-smoke` should prefer installing/running from the **stage dir** (or Electron-as-Node against stage) so Linux CI does not depend on npm packaging semantics.

Suggested root scripts (names flexible at implement):

```text
pnpm bundle:runtime     # build + bundle:app + stage + bundle:check + stage-check
pnpm desktop:pack       # bundle:runtime + ABI rebuild + electron-builder (mac only)
pnpm pack:local         # alias or thin wrapper: bundle:runtime (+ optional pack smoke on linux)
```

`install-smoke.yml` and nightly `bundle-smoke` should call **`bundle:runtime` / evolved `pack:local`**, not npm `release:check`.

### install-smoke.yml

- **Keep** on PR + `main`: proves the CLI/Next bundle still packs on Linux (fast feedback; does not need macOS).
- **Remove** npm-oriented `pnpm release:check` once stage-check replaces it.
- **Do not** require full electron-builder on every PR in v1 (cost + #72 covers desktop verification). Optional later: `macos-14` job on `workflow_dispatch` / nightly only.

### nightly.yml

- `bundle-smoke` job: same as install-smoke — runtime stage, not npm publish rehearsal.

## Permissions / secrets

| Need | Notes |
|------|--------|
| `contents: read` on preflight / build | default |
| `contents: write` on create-release | for `gh release create` + assets |
| `GITHUB_TOKEN` | sufficient for public repo Releases |
| Vercel secrets | unchanged on `publish-website` |
| npm OIDC / `id-token: write` | **remove** from release workflow |
| Code signing secrets | **none** for v1 (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |

## Risks / implement notes

1. **Artifact names** must match electron-builder config from #68 so website (#73) and updater agree (`slash.cash-${version}-mac-${arch}.${ext}`).
2. **`latest-mac.yml` paths** inside the yml must match uploaded zip filenames; building and uploading the whole `release/` dir avoids hand-editing.
3. **Re-running a tag workflow** after a partial failure: prefer `gh release upload --clobber` or delete+recreate; document in implement.
4. **Gatekeeper** is a product/docs concern, not CI — CI only produces unsigned artifacts.
5. **Linux cannot produce the Mac dmg**; do not try `electron-builder --mac` on `ubuntu-latest`.
6. Sibling tickets: website download URL (#73), agent-browser desktop verify (#72) — this note only defines CI shipping shape.

## Out of scope

- Code signing / notarization  
- Intel / universal builds  
- Publishing CLI to npm “for power users”  
- Implementing electron-builder config (owned by packaging implement after #68)  
- Updating map issue #67  

## Answer in one line

**On `v*` tags matching `apps/desktop/package.json`, run Ubuntu preflight → `macos-14` unsigned electron-builder (dmg+zip+`latest-mac.yml`) → `gh release create` with those assets → existing Vercel website job; delete the npm publish job and stop gating releases on `pack:local`/`release:check` npm metadata — keep CLI bundling only as the desktop `extraResources` stage.**
