# Reference — Release verification

This document describes the end-user verification story for published `slashcash` packages.

## What the release workflow produces

The tag-triggered release workflow runs a preflight job, publishes the exact packed tarball, verifies the published install from npm, and uploads:

- a package manifest generated from the packed tarball (`slashcash-package-manifest.json`)
- a SHA-256 checksum file (`slashcash.sha256`)
- the packed `slashcash-*.tgz` artifact used for publish

## What users can verify

After a release:

1. Install or inspect the published package version from npm.
2. Compare the published tarball checksum against `slashcash.sha256`.
3. Review the attached `slashcash-package-manifest.json` to see the published tarball metadata and file list.
4. Inspect the GitHub release artifacts to confirm the published package came from the checked release run.

## Local smoke path

Maintainers can rehearse the release path locally with:

```bash
SLASHCASH_HOME="$(mktemp -d)" pnpm pack:local
pnpm bundle:check
pnpm release:check
```

`pnpm pack:local` builds the CLI tarball and runs the packed-install smoke, which verifies the packaged dashboard layout and required runtime dependencies. The temp `SLASHCASH_HOME` keeps release rehearsal away from a developer's real local finance database. `pnpm release:check` validates the npm metadata and packed file list before any publish attempt.

## CI smoke path

The `Install Smoke` workflow runs on PRs, pushes to `main`, and manual dispatch. It builds the local tarball, installs it into a temporary prefix, and runs the same release metadata check. This keeps the install path exercised before a maintainer cuts a tag.

## What still requires a real release

These checks only exist on a real tagged publish:

- uploaded release artifact presence
- `pnpm release:verify-published -- <version>` against the published package

## npm Trusted Publishing (OIDC) setup

The publish job uses npm Trusted Publishing (OIDC) via the `npm-release` GitHub environment and `release.yml`. No `NPM_TOKEN` secret is required once Trusted Publishing is configured.

### One-time npmjs.com configuration

On [slashcash package settings → Trusted publishing](https://www.npmjs.com/package/slashcash/access):

1. Choose **GitHub Actions** as the publisher.
2. Set **Repository owner** to `Ravikumar911` and **Repository name** to `knitly`.
3. Set **Workflow filename** to `release.yml` (filename only, including `.yml`).
4. Set **Environment name** to `npm-release` (must match the workflow `environment:` value).
5. If the form was created after 2026-05-20, enable the **npm publish** allowed action.

Fields are case-sensitive. npm does not validate the configuration when you save it — mismatches only show up at publish time, often as misleading `404` or `ENEEDAUTH` errors.

### GitHub configuration

1. Ensure the **`npm-release`** environment exists under repo **Settings → Environments**.
2. Remove or stop relying on the repo **`NPM_TOKEN`** secret for releases once OIDC publish succeeds.
3. The publish job needs `permissions.id-token: write` and runs on Node 24 with npm 11.5.1+.

### Provenance

`Ravikumar911/knitly` is public, so the release workflow publishes with npm provenance enabled. Keep `npm publish "$TARBALL" --access public --provenance` in the release workflow unless npm changes its Trusted Publishing requirements.

### Troubleshooting misleading publish errors

| Symptom                                   | Likely cause                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `404` or `ENEEDAUTH` with OIDC configured | `registry-url` on `setup-node` plus empty/missing `NODE_AUTH_TOKEN`, or `NPM_TOKEN` still set on the publish step |
| `404` with otherwise correct OIDC setup   | npm CLI too old — upgrade to npm 11.5.1+ on Node 24                                                               |
| Auth works but publish denied             | Trusted Publisher workflow filename, environment, or repository mismatch on npmjs.com                             |
