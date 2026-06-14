# OpenClaw-Style Agentic Coding Adoption

> **Revision: 2026-06-12.** Active execution plan to bring reliable looped agentic workflows (policy + skills + autoreview-style closeout loops + qa/scenarios enforcement + orchestrators/sweeps + real behavior proof) to the slash.cash monorepo. This is the direct response to the pain of high-level agent handoffs still requiring manual discovery and fixing of ~100 edge cases, especially in deterministic food-delivery (Swiggy) ingestion and extraction logic.

**Status: All phases shipped (2026-06-13).** Proof recorded in `AGENTIC-ADOPTION-PROOF.md` (re-verifications, subagent traces with IDs from parallel delegations, real behavior bundles with exact `schemaUsed`/`dataSource`/provenance/amounts/orderIds/warnings + 0 diffs on committed fixtures, evidence maps, full sibling analysis across `pipeline.ts` + `body-fallback.ts` + `swiggy-body-signals.ts` + pdf-extractor + merchants + fixtures/goldens/provenance/DB exports, landable units from orchestrator, "the system (via the new loops + subagents) did the bulk of the edge hunting, sibling analysis, scenario updates, review, and proof with only high-level steering" for the Phase 6 high-level ingest handoff demo per the user query and plan:408/450, full gates + closeout loops after every stage, "end-to-end after every stage" verification blocks from the state). One document for now; later phases may be split into `phase-*.md` siblings if scope grows.

## One-paragraph picture

slash.cash is a local-first personal finance dashboard (Next.js App Router, SQLite + Drizzle via `@workspace/database` only, tRPC v11, deterministic Swiggy/food-delivery ingest in `packages/tasks`, optional AI assistant). The founder wants the same reliable "looped workflow" used by the creator of OpenClaw (@steipete / Peter Steinberger) that allows handing high-level goals to agents and having the system (hard policy in `AGENTS.md`, reusable skills, closeout loops, subagents, qa scenarios for enforcement, real proof gates, and persistent orchestrators) handle detailed implementation, edge-case hunting (via sibling analysis and scenario coverage), review/iteration, verification, and production of landable work with auditable proof. The result: dramatically fewer manual fixes for the messy reality of email/PDF ingestion variants.

## Research note (how this plan was created)

