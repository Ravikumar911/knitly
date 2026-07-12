# #70 — Desktop onboarding sequence (full CLI parity)

**Status:** Resolved (HITL grilling completed by user directive: accept recommended defaults; do not leave open).  
**Source of truth for CLI order:** `packages/cli/src/onboard/run.ts` → `buildSteps()`.  
**Non-goal for this ticket:** Do not update map #67 here.

---

## CLI pipeline (actual order)

Privacy is **not** a pipeline step. Before steps run, onboard shows `TOP_BANNER` from `packages/cli/src/privacy/copy.ts`, then:

| # | Step id | Label | User-visible today? | Auto / skip rules |
|---|---------|-------|---------------------|-------------------|
| 1 | `welcome` | Welcome | Banner only (detect always done) | Informational |
| 2 | `assistant-provider` | Assistant provider | Yes (select + optional API key) | `--yes` → `ollama-local` defaults; resume if configured (+ hosted key present); dry-run/E2E skip |
| 3 | `homebrew` | Homebrew | Only on failure | Skip: hosted assistant, non-darwin, already installed, `--skip-external`/dry-run/E2E. **Does not install** — hard error + brew.sh link |
| 4 | `ollama-install` | Ollama install | Spinner | Skip: hosted / skip-external. Darwin: `brew install ollama`; else error + ollama.com |
| 5 | `ollama-service` | Ollama service | Spinner | Skip: hosted / skip-external. Start brew service or `ollama serve` |
| 6 | `chat-model` | Chat model | Yes (select) | Only when Ollama + **fresh** config + not `--yes`. Default `gemma4:latest` |
| 7 | `ollama-pull` | Ollama model | Interactive pull | Skip: hosted / skip-external |
| 8 | `state-dir` | State directory | No | Always ensures `~/.slashcash` dirs |
| 9 | `db-migrate` | SQLite database | No | `ensureLocalDatabase()` |
| 10 | `gmail-account` | Gmail account | Yes | Skip dry-run/E2E; required interactively |
| 11 | `gmail-app-password` | Gmail app password | Yes (note + open URL + password) | Skip if stored creds match address |
| 12 | `imap-verify` | Gmail IMAP verify | Spinner + retry loop | Skip if stored creds and no pending password; retry prompts new password |
| 13 | `local-profile` | Local profile | No | Syncs SQLite profile email to Gmail address |
| 14 | `python-env` | PDF extractor | Yellow note | If missing: detached `doctor --fix --quick` (background). Sync may be body-only until ready |
| 15 | `bundled-skills` | Bundled skills | No | `installBundledSkills()` |
| 16 | `kickoff-sync` | Initial sync | No (detached) | `sync --full` in background; writes pid file |
| 17 | `dashboard-service` | Dashboard service | No | Packaged darwin only; skip in dev / non-darwin |

Final outro: paths summary + `FINAL_SUMMARY` + “run `slashcash start`”.

Cancel / SIGINT copy today points at `slashcash doctor --fix` to resume — that is **CLI resume messaging**, not a desktop doctor product surface.

---

## Agreed desktop user-visible sequence

Linear wizard. First launch (or incomplete onboard) blocks the main dashboard until complete. Screens collapse silent CLI steps into progress; interactive CLI prompts become dedicated screens.

### Screen A — Welcome & privacy

- Brand + short local-first pitch.
- Full privacy facts from `TOP_BANNER` (Keychain/`~/.slashcash`, IMAP-only, assistant choice implications, `127.0.0.1`, no telemetry).
- Primary CTA: **Continue**.
- Maps CLI: pre-pipeline banner + `welcome`.

### Screen B — Assistant provider

- Choices matching CLI select (no `none` in interactive onboard today):
  1. **Ollama** (default; hint: local `gemma4:latest`) — recommended default / `--yes` parity
  2. **OpenAI** — then API key field (same screen or immediate sub-step)
  3. **Anthropic** — then API key field
- Optional control: **Use recommended defaults** (checked by default on first run) → locks Ollama + default model, equivalent to `--yes` for assistant/model prompts.
- Skip if config already has a non-`none` provider and hosted key is present when required (resume).

### Screen C — Local assistant setup *(Ollama path only)*

Single progress screen with ordered checklist (not separate pages):

1. Homebrew present (darwin) — **blocking** if missing: message + link to https://brew.sh/ + Retry / Quit (same as CLI hard fail; desktop does not install Homebrew).
2. Install Ollama if missing (`brew install ollama` on darwin).
3. Start / wait until Ollama reachable.
4. Confirm chat model: if recommended defaults / `--yes` parity → show `gemma4:latest` as selected without a picker; else show the same single-option picker as CLI.
5. Pull model (progress).

