# Audit — what slipped through Phase 1 and Phase 2

> *Snapshot taken at the boundary between Phase 2 and Phase 3. Each item below is a verified gap between the phase docs and the code on disk. Items are tagged with a target phase for fix-up so we don't lose them.*

This document is the input to Phase 3. It exists because the standing convention says a phase isn't done until its end-to-end scenario passes — and Phases 1 and 2 shipped their happy-path scripts but left a number of doc-promised items either half-built or skipped. Phase 3 owns the fix-ups for the user-facing ones (onboard UX, progress, auth recovery), Phase 4 owns the test debt, Phase 5 owns the release/observability debt.

## How to read

Each finding is `[severity] description — fix in <phase>`. Severity is the simplest possible scale:

- **block** — blocks a real user from succeeding on the documented happy path.
- **leak** — old cloud surface still present; doesn't break anything but contradicts ADR-013 / Phase 1 success criterion 5.
- **gap** — the doc promised it, the code doesn't have it; product is fine without it today but the gap will compound.

## Phase 1 — what slipped

### Auth surface not fully deleted (leak — fix in Phase 3 W0)

Phase 1 W4 says the `(auth)` route group, `app/auth/callback/`, and `components/auth/` are deleted. On disk today:

- `apps/main/app/(auth)/login/` exists (empty directory).
- `apps/main/app/(auth)/register/` exists (empty directory).
- `apps/main/app/auth/callback/` exists (empty directory).

The directories are empty so Next doesn't serve a login UI from this app, but they're a tripping hazard: someone adds a `page.tsx` later and a login page resurfaces. The Phase 1 acceptance grep — "no `@supabase/` imports inside `apps/main/`" — passed because there are no files left to import anything; the directory check was never written.

**Fix.** Delete the three empty directories. Add a small E2E assertion (Phase 4 W1) that `GET /auth/login` returns 404 from a freshly built app.

### `user_google_tokens` reference still in query layer (leak — fix in Phase 3 W0)

`packages/database/src/queries/operations/emailSync.ts` still contains a `user_google_tokens` reference. The table itself was removed from the schema in Phase 1 W3, but the query reference was missed. This compiles only because the call path is dead.

**Fix.** Remove the reference; ensure the file compiles against the current SQLite schema; add a grep gate alongside the existing Phase 1 grep gate ("no references to `user_google_tokens`, `token_access_logs`, `auth.users` in `packages/`").

### Phase 1 grep gate is incomplete (gap — fix in Phase 4 W2)

The acceptance gate for W1 is "a grep for the removed package names returns zero hits in shipping code." This is a one-shot manual check. There is no automated test that fails if someone re-adds `@supabase/`, `@trigger.dev/`, `@vercel/analytics`, `@ai-sdk/openai`, `@ai-sdk/anthropic` or `@ai-sdk/mistral` to a workspace `package.json`.

**Fix.** Add an `architecture-smells.test.ts` (openclaw has the pattern) under `packages/e2e-tests/` that runs in CI, walks every `package.json` and source file, and fails on any forbidden import. Same test enforces the directory-deletion rule from the previous item.

### `db reset` / `db seed` exist but the CLI `db` group is undocumented (gap — fix in Phase 5 W2)

W6 produces `slashcash db seed` and `slashcash db reset`. They work. They are not listed in `reference/cli.md`, the `--help` output for `db` is sparse, and there is no acceptance test that `db reset` actually deletes the file rather than corrupting it on a partially-migrated state.

**Fix.** Document the `db` subcommand surface in `reference/cli.md`. Phase 4 adds the integration test.

## Phase 2 — what slipped

### `onboard` is a straight-line script, not a wizard (block — fix in Phase 3 W1)

Phase 2 W1 says the wizard is "idempotent and cancel-safe", that it "streams the [model pull] progress output as-is rather than hiding it behind a spinner", and that re-running after success is "a fast no-op". On disk today (`packages/cli/src/onboard/run.ts`):