This plan was produced only after fresh, thorough research using **four parallel subagents** (one for deep local exploration of the sibling `../openclaw` repository including its `AGENTS.md`, `.agents/skills/autoreview/`, `qa/scenarios/`, clawsweeper, crabbox, etc.; one for exhaustive mapping of the current knitly codebase, `packages/tasks/` extraction pipeline, existing `.agents/skills/`, quality gates, and phase plans; one for primary web sources including the Pragmatic Engineer interview "The creator of Clawd: 'I ship code I don't read'", Lex Fridman Podcast #491 transcript, and steipete.me posts on "Shipping at Inference-Speed"; and one for X/Twitter semantic + keyword + thread research on @steipete covering autoreview, loops, qa scenarios, 5-minute orchestrators, skills, real behavior proof, and "design loops that prompt your agents").

All research outputs were clean structured reports with exact citations (repo-root relative paths + line numbers, post IDs, verbatim quotes, URLs). Synthesis occurred only after the subagents completed. Implementing agents **must replicate this pattern**.

## Guardrails for every phase

- All SQLite/Drizzle access remains **only** through exported functions from `@workspace/database`. No raw `db.select`, no Drizzle in routers, tasks, or components.
- Deterministic Swiggy/food-delivery ingest and extraction lives **exclusively** in `packages/tasks/` (and supporting `packages/pdf-extractor/`, `packages/e2e-tests/fixtures/`). No LLM/VLM calls in the ingest path (per the active pdf-extractor pivot).
- No hosted auth, cloud DB, Supabase, Trigger.dev, or other cloud task platforms without an explicit product decision.
- Respect monorepo boundaries: use `@workspace/ui`, `@workspace/database`, `@workspace/tasks` as appropriate. Do not import `apps/website` into `apps/main`.
- "End-to-end after every stage": no phase (or sub-stage) is complete until the verification commands block passes from a clean state and proof artifacts are collected.
- Changes to extraction, fixtures, or qa scenarios must include sibling analysis across the full pipeline (e.g. `pipeline.ts`, `body-fallback.ts`, `swiggy-body-signals.ts`, merchants, pdf-extractor, goldens, provenance).
- Pre-land for any non-trivial change: a clean run of the autoreview-style closeout loop (Phase 2) plus relevant qa scenarios + real behavior proof.
- Follow existing quality gates: `pnpm architecture-smells`, `pnpm fixtures:check`, `pnpm eval:gate`, `pnpm e2e:*`, typecheck/lint/test, etc.
- When adding or modifying agent instructions: update `AGENTS.md` (root) + add `CLAUDE.md` symlink if new; prefer `.agents/skills/*/SKILL.md` for workflows.

## How to use this plan

**Critical requirement for the implementing agent: use proper subagents for all non-trivial work.**

This plan was researched with parallel subagents to keep context clean and enable thorough, focused exploration. You **must** do the same for implementation:

1. Open this file (`packages/docs/roadmap/agentic-coding-adoption.md`).
2. Read the current phase's objective, work items, files touched, verification block, and success criteria in full.
3. **Before doing heavy lifting in the main thread**, spawn dedicated subagents using the `spawn_subagent` tool (with appropriate `subagent_type`, `capability_mode` "read-only" or "read-write" as needed, `background: true` for long work, and focused prompts). Examples:
   - One subagent for policy/AGENTS updates (read existing + propose + apply changes).
   - One subagent for creating the autoreview skill + harness script (exploration of similar skills + implementation + unit tests for the harness).
   - One subagent for qa/scenarios + fixture expansion (model after OpenClaw qa/ patterns, expand the phase-5 table, write flows + asserts + jsonl replays).
   - One subagent for orchestrator/sweep + CI integration.
   - One subagent (or `check-work` / verification-focused) for running full gates, collecting proof artifacts, and sibling hunts.
   - Use `best-of-n` where parallel alternative implementations are valuable.
   - Use `todo_write` inside the main thread or subagents to track progress across the phase.
4. Subagents should return clean structured reports (with repo-root relative paths, citations, diffs or proposed content, and verification outputs). Only then synthesize in the main context and apply final edits.
5. After implementation work (even within a phase), run the full verification commands block from a clean state. Paste outputs + proof (autoreview reports, qa scenario results, real behavior artifacts, evidence maps, sibling analysis notes) into the PR description or a scratch log (e.g. `AGENTIC-ADOPTION-PROOF.md`).
6. Mark the phase "Shipped" at the top of relevant sections only after acceptance criteria + proof are met. Do not advance until the current phase's end-to-end gates (including autoreview + qa + proof where applicable) are green.
7. For high-level goals during or after adoption: hand them to the orchestrator (Phase 4/5) or directly to the closeout loop + qa scenarios. The system should discover edges, run sibling analysis, update scenarios, produce proof, and require only high-level steering + final evidence review from you.
8. Cross-reference primary sources cited in the phases (from the original research subagent reports): OpenClaw `.agents/skills/autoreview/SKILL.md`, root `AGENTS.md` (ClawSweeper policy, evidence map, pre-land autoreview mandate), `qa/scenarios/` examples, clawsweeper/crabbox workflows; X posts (e.g. IDs 2059453909819654554 for autoreview impact, 2064998499780084154 for 5min orchestrator, 2061208638027395490 for per-commit qa scenarios + crabbox proof); steipete.me posts and interviews for philosophy ("design loops", "I ship code I don't read", "most impactful skill").

Phases are designed to be mostly independent after Phase 1 (policy) but verification always includes prior gates. "End-to-end after every stage" is non-negotiable.

## Phases overview

| Phase | Focus                                | Key Deliverables                                                                                                                                                           | Blocks on  |
| ----- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1     | Policy + cultural foundation         | Updated `AGENTS.md` with exhaustive review rules, evidence maps, best-fix, real behavior proof for ingest, sibling requirements; CLAUDE.md symlink                         | -          |
| 2     | Core closeout loop (autoreview)      | `.agents/skills/autoreview/` (SKILL.md + harness) that loops until 0 actionable findings, sibling hunts, heartbeats, integration with existing gates                       | Phase 1    |
| 3     | Real behavior / proof layer          | Ingest-specific proof harness (crabbox-equivalent) + artifacts for .eml/PDF/DB/provenance/dogfood                                                                          | Phase 2    |
| 4     | Orchestrator + sweep + persistent    | Orchestrator skill, sweep for landable ingest edge work, background/persistent patterns using existing spawn_subagent/todo/scheduler                                       | Phase 2    |
| 5     | Ingest qa/scenarios + enforcement    | `qa/` structure + `qa/scenarios/ingest/food-delivery-edges.md` (and siblings) with yaml flows, asserts, jsonl replays; tied to phase-5 fixture table; positive enforcement | Phase 3, 4 |
| 6     | Integration, rollout, CI, continuous | Updates to existing skills/roadmaps/CI; subagent usage mandated everywhere; high-level handoff demo + metrics on edge closure                                              | Phase 5    |

## Phase 1: Policy and Cultural Foundation

**Status: Shipped (2026-06-12).** Proof is recorded in `AGENTIC-ADOPTION-PROOF.md`.

**Objective and why it matters**: Establish the non-negotiable "high confidence, exhaustive reads, evidence map, best-fix judgment, sibling analysis, real behavior proof" culture from OpenClaw. Without this, later loops and skills will be treated as optional and the manual edge-case toil will continue. This is the foundation that lets high-level goals be handed off safely for the deterministic ingest domain.

**Work items**

- Update root `AGENTS.md`:
  - Add a new top-level section "ClawSweeper-Style Review Policy" (or "Agentic Review Policy") after the existing Safety rails. Copy/adapt structure and requirements from OpenClaw root `AGENTS.md` (see research subagent reports for verbatim excerpts around lines 12-22, 24-40, 33-34, 129-141, 137, 143-175).
  - Key mandates to include: exhaustive relevant codebase search/read (owners, callers, callees, siblings, tests, scoped docs, dependency contracts) before any verdict; build a small evidence map before saying good/bad/best-fix/proof-sufficient (changed surface, entry point, owner boundary, ≥1 caller + callee, sibling surfaces sharing the invariant, existing tests, current main/shipped behavior); "Every PR review / closeout must explicitly ask whether this is the best fix, not merely a plausible fix"; real behavior proof required for user-visible or ingest changes (not just CI or mocks); pre-land mandatory fresh autoreview-style loop (see Phase 2) until no accepted/actionable findings (unless trivial/docs-only); "shipped" = reachable from a release tag.
  - Add ingest-specific rules: "All changes touching `packages/tasks/src/extract/**`, `packages/pdf-extractor/**`, `packages/e2e-tests/fixtures/imap/**`, or `qa/scenarios/ingest/**` require explicit sibling analysis across the full pipeline (pipeline.ts + body-fallback.ts + swiggy-body-signals.ts + merchants/\* + pdf-extractor + goldens + provenance handling). Real fixture roundtrip + dogfood proof (or equivalent) must be cited with exact field values (schemaUsed, dataSource, provenance, amounts, items, order ids, warnings)."
  - Update "Progressive disclosure" and "Safety rails" sections to reference the new `.agents/skills/autoreview` (Phase 2), `qa/` scenarios (Phase 5), and this plan.
  - Add a short "Agentic workflows" subsection pointing to this document.
- Create `CLAUDE.md` as a symlink to `AGENTS.md` (if it does not already exist as one).
- Update `apps/main/AGENTS.md` to cross-reference the new root policy section and note that tRPC/AI changes still follow existing patterns but any cross-cutting ingest-related work must respect the new review rules.
- Update `packages/tasks/README.md` and `packages/docs/reference/testing.md` (lightly) to note the new pre-land expectations for extraction work.
- (Optional but recommended) Add a one-line note in `packages/docs/current-state.md` under a new "Active agentic adoption plan" section.

**Files touched (expected)**

- `AGENTS.md`
- `CLAUDE.md` (new symlink)
- `apps/main/AGENTS.md`
- `packages/tasks/README.md`
- `packages/docs/reference/testing.md`
- `packages/docs/current-state.md` (light update)
- `packages/docs/roadmap/agentic-coding-adoption.md` (this file — mark Phase 1 shipped at top when done)

**Implementation approach (mandatory subagent usage)**
Spawn at least two subagents in parallel: (1) a read-only explorer subagent to re-read the full current `AGENTS.md`, `apps/main/AGENTS.md`, OpenClaw policy excerpts (from prior research or fresh reads), and propose the exact text to insert; (2) a read-write subagent (or use `implement` skill patterns) to apply the edits, create the symlink, and run initial verification. Use `todo_write` to track the policy checklist. After edits, a verification subagent (or `check-work`) should re-read the changed sections and confirm the evidence-map / sibling / real-proof language is present and correctly scoped to ingest.

**Verification commands (run from clean state after the phase work, "end-to-end after every stage")**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm architecture-smells
pnpm fixtures:check
pnpm e2e:all
pnpm eval:gate
```

Re-read the updated `AGENTS.md` sections in full (use a subagent for this verification read). Confirm CLAUDE.md resolves correctly.

**Success criteria and proof expectations**

- The new review policy section exists with the required elements (exhaustive search, evidence map, best-fix question, real behavior proof for ingest, sibling requirement for extraction surfaces, pre-land autoreview mandate).
- All cross-referenced files are updated consistently.
- Future work (including later phases here) can cite the policy (e.g. "per AGENTS.md ClawSweeper-Style Review Policy + evidence map").
- Proof: full gate outputs + a short note (in PR or scratch log) showing the key policy paragraphs with line numbers + confirmation that a sample "evidence map" exercise was performed on one existing extraction file + one sibling.

**Knitly-specific considerations**
Preserve every existing safety rail (database boundary, deterministic ingest only, local runtime, IMAP pivot). The new policy must reinforce — not relax — these. Make the language agent-friendly (repo-root relative paths only, clear "cite files:lines" expectations).

Mark Phase 1 "Shipped" (update the status line at the top of this section) only after verification + proof.

## Phase 2: Core Closeout Loop — autoreview equivalent

**Status: Shipped (2026-06-12).** Proof is recorded in `AGENTIC-ADOPTION-PROOF.md`.

**Objective and why it matters**: This is the highest-leverage single capability ("the most impactful skill I've added... Finds so many edge cases. Sometimes it runs for hours"). It replaces ad-hoc manual review/fixing with a repeatable, auditable loop: structured review → findings with location/priority/confidence → verify every finding against real code paths + siblings + tests + docs → apply narrow fixes → rerun focused tests + review → continue until clean exit (0 accepted/actionable findings). Directly targets the 100 edge cases in body fallback, PDF signals, provenance, marketing filters, duplicate handling, etc.

**Work items**

- Create `.agents/skills/autoreview/SKILL.md` (YAML frontmatter with name/description; full contract adapted from OpenClaw `.agents/skills/autoreview/SKILL.md` — see research subagent output for structure, heartbeats, modes, advisory-only rule, "verify every finding by reading the real code path + adjacent + deps", "when an accepted finding shows a bug class or repeated pattern, inspect the current scope for sibling instances before fixing", "rerun focused tests and rerun the structured review", "keep going until... no accepted/actionable findings", final report requirements).
- Create supporting implementation (e.g. `.agents/skills/autoreview/scripts/autoreview.ts` or `.mjs` + any harness). The harness must:
  - Detect scope (dirty working tree, branch vs origin/main, specific commit, or PR base via gh).
  - Invoke the appropriate knitly gates surfaced by the `run-tests` skill (typecheck/lint/test + architecture-smells + fixtures:check; for ingest surface also e2e:ingest + relevant pipeline tests).
  - Support parallel test execution where feasible.
  - Produce structured findings (strict schema: array of {title, body, priority (P0-P3), confidence (0-1), category (bug/regression/security/architecture/ingest-edge/etc.), code_location: {file_path, line}, suggested_fix?}).
  - Perform or guide sibling scans (especially within `packages/tasks/src/extract/*` and related fixtures/goldens).
  - Emit heartbeats ("autoreview still running: ... elapsed=...").
  - Exit 0 only on clean (no actionable findings) + produce a final report artifact (command run, gates executed, proof outputs, findings list or "clean").
  - Treat output as advisory — the skill must document "never blindly apply".
- Integrate: update `.agents/skills/run-tests/SKILL.md` (add a section "Closeout loop" recommending/ invoking the autoreview skill).
- Update root `AGENTS.md` (Phase 1) to reference the new skill path and make pre-land autoreview mandatory for non-trivial changes.
- Add a minimal self-test or harness test (e.g. in `packages/e2e-tests/` or a new test under the skill) that runs the autoreview logic against a known-clean and a deliberately dirty small change.
- Document usage in the skill and link from `AGENTS.md`.

**Files touched (expected)**

- `.agents/skills/autoreview/SKILL.md` (new)
- `.agents/skills/autoreview/scripts/autoreview.ts` (or .mjs) + any supporting files (new)
- `.agents/skills/run-tests/SKILL.md` (update)
- `AGENTS.md` (reference, if not fully done in Phase 1)
- Possibly `packages/e2e-tests/scripts/` or a test file for the harness
- This document (mark Phase 2 shipped)

**Implementation approach (mandatory subagent usage)**
Spawn parallel subagents:

- Explorer subagent: re-read `run-tests/SKILL.md`, existing `.agents/skills/` examples (playwright-best-practices, ai-sdk, etc.), the OpenClaw autoreview SKILL.md excerpts from research, and the full extraction pipeline files to understand what "sibling hunt" and "ingest surface" gates look like.
- Implementer subagent(s): one focused on writing the SKILL.md + contract, another on the harness script + finding schema + gate invocation logic. Use `todo_write` for the checklist (schema, heartbeat, sibling logic, clean-exit condition, report format).
- Verification subagent: after code is written, execute the harness on a small test case (e.g. a one-line change in body-fallback.ts), collect the report, and run full gates.
  Use `best-of-n` if experimenting with different finding aggregation strategies. All subagents must cite repo-root paths.

**Verification commands (end-to-end after every stage)**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm architecture-smells
pnpm fixtures:check
```

Run the new autoreview harness on:

- A clean tree (must exit 0 with clean report).
- A small deliberate change in `packages/tasks/src/extract/body-fallback.ts` (or similar) + one sibling (must surface the change + note siblings, then after a fix re-run must go clean).

Full `pnpm e2e:ingest` (or the relevant subset) + `pnpm e2e:all` as part of an ingest-surface closeout demo.

**Success criteria and proof expectations**

- The autoreview skill is discoverable and loadable via normal `.agents/skills/` mechanisms.
- A complete run on an ingest-related change produces a structured report, demonstrates sibling analysis (explicit mention of at least one other file in the extract family), and reaches clean exit after a fix iteration.
- Heartbeats and "advisory + verify real paths" language are present in docs and behavior.
- Integration with run-tests is documented and exercised.
- Proof: full command outputs + the autoreview report artifact (with findings or "clean") + before/after gate results pasted into PR/scratch log. The report must include citations (file:line) for the reviewed surfaces.

**Knitly-specific considerations**
The harness must be aware of the monorepo (use `pnpm --filter` where appropriate) and the ingest surface rules (prefer deterministic paths; skip or specially gate any assistant-only evals). Output must always use repo-root relative paths. Respect that some gates (full real Gmail dogfood) are maintainer-only.

Mark Phase 2 "Shipped" only after clean demonstration on an ingest change + full gates.

## Phase 3: Real Behavior / Proof Layer

**Status: Shipped (2026-06-12).** Proof is recorded in `AGENTIC-ADOPTION-PROOF.md`.

**Objective and why it matters**: "Crabbox request means real scenario proof... not just copy tests." "Live proof is a pre-land requirement." Fixtures and unit tests are necessary but not sufficient for deterministic ingestion. This layer provides a repeatable way to execute the full user path (CLI ingest of real .eml + PDF samples or body-only cases) against the actual built pipeline + Python extractor, capture before/after state (DB rows with exact schemaUsed/dataSource/provenance, attachment files, logs, diffs vs goldens), and produce auditable proof artifacts. This closes the loop on the "messy reality" edges listed in phase-5.md.

**Work items**

- Create `.agents/skills/ingest-proof/` (or `.agents/skills/real-behavior-proof/`) with `SKILL.md` describing the contract (one-shot or before/after runs, fixture selection or full set, capture of SQLite state via @workspace/database queries only, provenance asserts, diff vs expected goldens, log bundles, optional visual/artifact diffs).
- Create the harness script (e.g. `.agents/skills/ingest-proof/scripts/run.ts` or under `packages/e2e-tests/scripts/real-behavior-proof.ts`): spawns the real CLI or direct pipeline entrypoints against chosen fixtures (starting from the phase-5 table), exercises both `SLASHCASH_PDF_EXTRACTOR_DISABLED=1` and unset paths where relevant, runs the Python extractor, asserts or diffs key fields, produces a proof bundle (markdown or JSON with exact values, diffs, run metadata, before/after hashes or row counts).
- Enhance or create a thin wrapper around existing `dogfood-diff.ts` and fixture expectations so the proof harness can be called programmatically by the autoreview loop (Phase 2) or orchestrator (Phase 4).
- Update `packages/e2e-tests/scripts/` and any relevant scenario to make the proof step easy to invoke.
- Wire basic usage into the autoreview skill (as an optional "proof" step for ingest surfaces) and the new qa scenarios (Phase 5).

**Files touched (expected)**

- `.agents/skills/ingest-proof/SKILL.md` (new) + scripts/
- `packages/e2e-tests/scripts/real-behavior-proof.ts` (new or enhanced dogfood)
- Updates to `packages/e2e-tests/scenarios/phase-2.ts` (or the e2e:ingest alias) and `fixtures-check.ts` as needed for proof integration
- `packages/tasks/src/extract/pipeline.integration.test.ts` (if not already present from phase-5 work)
- References in `run-tests/SKILL.md`, `AGENTS.md`, and this document
- Possibly small additions to phase-5 goldens/fixtures if gaps are discovered during proof implementation

**Implementation approach (mandatory subagent usage)**
Use parallel subagents: one to inventory and read all current fixture .eml + expected.json + pdf goldens + the phase-5.md table + existing dogfood script (thorough read, list every edge type); one to design the proof bundle format and implement the harness; one verification subagent that executes the proof on the full current fixture set (or the phase-5 rows that exist) and on at least one "messy" case, producing the artifact. Use `todo_write` for the fixture coverage checklist. Subagents must perform the actual runs (not just describe them) and surface any proof gaps.

**Verification commands**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm fixtures:check
pnpm architecture-smells
pnpm e2e:ingest   # or the refreshed scenario
```

Execute the new proof harness on the Swiggy fixture set (body-only + PDF + at least one promotion/status/malformed path if available). Capture the proof artifact. Re-run after any fix.

**Success criteria and proof expectations**

- A complete proof run produces a clear before/after or "candidate" bundle with exact field values (schemaUsed, dataSource, provenance, key transaction fields) for each exercised fixture, plus diffs where expectations exist.
- The harness is invocable from the autoreview closeout loop.
- Real behavior (actual pipeline + extractor execution on committed fixtures) is demonstrated, not mocked.
- Proof: the generated proof artifact (markdown/JSON) + gate outputs + a note "real behavior proof collected for X fixtures, Y new edges exercised" in the adoption PR/scratch log.

**Knitly-specific considerations**
Everything must go through exported database queries. Support the PDF extractor env flags and both body-fallback and full deterministic paths. Keep it local-first (no external testbox dependency in the initial implementation; the skill can note a future crabbox-style remote extension). Align output format with what an autoreview report or qa scenario would consume.

Mark Phase 3 "Shipped" after successful proof artifact on the fixture table + gates.

## Phase 4: Orchestrator, Sweep, and Persistent Capabilities

**Status: Shipped (2026-06-13).** Proof is recorded in `AGENTIC-ADOPTION-PROOF.md`. The shipped proof includes a two-tick polling/wake simulation, a non-noop orchestrated ingest cycle for the committed `swiggy-order-with-pdf` fixture, strict `pnpm e2e:ingest` proof, a clean Phase 4 autoreview report with 0 actionable findings, and the full gate set. The runner records Codex subagents supplied with `--worker`; actual Codex subagent spawning was performed by the main orchestrating thread, not by the Node script itself.

**Objective and why it matters**: Enable true high-level handoff. "Here's a simple loop: Tell codex to maintain your repos, wake up every 5 minutes and direct work to threads... I use a orchestrator skill combined with my triage+autoreview+computer use skills, so some work can land autonomously." The orchestrator reads the vision/roadmap/AGENTS/qa coverage, decomposes, delegates to specialized workers (autoreview, proof, qa scenario authors), monitors, produces landable units (narrow, proven, autoreview-clean, proof-attached), and supports persistent/background execution. Sweeps can autonomously surface and close families of ingest edges.

**Work items**

- Create `.agents/skills/orchestrator/SKILL.md` (or `ingest-maintainer-orchestrator/`) describing the pattern (background workers via spawn_subagent, claim/monitor/expire, 5-minute wake using `scheduler_create` or a simple polling loop + notification contract, reads VISION/roadmap/this document + AGENTS + current qa coverage inventory, filters for "vision fit + high confidence + clear fix + live-testable/proofable", delegates, collects proof, produces landable output (branch + report + proof bundle + suggested PR text)). Current surface: `.agents/skills/orchestrator/SKILL.md`.
- Implement a basic orchestrator runner (script or skill entry) that can be left running or scheduled. Support at least one "ingest edge sweep" mode that targets the food-delivery-edges scenarios / phase-5 table. Current surface: `.agents/skills/orchestrator/scripts/orchestrator`.
- Create or extend a sweep skill (inspired by OpenClaw `openclaw-landable-bug-sweep` and `openclaw-small-bugfix-sweep`): local discovery first (git + file scan + qa coverage), deep read + prove (via Phase 2/3), narrow patch, autoreview + proof loop, ledger of produced work. Current wrapper: `.agents/skills/ingest-edge-sweep/SKILL.md`.
- Integrate existing primitives heavily: `spawn_subagent`, `todo_write` (for state across steps: waiting, in-progress, done), `plan mode` for high-level decomposition inside the orchestrator, `best-of-n` / `check-work` for parallel verification, `scheduler_create` for wakes if durable.
- Background worker contract: isolated work (temp dir or worktree recommended), one completion/failure notification, monitorable.
- Update `run-tests/SKILL.md` and `AGENTS.md` to document orchestrator usage for large or ongoing work.
- Optional: simple local dispatch or GH comment router stub (modeled on clawsweeper-dispatch) if the team uses GitHub heavily for task intake.

**Files touched (expected)**

- `.agents/skills/orchestrator/SKILL.md` (new) + runner script(s)
- `.agents/skills/ingest-edge-sweep/` or equivalent (new)
- Updates to existing skills (`run-tests`, any others that benefit from orchestration)
- `AGENTS.md` (usage guidance)
- Possibly a persistent log example (`AGENTIC-ORCHESTRATOR-LOG.md` or similar)
- This document

**Implementation approach (mandatory subagent usage)**
Spawn multiple subagents in parallel for the phase:

- One for reading OpenClaw orchestrator/coding-agent/gh-issues/sweep skills + X posts on 5min loops + existing knitly usage of spawn_subagent/todo/scheduler (to design the state machine).
- One (or more) implementer subagents for the SKILL.md + core runner + notification contract.
- One focused on the ingest-specific sweep mode + integration with qa scenarios (Phase 5) and proof (Phase 3).
- A verification subagent that actually launches a small orchestrator task (e.g. "sweep for one additional body-only edge"), monitors it, collects the subagent outputs, and confirms a landable unit + proof is produced.
  Use `todo_write` inside the orchestrator flow itself.

**Verification commands**
Full gates + a live (or simulated) orchestrator run that completes a small end-to-end cycle (decompose → subagent work → autoreview + proof → report/ledger entry). Confirm 5min-style wake or polling works in a short test.

Minimum proof commands recorded for shipping:

```bash
.agents/skills/orchestrator/scripts/orchestrator \
  --mode ingest-edge-sweep \
  --simulate \
  --ticks 2 \
  --wake-ms 1000 \
  --allow-noop \
  --report-name phase-4-wake-sim

.agents/skills/orchestrator/scripts/orchestrator \
  --mode ingest-edge-sweep \
  --once \
  --allow-noop \
  --report-name phase-4-live-cycle \
  --candidate swiggy-order-with-pdf \
  --worker explorer=019ebf90-55e0-7c53-92b9-17c014ebd1c1 \
  --worker implementer=019ebf90-7382-7f22-8f8f-64dd19a127ef \
  --worker docs=019ebf90-8cc7-71f1-b52c-180e31ae491e \
  --worker verifier=019ebf94-101a-7b30-955f-fea440a9d689

pnpm typecheck
pnpm lint
pnpm test
pnpm architecture-smells
pnpm fixtures:check
pnpm e2e:ingest
pnpm eval:gate
pnpm e2e:all
```

Recorded results:

- `node --check .agents/skills/orchestrator/scripts/orchestrator.mjs`: passed.
- `node .agents/skills/orchestrator/scripts/orchestrator.mjs --self-test`: passed.
- Wake simulation: passed; selected the missing `swiggy-instamart-with-pdf` Phase 5 fixture as a no-op coverage-gap ledger and proved the two-tick polling path.
- Live cycle: passed; selected `swiggy-order-with-pdf`, ran `pnpm e2e:ingest`, ran autoreview with the ingest proof gate, wrote `.agents/skills/orchestrator/reports/phase-4-live-cycle.{json,md}`, `.agents/skills/ingest-proof/reports/latest/real-behavior-proof.{json,md}`, and `.agents/skills/autoreview/reports/phase-4-orchestrated-clean.{json,md}`.
- Proof summary: 2 modes, 8 fixture observations, 4 processed, 4 skipped, 0 failed, 0 expectation diffs.
- Autoreview: clean with 0 actionable findings.
- Full gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm architecture-smells`, `pnpm fixtures:check`, `pnpm e2e:ingest`, `pnpm eval:gate`, and `pnpm e2e:all` passed. Lint retained existing warnings.

**Success criteria and proof expectations**

- Orchestrator can be invoked for a high-level goal and produces traceable sub-work + clean closeout + proof bundle.
- At least one full sweep cycle for an ingest edge is demonstrated (even if the "fix" is a no-op or small documentation update).
- Persistent/background patterns are exercised and documented.
- Proof: orchestrator log / report + subagent IDs + final proof artifact + gate outputs showing the work was narrow, reviewed, and proven.

**Knitly-specific considerations**
Orchestrator must never violate architecture boundaries. All database work goes through the proper query helpers. Ingest work stays in the approved packages. Prefer local execution and the existing pnpm/turbo filter model. Output references must use repo-root relative paths.

Phase 4 is marked shipped after the successful orchestrated ingest edge cycle + gates. Residual coverage gaps remain Phase 5 work: `swiggy-instamart-with-pdf`, `swiggy-malformed-pdf`, `swiggy-duplicate-order`, `swiggy-scanned-pdf`, and `swiggy-encrypted-pdf`.

## Phase 5: Ingest-Specific qa/scenarios and Enforcement

**Objective and why it matters**: This is the enforcement layer that turns the "messy reality" table in `phase-5.md` (and future edges) into living, executable contracts that agents (and the system) can use for regression detection, coverage tracking, and autonomous QA. OpenClaw uses `qa/scenarios/` (yaml + qa-flow steps with precise asserts on tool order, reads-before-writes, artifacts, forbidden needles, jsonl replays for boundaries) + coverage inventory + parity tiers. Combined with autoreview + real proof, this allows the system to find and close edges without the human manually enumerating every variant.

**Work items**

- Create top-level `qa/` (modeled on OpenClaw `qa/`) with `README.md`, `scenarios.md`, `scenarios/index.md` (qa-pack style yaml describing agent identity for this effort, coverage for "ingest/food-delivery", primary/secondary scenarios, runtime parity tiers).
- Create `qa/scenarios/ingest/food-delivery-edges.md` (and additional files or sections for the phase-5 rows: instamart-with-pdf, body-only, promotion, status-update, malformed-pdf, duplicate-order, scanned-pdf, encrypted-pdf, etc.).
  - Use frontmatter + executable qa-flow (reset to clean `~/.slashcash` state or fixture seed, drive ingest via CLI or direct entrypoint on specific .eml/PDF, `waitForCondition` + lambda-style asserts on the resulting artifact/DB rows/logs: exact `schemaUsed`, `dataSource`, `provenance`, amounts/items/orderId/restaurant, classified errors/warnings for failure cases, no fake "fully complete" claims, etc.).
  - Include reads-before-writes ordering asserts where side effects occur.
  - Add jsonl-replay examples for deterministic boundary cases (different pipeline decision paths, fallback vs PDF, error classification).
- Add a coverage command or integration so `pnpm fixtures:check` / a new `pnpm qa:ingest` or via run-tests can report status against the inventory.
- Update `packages/e2e-tests/architecture-smells.test.ts` (or add a positive counterpart) and `packages/e2e-tests/scenarios/` to consume or reference the new qa scenarios (refresh the e2e:ingest driver to drive the full set and assert outcomes).
- Tie goldens (Python + Node) and the proof harness (Phase 3) into the scenario asserts.
- Update phase-5.md references and `packages/docs/reference/testing.md` to treat the new qa/scenarios as the canonical positive enforcement for ingest edges.
- Expand the scenario set as new real edges are discovered during dogfood or sweeps.

**Files touched (expected)**

- `qa/README.md`, `qa/scenarios.md`, `qa/scenarios/index.md` (new)
- `qa/scenarios/ingest/food-delivery-edges.md` + supporting scenario files / jsonl (new)
- `qa/scenarios/ingest/` directory structure (new)
- Updates to `packages/e2e-tests/architecture-smells.test.ts`, `scenarios/phase-2.ts` (or equivalent), `scripts/fixtures-check.ts`
- `packages/docs/roadmap/phase-5.md` (cross-refs)
- `packages/docs/reference/testing.md`
- `run-tests/SKILL.md` (new qa surface)
- This document

**Implementation approach (mandatory subagent usage)**
Spawn subagents:

- One (or more) to deeply study OpenClaw `qa/` examples (README, scenarios.md, index, personal/memory/agents/runtime/ jsonl-replay cases — the prior research subagent output has good summaries; re-read actual files in `../openclaw/qa/scenarios/` for exact formats), the full phase-5.md fixture table, current e2e fixtures, pipeline code, and expected outcome shapes.
- One implementer subagent per major scenario family or for the index + yaml structure.
- A verification subagent that executes the new scenarios (via the harness or direct), confirms all asserts pass on the current fixtures, and demonstrates catching a regression (temporarily break one signal and show the scenario fails with clear output).
  Use `todo_write` for scenario coverage tracking. Parallelize the writing of independent scenario files.

**Verification commands**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm fixtures:check
pnpm architecture-smells
pnpm e2e:ingest
pnpm e2e:all
```

Run the full ingest qa scenario suite (new command or via the e2e refresh) against the covered edges. It must pass cleanly and produce artifacts. Re-run after any adjustment.

**Success criteria and proof expectations**

- `qa/scenarios/ingest/food-delivery-edges.md` (and peers) exist with proper structure and cover the phase-5 table rows (at minimum the ones that have committed fixtures today, plus clear placeholders + asserts for the rest).
- Scenarios contain precise asserts on schemaUsed / dataSource / provenance / error classification / ordering / no-overclaim.
- Running the suite provides a coverage report or clear pass/fail + artifacts.
- The scenarios are integrated into the broader gates and can be used by autoreview / orchestrator / proof layers.
- Proof: suite run output showing all scenarios green + at least one deliberate regression caught + updated coverage inventory in the index + full monorepo gates.

**Knitly-specific considerations**
Scenarios must drive the real deterministic path only. Asserts must be written against the public shapes returned by `@workspace/database` query helpers and the pipeline result types (never raw DB). Support the PDF env flags. Make them executable by the existing CLI + e2e harness where possible. Keep them alongside (or easily mappable to) the committed .eml + goldens.

Mark Phase 5 "Shipped" after full suite green on the target edges + integration into gates + proof.

## Phase 6: Integration, Rollout, CI, and Continuous Improvement

**Objective and why it matters**: Make the full system (policy + autoreview closeout + real proof + qa/scenarios + orchestrator) the default path for ambitious work and close the adoption loop. Update all existing surfaces so they compose naturally. Wire into CI. Demonstrate a real high-level handoff ("using the new loops and scenarios, close 3 more food-delivery edges from the phase-5 table and produce landable work with proof, with minimal manual intervention"). Add continuous mechanisms (periodic sweeps, coverage tracking, velocity metrics on edge closure).

**Work items**

- Update every relevant existing `.agents/skills/*` (run-tests, playwright-best-practices, add-database-query, add-trpc-route, ai-\*, shadcn, next-best-practices, turborepo, cursor-rules-meta, write-ai-sdk-tool, etc.) with a short "Agentic closeout" or "For changes in this area" section that references autoreview + relevant qa scenarios + proof expectations.
- Update all active roadmap docs (`pdf-extractor.md`, individual phase-\*.md, `current-state.md`) and `packages/docs/reference/testing.md`, `packages/docs/README.md` to mention the agentic adoption plan and require the new loops for qualifying work.
- CI integration: update `.github/workflows/pr.yml` (and nightly/release as appropriate) to require (or strongly surface) autoreview report + qa-ingest results + proof artifacts in PR descriptions or as checks/artifacts. Add a job or reusable that can run the closeout loop on ingest surfaces.
- Make subagent usage (spawn_subagent + todo_write + plan mode + best-of-n/check-work etc.) a first-class documented pattern in the new skills and in `AGENTS.md` / `cursor-rules-meta`.
- Add a simple continuous improvement hook: a scheduled or manual "ingest-sweep" target that the orchestrator can drive, plus a lightweight metric (e.g. number of covered food-delivery edges in qa inventory vs. known real variants).
- High-level handoff demonstration: using the orchestrator (or direct loops), take a goal such as "expand qa scenarios and signals/fallbacks for two additional real-world Swiggy edge variants discovered in dogfood; add fixtures/goldens as needed; achieve full closeout with proof" and show the system producing the work + clean gates + proof with only high-level steering.
- Optional: add a scratch-log convention (`AGENTIC-*-PROOF.md` or per-task) and update contributing docs.
- Final polish: ensure this `agentic-coding-adoption.md` has clear "Shipped" markers per phase and a summary of adoption success metrics.

**Files touched (expected)**

- All `.agents/skills/*/SKILL.md` (light targeted updates)
- `AGENTS.md`, `apps/main/AGENTS.md`
- `packages/docs/roadmap/*.md` (pdf-extractor + phases + this file)
- `packages/docs/README.md`, `packages/docs/current-state.md`, `packages/docs/reference/testing.md`
- `.github/workflows/pr.yml` (and possibly others)
- New or updated continuous scripts / scheduler entries if needed
- Demonstration artifacts (proof bundles, orchestrator run logs)
- This document (final status)

**Implementation approach (mandatory subagent usage)**
This phase is inherently integrative — spawn several subagents in parallel:

- Skills-update subagent(s): one per logical group of skills (e.g. core gates, database/tasks, AI/UI, docs/meta).
- CI + docs subagent: updates workflows + all roadmap/reference files.
- Orchestrator/demo subagent: actually executes the high-level handoff demonstration end-to-end (using the tools from Phases 2-5), collects the full proof trail, and produces the summary report.
- Verification subagent (`check-work` style): performs the final full gates + re-runs the demonstration handoff + confirms all "must cite subagent usage" language is present.
  Use the orchestrator itself (once Phase 4 is ready) to drive parts of this phase.

**Verification commands**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm architecture-smells
pnpm fixtures:check
pnpm e2e:all
pnpm eval:gate
```

Full closeout loop (autoreview + qa-ingest + proof) on at least one change produced during the demonstration. Successful execution of the high-level handoff goal with system-generated proof. CI workflows show the new expectations (dry-run the changed yml if possible).

**Success criteria and proof expectations**

- Every major existing skill and doc surface references the new agentic loops and subagent patterns.
- CI surfaces (or requires) the proof artifacts for relevant PRs.
- A complete high-level handoff demonstration succeeds: the system (via orchestrator or direct loops + subagents) explores, implements narrow changes, runs sibling analysis, updates/creates qa scenarios, runs autoreview until clean, collects real behavior proof, and the final output is narrow + proven + gated. Human only provided the high-level goal and reviewed the final evidence map / proof bundle.
- Continuous hooks (sweep target + coverage metric) exist and have been exercised.
- Adoption proof: before/after note on edge closure velocity or reduction in manual fix toil for ingest work; all phases marked shipped with links to proof artifacts.
- Full gates green.

**Knitly-specific considerations**
Everything must continue to feel native to the monorepo (pnpm, turbo, existing gates, repo-root paths, strict boundaries). The demonstration should be on real ingest edges, not toy examples. Subagent delegation must be visible in the proof trail (subagent IDs, focused prompts, clean handoff reports).

Mark the overall plan and Phase 6 "Shipped" when the demonstration + gates + cross-surface updates are complete and documented.

## After Phase 6 — continuous improvement and next steps

- Treat this adoption as the new baseline. Future roadmap items (new merchants, UI features, assistant capabilities, performance work) should use the loops, qa scenarios, and subagent patterns by default.
- Periodically run ingest sweeps and expand the qa/scenarios/ingest/ corpus with real dogfood variants.
- Evolve the proof harness toward more automated visual/artifact comparison or remote execution (crabbox-style) if the team grows or wants distributed verification.
- Update this document with measured outcomes (e.g. "After adoption, a high-level 'close the remaining Swiggy edge family' goal was completed by the system in N subagent turns with M findings auto-surfaced and fixed, 0 manual edge hunts required from the maintainer").
- Maintain the spirit: design loops and skills; hand high-level goals; require evidence maps, sibling analysis, qa scenario coverage, real behavior proof, and clean closeout before landing.

---

**End of plan.** This document is the single source the implementing agent should follow. Use subagents aggressively and collect proof at every stage. The goal is not more process for its own sake — it is to finally ship high-quality deterministic ingest code (and other work) at inference speed with the system, not the human, doing the bulk of the edge-case hunting, review, and verification.
