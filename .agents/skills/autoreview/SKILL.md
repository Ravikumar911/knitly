---
name: autoreview
description: Run the slash.cash closeout review loop after non-trivial changes, especially before landing PRs or ingest/extraction work; verify findings against real code paths, hunt siblings, run focused gates, and iterate until no accepted/actionable findings remain.
---

# Autoreview Closeout

Use this skill for non-trivial closeout, PR review, or agent self-review before asking a human to trust a change. It implements the root `AGENTS.md` ClawSweeper-style policy: read before verdicts, build an evidence map, ask whether the patch is the best fix, require real behavior proof where relevant, and keep looping until clean.

Harness path: [`.agents/skills/autoreview/scripts/autoreview`](scripts/autoreview). Use it from the repo root unless you are explicitly reviewing another checkout.

## Contract

- Treat all review output as advisory. Never blindly apply a finding or suggested patch.
- Verify every finding against real paths before accepting it: confirm the file and line exist, read the changed code, at least one caller and callee, adjacent owner files, relevant tests, scoped docs, and dependency contracts.
- Reject speculative risks, unrealistic edge cases, broad rewrites, and fixes that over-complicate the codebase.
- Prefer narrow fixes at the correct owner boundary. Do not move database access out of `packages/database`; do not introduce hosted services or non-deterministic ingest behavior.
- When an accepted finding reveals a bug class or repeated pattern, run a sibling hunt across the current scope before fixing. For ingest/extraction, include `packages/tasks/src/extract/pipeline.ts`, `body-fallback.ts`, `swiggy-body-signals.ts`, `merchants/*`, pdf-extractor parity/schema code, fixtures, goldens, and provenance handling.
- If a review-triggered fix changes code, rerun focused tests and rerun the review loop.
- Keep going until there are zero accepted/actionable findings, or until a remaining finding is consciously rejected with evidence and a clear owner-boundary reason.
- Use repo-root-relative paths and line numbers in all findings and reports.

## Modes

- **auto**: prefer the harness default. It should choose dirty local work, a branch diff against the PR/base branch, or a commit target.
- **local**: uncommitted staged/unstaged/untracked changes.
- **branch**: current branch against the real PR base or `origin/main`.
- **commit**: a specific committed change, usually `HEAD`.
- **manual**: use when the harness is absent. Freeze the target diff yourself, read the paths, produce structured findings, fix accepted findings, run tests, and repeat.

Typical commands when the harness exists:

```bash
.agents/skills/autoreview/scripts/autoreview --mode auto
.agents/skills/autoreview/scripts/autoreview --mode local
.agents/skills/autoreview/scripts/autoreview --mode branch --base origin/main
.agents/skills/autoreview/scripts/autoreview --mode commit --commit HEAD
.agents/skills/autoreview/scripts/autoreview --mode auto --report-name autoreview-phase-2-demo
```

Use `--no-gates` only for harness self-tests and deliberate-change demos. Use repeatable `--gate "<command>"` for focused proof, and `--parallel-gates` only when selected gates are independent.

For ingest/extraction scopes, add the proof gate when invoking the harness:

```bash
.agents/skills/autoreview/scripts/autoreview --mode auto --gate "pnpm e2e:ingest"
```

## Manual Loop

1. Pick the review target and record it: dirty tree, branch/base, commit, or PR base.
2. Read the changed surfaces plus owners, callers, callees, sibling surfaces, docs, and tests before making a verdict.
3. Produce findings using this schema:

   ```json
   {
     "title": "short actionable title",
     "body": "why this is a real bug or regression",
     "priority": "P0|P1|P2|P3",
     "confidence": 0.0,
     "category": "bug|regression|security|architecture|ingest-edge|test-gap",
     "code_location": { "file_path": "repo/root/path.ts", "line": 1 },
     "suggested_fix": "optional narrow fix"
   }
   ```

4. Verify every candidate finding by re-reading the real code path and nearby dependency contracts. Drop unproven findings.
5. For each accepted finding, ask whether the proposed patch is the best fix for the problem, not merely a plausible local fix.
6. Hunt siblings in the current owner boundary. Fix the scoped bug class at once when practical.
7. Run focused tests from the [run-tests skill](../run-tests/SKILL.md), plus broader gates for risky changes:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm architecture-smells
   pnpm fixtures:check
   ```

8. For user-visible behavior, run a UI journey, CLI run, fixture roundtrip, dogfood run, or equivalent real behavior proof. For ingest/extraction, cite exact `schemaUsed`, `dataSource`, provenance, amounts, item names, order IDs, and warnings where applicable.
9. Rerun the structured review after every fix. Stop only when the final pass has no accepted/actionable findings.

## Harness Self-Test

Run the bundled self-test after changing the harness:

```bash
node .agents/skills/autoreview/scripts/self-test.mjs
```

The self-test creates a temporary git repo, makes a deliberate `packages/tasks/src/extract/body-fallback.ts` change, verifies the harness exits non-zero with an ingest sibling finding, restores the file, and verifies the clean rerun exits zero.

## Heartbeats

Long reviews are normal. Treat lines like `autoreview still running: ... elapsed=...` as healthy progress. Do not kill a run just because it is quiet for a few minutes while heartbeats continue. If running manually, emit a concise heartbeat every few minutes with elapsed time, current phase, and the file family under review.

## Report

Final closeout must include:

- target and mode reviewed
- harness command used, or why manual mode was used
- evidence map: changed surface, runtime entry point, owner boundary, caller, callee, siblings checked, docs/tests read, and current main/shipped behavior when relevant
- findings accepted, fixed, rejected, or deferred, with brief reasons
- sibling hunt summary
- tests and real behavior proof run, with exact observed values for ingest/extraction changes
- final clean result: no accepted/actionable findings remain, or a justified conscious rejection