- Steps run unconditionally — there's no idempotency check that skips Homebrew if it's present and verified, no skip for an already-installed Ollama service, no skip for an already-pulled model, no skip for an already-authenticated `gws`.
- Subprocess output is buffered through `runCommand` and only printed on failure. The user sees no progress during a multi-minute `ollama pull` or `brew install`.
- There are no interactive prompts at all, even where ADR-018 (added by Phase 3) says we should ask. Specifically, there is no chat-model question — the user can never pick anything other than `gemma3n:e4b` short of editing `config.json` afterwards.
- Cancellation in the middle of `ollama pull` leaves the model partially downloaded and there's no doctor repair for it.

**Fix.** Phase 3 W1 rewrites onboard around a step pipeline (each step exposes `detect / install / verify`), adds a single chat-model question (default `gemma3n:e4b`, alternate options listed), streams progress for the steps where the user benefits from seeing it, and makes every step idempotent.

### Doctor is missing the `--quick` and `--json` flags (gap — fix in Phase 3 W3)

Phase 2 W9 promises `doctor --quick` (filesystem-only, skips network probes) and `doctor --json` (machine-readable for future menu-bar / Raycast integrations). Neither flag exists. The current `--fix` flag is implemented.

**Fix.** Phase 3 W3 lands both flags and standardises every doctor check on a `{ id, label, status, fix?, evidence?, durationMs }` shape.

### Skill manifest job declarations not wired into the cron registry (gap — fix in Phase 3 W4)

Phase 2 W7 says "skills declare the jobs they contribute, and the registry picks them up at start" and that the cron worker is data-driven from skill manifests. On disk: `packages/cli/src/skills/registry.ts` enumerates and copies bundled skills, validates the manifest, and respects an `enabled` flag — but `packages/cli/src/start/cron.ts` and `packages/tasks/src/runtime/jobRegistry.ts` are wired to a hard-coded Gmail-Swiggy job rather than driven by the manifest's `jobs` array. Disabling the skill via `slashcash skills disable` does block the run (the mutex/fixture path returns "skill is disabled") but only because the hardcoded path checks the registry, not because the cron registration itself is conditional.

**Fix.** Phase 3 W4 makes the cron registry truly data-driven: at `start`, enumerate enabled skills, register each declared job at the schedule the manifest specifies, deregister on `stop`. Adding a skill folder mid-session shows up after the next `slashcash sync` or process restart (the doc says no restart needed; revisit that promise in Phase 3 W4).

### `gws auth` failure modes have no actionable surface (block — fix in Phase 3 W2)

Observed in the wild during Phase 2 dogfooding:

```
{
  "error": {
    "code": 401,
    "message": "OAuth flow failed: Server error: invalid_client: The provided client secret is invalid.",
    "reason": "authError"
  }
}
error[auth]: OAuth flow failed: Server error: invalid_client: The provided client secret is invalid.
```

This is a `gws`-side OAuth client config error — the upstream `gws` build's bundled client id/secret pair is rejected by Google. Per ADR-004 we don't own the OAuth flow, so we can't "fix" it from inside our code. But today the user gets a wall of JSON, no guidance, and no signal that this is *not* their fault.

**Fix.** Phase 3 W2 adds a thin error-classification layer over the `gws` wrapper. Known stderr signatures (the four documented ones plus `invalid_client`, `access_denied`, `redirect_uri_mismatch`) map to a closed `GwsAuthError` union. The CLI prints a one-line symptom, a one-line cause, and a one-command fix — for `invalid_client`, the fix is "your `gws` install has a stale client config; reinstall with `brew reinstall googleworkspace/tap/gws` or follow [docs link]". Doctor surfaces the same diagnosis. We do **not** ship our own OAuth client (ADR-004 stands).

### Onboard skip flags are anti-features in production (gap — fix in Phase 3 W1)

`--skip-external` and `--skip-auth` exist primarily so the E2E harness can run without a live machine. They're undocumented in `reference/cli.md` and would surprise a real user if they discovered them. They also short-circuit critical safety checks.

