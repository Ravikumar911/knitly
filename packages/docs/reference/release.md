# Reference — Release verification

This document describes the end-user verification story for published `slashcash` packages.

## What the release workflow produces

The tag-triggered release workflow publishes the npm package with provenance and uploads:

- an SBOM artifact (`slashcash-sbom.json`)
- a SHA-256 checksum file (`slashcash.sha256`)
- the packaged tarball smoke results

## What users can verify

After a release:

1. Install or inspect the published package version from npm.
2. Compare the published tarball checksum against `slashcash.sha256`.
3. Review the attached `slashcash-sbom.json` to see bundled dependencies.
4. Inspect the npm provenance attestation for the published package version in the release run.

## Local smoke path

Maintainers can rehearse the release path locally with:

```bash
pnpm pack:local
pnpm bundle:check
```

`pnpm pack:local` builds the CLI tarball and runs the packed-install smoke, which verifies the packaged dashboard layout and required runtime dependencies.

## What still requires a real release

These checks only exist on a real tagged publish:

- npm provenance verification
- uploaded release artifact presence
- `npx -y slashcash@<version> --version` against the published package