**Skip entire screen** when provider is OpenAI or Anthropic.

**Failure UX:**

| Failure | Presentation |
|---------|----------------|
| No Homebrew | Blocking error + brew.sh; Retry after user installs |
| Ollama install fail | Error body (brew stderr summary) + Retry |
| Ollama not reachable | Error + hint (`brew services restart ollama`) + Retry |
| Model pull fail | Error + Retry pull |

### Screen D — Gmail address

- Email field, validate like CLI (`you@gmail.com`).
- Skip if `config.gmail.address` already set (resume).

### Screen E — Gmail app password

- Copy from `PRE_APP_PASSWORD_INPUT`.
- Button: **Open Google App Passwords** (https://myaccount.google.com/apppasswords).
- Password field; normalize spaces; require 16 chars.
- Skip if stored credentials already match the configured address.

### Screen F — Connect (IMAP verify)

- Spinner verifying IMAP.
- Success → continue.
- Failure → symptom / cause / fix (same structured fields as CLI) + **Retry with a different app password** (loops back into password entry / open URL) or Cancel setup.

### Screen G — Finishing up *(progress only; no questions)*

Run, with visible checklist / indeterminate progress:

1. Ensure state dirs (`~/.slashcash`, attachments, etc.).
2. Ensure SQLite / migrations.
3. Sync local profile identity to Gmail email.
4. Install bundled skills (`gmail-swiggy`).
5. Kick off initial sync in background (`sync --full` equivalent).
6. Provision PDF extractor in background (**doctor-equivalent internal call**, same as CLI `doctor --fix --quick`) — note that first sync may be body-only until ready (matches #68: Python not in dmg).
7. Ensure bundled dashboard/runtime is healthy **inside the desktop app** (replaces CLI `dashboard-service` / launchd step — user does not manage a separate service).

### Screen H — Ready

- Local-state summary (home, db, skills, assistant provider, credential store wording from `FINAL_SUMMARY`).
- CTA: **Open slash.cash** → main app shell.
- No “run `slashcash start`” (desktop is already running).

---

## Skip / resume matrix (desktop)

| Condition | Behavior |
|-----------|----------|
| Recommended defaults (first run) | Ollama + `gemma4:latest`; skip model picker; still show Screen C progress |
| Hosted provider | Skip Screen C entirely |
| Resume mid-wizard | Re-enter at first incomplete screen; `detect`-style skips for already-done steps |
| Existing Gmail creds for address | Skip E–F |
| PDF extractor already ready | Screen G marks that item done immediately |
| Cancel / quit mid-flow | Persist progress in config/creds; next launch resumes wizard. **Do not** send users to a Doctor UI |

CLI flags mapped for implementers:

- `--yes` → recommended defaults on B/C
- `--non-interactive` → N/A in GUI (wizard is interactive); CI/E2E may seed state and skip wizard
- `--skip-external` / dry-run → test-only; not a user-facing desktop control
- `--dry-run` / `SLASHCASH_E2E` → seed minimal state for automated tests without Gmail/Ollama

---

## Doctor / repair — CLI-only for v1 (decision)

**Decision:** Doctor stays **CLI-internal / power-user** for v1. No desktop Doctor, Repair, or Health Settings surface yet.

Rationale:

- Onboard only **detaches** `doctor --fix --quick` to provision the PDF Python env; that is an implementation detail, not a product screen.
- Cancel/resume historically mentioned `slashcash doctor --fix`; desktop replaces that with **wizard resume on relaunch**.
- Map fog item (“whether doctor/repair stays CLI-only”) → **CLI-only for v1**.

Desktop still runs the **same repair primitives** under the hood during Screen G (and optionally silent retry on later sync failures), without exposing a doctor UI.

---

## Non-goals (this answer)

- No interactive “skip assistant” / `provider: none` in first-run wizard (CLI onboard select has no `none`; `--yes` forces Ollama).
- No Homebrew auto-install.
- No Windows/Linux onboarding.
- No desktop doctor/repair UI.
- No change to map #67 in this ticket’s close-out.
- Deleting `slashcash onboard` and wiring Electron first-launch is **implement** work after `/to-spec`, not done here.

---

## Glossary pin (for later domain catch-up)

- **Desktop onboarding wizard** — first-launch UI that owns full former-CLI onboard parity.
- **Recommended defaults** — GUI equivalent of `slashcash onboard --yes` (Ollama + default chat model).
- **Doctor-equivalent provision** — background PDF/Python env fix invoked during finishing; not a user-facing Doctor product.