**Fix.** Phase 3 W1 keeps the dry-run behaviour but moves the skip flags behind `SLASHCASH_E2E=1` (env-gated) so they don't appear in `--help` for end users.

### No release pipeline; not published to npm (block — fix in Phase 5 W1)

Phase 2 W8 says "a GitHub release workflow that builds and publishes `slashcash` to npm with a provenance attestation, and smoke-tests the tarball on a clean macOS machine." On disk: `packages/cli/scripts/bundle-app.mjs` exists and produces the standalone tree, the `bin` field is set, the `files` array is correct, but there is no release workflow, no provenance attestation, no `npm publish` ever happens, and the smoke test on the published tarball doesn't exist. Phase 2 success criterion 8 ("`slashcash` is published on npm") is unmet.

**Fix.** Phase 5 W1 lands the release workflow and the post-publish smoke test.

### Evals not wired as a quality gate (gap — fix in Phase 5 W3)

Phase 2 W10 says evals run in CI on every push with a hard threshold per ADR-012. They don't. ADR-012 still has the placeholder threshold ("ninety percent of baseline"), the harness has been refactored to the local provider, but no CI workflow runs it and no merge is gated on it.

**Fix.** Phase 5 W3 fills in ADR-012 with a real number after a prototype pass on real data, then wires the eval run into CI as a required check.

### Test pyramid is missing its bottom and middle layers (gap — fix in Phase 4)

`reference/testing.md` defines three layers: unit, integration, E2E. Today only the E2E layer exists (and only the happy path of one scenario per phase). The "middle layer" — integration tests for the gws wrapper, the Ollama provider, the doctor checks, the cron single-flight, the attachment route, the skill registry — was never written. Per-package unit tests are absent across `packages/cli`, `packages/database`, `packages/tasks`, `packages/ui`.

**Fix.** Phase 4 in its entirety. See `phase-4.md`.

### Standalone bundle path is not exercised by anything (gap — fix in Phase 5 W1)

`packages/cli/scripts/bundle-app.mjs` runs and produces an output tree. Nothing in CI invokes it, nothing checks that the resulting tree boots, and `slashcash start` has not been verified to detect the bundled vs. dev distinction in a real install context. The first time someone runs `npm i -g slashcash` from a published tarball will be the first time this code path is used in anger.

**Fix.** Phase 5 W1 adds a "pack and run from tarball in a clean home" job to CI, gated on every release-candidate PR.

### Logs directory is created but no rotation, no schema, no ergonomics (gap — fix in Phase 5 W4)

Phase 1 W2's runtime building blocks list "a logging module that writes structured JSON lines into `~/.slashcash/logs/`." The directory exists, log lines are written, there's no rotation, no schema validation on the way out, no `slashcash logs` reader (the command exists but is the placeholder "coming in Phase 2" stub), and the only structured field that's reliably set is `level`.

**Fix.** Phase 5 W4 lands a small `LogEvent` schema, daily rotation with size cap, and `slashcash logs` (`--tail`, `--follow`, `--filter`).

## Severity totals

| Severity | Phase 1 | Phase 2 |
| -------- | ------- | ------- |
| block    | 0       | 2       |
| leak     | 2       | 0       |
| gap      | 1       | 7       |

Two blocks and most of the gaps map to Phase 3 (user-facing fixes) and Phase 4 (test debt). Phase 5 picks up release, evals, logs and the standalone-bundle smoke test.

## Process lesson

Phases 1 and 2 each shipped a single happy-path E2E script and called the phase done. The audit shows that "happy path passes" is a necessary but not sufficient condition. From Phase 3 onward, the phase exit checklist explicitly includes:

1. Re-run the previous phases' E2E scripts and verify they still pass.
2. Run the new phase's E2E script.
3. Run the architectural smell tests (forbidden imports, forbidden directories, forbidden DB references).
4. Diff `reference/cli.md` against actual `--help` output and fail if drifted.
5. Audit the previous phase's doc for items the implementation didn't cover, and either land them in this phase or move them explicitly to a later phase with a note in this audit file.

This is the pattern openclaw enforces and we should match it.
