---
name: ingest-proof
description: Run deterministic Swiggy fixture ingest through the local pipeline and collect exact JSON/Markdown proof artifacts for schema, source, provenance, amounts, orders, warnings, and expectation diffs.
---

# Ingest Proof

Use this skill for ingest/extraction closeout when a change needs real behavior proof, not only unit tests. It runs committed IMAP Swiggy fixtures through the local fixture-backed sync path, stores results in an isolated SQLite database, compares each fixture with its sibling `*.expected.json`, and writes auditable proof bundles.

Typical strict gate from repo root:

```bash
pnpm e2e:ingest
```

Useful options:

```bash
pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --mode pdf-disabled
pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --mode pdf-enabled --fixture swiggy-order-with-pdf
pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --no-strict
pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --strict
```

Review the generated JSON and Markdown under `.agents/skills/ingest-proof/reports/`. The default gate exits non-zero when expected fixture fields differ from observed real pipeline output; use `--no-strict` only when collecting proof for known current drift that cannot be fixed in the current scope.
