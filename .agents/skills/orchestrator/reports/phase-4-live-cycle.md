# Orchestrator Run

- Generated: 2026-06-13T06:05:25.351Z
- Mode: ingest-edge-sweep
- Status: done
- No-op: no
- Goal: Sweep one food-delivery ingest edge

## Inventory

- Files seen: 12
- Files missing: 3
- Fixture rows: 9
- Covered fixtures: 4
- Coverage gaps: 5
- Gap IDs: swiggy-instamart-with-pdf, swiggy-malformed-pdf, swiggy-duplicate-order, swiggy-scanned-pdf, swiggy-encrypted-pdf

## Candidate

- swiggy-order-with-pdf: verified
- Reason: Committed fixture is already covered by strict proof.
- Fixture: packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.eml
- Expected: processed, schemaUsed = swiggy.deterministic.v1, exact amount, item count, order id

## Workers

- explorer: 019ebf90-55e0-7c53-92b9-17c014ebd1c1 (completed-or-external)
- implementer: 019ebf90-7382-7f22-8f8f-64dd19a127ef (completed-or-external)
- docs: 019ebf90-8cc7-71f1-b52c-180e31ae491e (completed-or-external)
- verifier: 019ebf94-101a-7b30-955f-fea440a9d689 (completed-or-external)

## State Transitions

- idle: start
- inventory: read roadmap, policy, skills, fixtures
- candidate_selected: swiggy-order-with-pdf
- claimed: local one-shot claim
- delegated: 4 worker traces
- wake: claim tick 1
- proof_running: pnpm e2e:ingest
- autoreview_running: autoreview + ingest proof
- verified: proof clean
- ledgered: reports written
- done: cycle complete

## Commands

- pass `pnpm e2e:ingest` (1009ms)
- pass `.agents/skills/autoreview/scripts/autoreview --mode local --report-name phase-4-orchestrated-clean --gate "pnpm e2e:ingest"` (1066ms)

## Proof Summary

```json
{
  "fixtureCount": 8,
  "modesRun": 2,
  "diffCount": 0,
  "processedCount": 4,
  "skippedCount": 4,
  "failedCount": 0
}
```

## Artifacts

- Ingest proof: .agents/skills/ingest-proof/reports/latest/real-behavior-proof.md
- Autoreview: .agents/skills/autoreview/reports/phase-4-orchestrated-clean.md
