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

## Provenance note

The publish job uses npm Trusted Publishing (OIDC) via the `npm-release` GitHub environment and `release.yml`. No `NPM_TOKEN` secret is required. The publish job runs on Node 22.14+ with npm 11.5.1+, which Trusted Publishing requires. Provenance is omitted while the source repository is private; npm only supports provenance from public repositories.
