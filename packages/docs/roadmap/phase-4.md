# Phase 4 — Fast onboarding and assistant provider setup

> _Phase 4 of 5 in the Swiggy ingest pivot. Depends on [`phase-1.md`](./phase-1.md), [`phase-2.md`](./phase-2.md), and [`phase-3.md`](./phase-3.md). Read [`pdf-extractor.md`](./pdf-extractor.md) first._
> _Status: Pending. Owner: next agent._

## Goal

A new user runs `slashcash onboard`, types Gmail address + app password, and lands on the dashboard at `http://127.0.0.1:3000` **without** waiting for an Ollama model pull. The first Swiggy sync runs in the background using the parallel pipeline from Phase 3. Once the user opens the assistant tab, they pick **how** they want chat to work — local Gemma via Ollama, an OpenAI-compatible API key, or "skip for now" — and only then is any model downloaded or provider call made.

## Onboarding flow (target)

```
1. Welcome
2. State directory + config (~/.slashcash/)
3. Gmail address
4. Gmail app password  ──> verify IMAP login
5. SQLite migrate
6. Local profile
7. Python venv check (fast: existing venv → skip; missing → start in background)
8. Bundled skills
9. Start dashboard + first Swiggy sync (background)
   └─> "Open http://127.0.0.1:3000 — your transactions will appear as they sync."
```

There is **no** Ollama install, no model pull, and no model selection in the onboarding wizard.

The assistant provider is configured **after** the user reaches the dashboard, on the assistant tab itself.

## Work items

### 4.1 Reorder the onboarding wizard

In `packages/cli/src/onboard/run.ts`:

- Remove `modelQuestionStep`, `ollamaInstallStep`, `ollamaServiceStep`, `ollamaPullStep` from the default `buildSteps()` chain.
- Keep them as **named functions** so `slashcash doctor --fix` and the assistant setup flow can reuse them.
- Move `gmailAccountStep`, `gmailAppPasswordStep`, `imapVerifyStep` to run **before** `homebrewStep`. Homebrew is only needed if the user later opts into local Ollama; in v1 we can drop it from the default chain entirely. (Leave Homebrew detection in `doctor`.)
- The new ordering becomes: `welcome → stateDir → dbMigrate → gmailAccount → gmailAppPassword → imapVerify → localProfile → pythonEnv → bundledSkills → kickoffSync`.

### 4.2 Non-blocking Python venv check

`pythonEnvStep` rules:

- If `~/.slashcash/py-venv/bin/python` exists and `python -m slashcash_pdf_extractor --self-check` returns 0: mark step done.
- If missing: spawn `slashcash doctor --fix python-env` **detached**, print `Installing PDF extractor in the background — sync will use body-only extraction until it's ready.`, and continue. Do not block the wizard.
- If the user runs `slashcash onboard --non-interactive --yes` and the venv is missing, still proceed; ingest degrades to body-only until doctor finishes.

### 4.3 Background initial sync after onboarding

Add a final `kickoffSyncStep`:

- Spawn `slashcash sync --full --background` as a detached child process tied to a PID file (`~/.slashcash/pid/sync.pid`).
- The CLI immediately prints:
  ```
  done Onboarding complete.
  • Dashboard: http://127.0.0.1:3000
  • Initial sync running in background (Swiggy, last 365 days). Track progress in the dashboard.
  ```
- `slashcash status` already shows sync state; reuse it.
- `slashcash start` becomes safe to run while a background sync is in flight (the Phase 3 single-flight mutex handles overlap).

### 4.4 Assistant provider selection (post-onboarding)

The assistant tab in `apps/main/app/(authenticated)/assistant/` becomes the place where the user picks a chat provider. Until they do, the assistant shows an empty state with three CTAs.

#### Provider options

| Option | Storage | Notes |
| --- | --- | --- |
| Local Ollama (Gemma) | `~/.slashcash/config.json:assistant.provider = "ollama-local"`, `assistant.chatModel`, `assistant.baseUrl` | CTA opens a CLI flow (`slashcash assistant install ollama`) that runs the existing `ollamaInstallStep / ollamaServiceStep / ollamaPullStep` chain. The dashboard polls `/api/assistant/health` until ready. |
| OpenAI-compatible API key | `~/.slashcash/config.json:assistant.provider = "openai-compatible"`, `assistant.baseUrl`, `assistant.chatModel`; key in keychain (or `~/.slashcash/credentials.json`) | Single form: API key, optional base URL (defaults to `https://api.openai.com/v1`), model name. Validates by streaming one token before saving. |
| Anthropic / Claude API key | `~/.slashcash/config.json:assistant.provider = "anthropic"`, `assistant.chatModel = "claude-..."`; key in keychain | Adds `@ai-sdk/anthropic` to `apps/main` only. Behind a feature flag `SLASHCASH_ASSISTANT_ANTHROPIC=1` until a maintainer signs off on the new dependency. The UI option is hidden when the flag is off. |
| Skip for now | `assistant.provider = "none"` | Assistant tab shows "Configure a chat provider to ask questions about your data." Dashboard analytics are unaffected. |

#### Default model menu (Local Ollama option)

When the user picks Local Ollama, offer the existing menu from `onboard/run.ts:modelQuestionStep`:

- `gemma4:latest` (default — current repo default)
- `gemma4:e2b`
- `qwen2.5:7b`

Document the chosen model in `packages/docs/reference/config.md`.

#### Provider abstraction

Refactor `apps/main/lib/ai/provider.ts`:

```ts
export function getAssistantProvider(config: AssistantConfig): {
  model: LanguageModel;
  ready: boolean;
  reason?: string;  // e.g. "ollama-not-running", "missing-api-key"
}
```

The assistant route (`apps/main/app/api/assistant/route.ts`) checks `ready` first. If false, it returns a structured 4xx response that the assistant UI renders as a setup banner — never a 500.

### 4.5 Doctor surface changes

`slashcash doctor --quick`:

- `gmail-imap` — same as today.
- `python-env` — same as today; surfaces "installing in background" state distinct from "broken".
- `pdf-extractor` — runs `--self-check` against the venv.
- `assistant-provider` — new: reports the configured provider's readiness (Ollama running? API key present? base URL reachable?). Assistant readiness is **not** a sync gate — it's informational only.

`slashcash doctor --fix`:

- `python-env`: provisions or rebuilds the venv (existing behavior).
- `assistant-provider --provider ollama`: runs the deferred Ollama install/service/pull chain.
- `assistant-provider --provider openai-compatible`: re-prompts for API key + base URL + model.

### 4.6 CLI surface

Add `slashcash assistant`:

```
slashcash assistant install [--provider ollama|openai-compatible|anthropic]
slashcash assistant test                    # streams one token
slashcash assistant clear                   # removes provider config + key
slashcash assistant status                  # JSON: { provider, ready, reason }
```

Document in `packages/docs/reference/cli.md`.

### 4.7 First-run UX in the dashboard

Until the user configures a provider, the assistant tab shows:

- A short explainer: "slashcash extracts your Swiggy receipts deterministically. Configure a chat provider to ask follow-up questions about your spending."
- Three buttons: **Use local Gemma (Ollama)**, **Use API key**, **Skip for now**.
- Each button deep-links to the corresponding `slashcash assistant install --provider ...` command and shows the install spinner streamed from the CLI (or, for the API key option, opens an in-app form).

## Files touched (expected)

- `packages/cli/src/onboard/run.ts`
- `packages/cli/src/cli/registry/onboard.ts`
- `packages/cli/src/cli/registry/assistant.ts` (new)
- `packages/cli/src/cli/registry/sync.ts` (`--background` flag)
- `packages/cli/src/cli/command-catalog.ts`
- `packages/cli/src/doctor/checks.ts`
- `packages/cli/src/doctor/repairs.ts`
- `packages/cli/src/config/schema.ts` (assistant block)
- `packages/cli/src/config/credentials.ts` (assistant API keys)
- `apps/main/lib/ai/provider.ts`
- `apps/main/app/api/assistant/route.ts`
- `apps/main/app/(authenticated)/assistant/page.tsx`
- `apps/main/app/(authenticated)/assistant/setup/page.tsx` (new, optional)
- `packages/docs/reference/cli.md`
- `packages/docs/reference/config.md`
- `packages/docs/reference/env-vars.md`

## Verification commands

```bash
# Clean-state onboarding (no model pull)
rm -rf ~/.slashcash
pnpm slashcash -- onboard --yes
test -f ~/.slashcash/db.sqlite
test -f ~/.slashcash/pid/sync.pid
curl -fsS http://127.0.0.1:3000/api/healthz

# Assistant defaults to "skip" until configured
pnpm slashcash -- assistant status   # expect provider=none, ready=false
curl -fsS http://127.0.0.1:3000/api/assistant -X POST -d '{"messages":[{"role":"user","content":"hi"}]}' \
  | jq '.error'   # expect "no-assistant-provider"

# Configure OpenAI-compatible
OPENAI_API_KEY=sk-test pnpm slashcash -- assistant install --provider openai-compatible \
  --base-url https://api.openai.com/v1 --model gpt-4o-mini
pnpm slashcash -- assistant test
pnpm slashcash -- assistant status   # expect ready=true

# Configure local Ollama (this one does take time)
pnpm slashcash -- assistant install --provider ollama
pnpm slashcash -- assistant test
```

## Acceptance

- Onboarding from a clean `~/.slashcash` reaches "Open http://127.0.0.1:3000" with **no** Ollama install or model pull.
- The dashboard loads before the initial sync finishes.
- The assistant tab shows the setup banner when `assistant.provider = "none"`.
- Picking each of the three provider options completes successfully end-to-end (the Anthropic option is gated behind `SLASHCASH_ASSISTANT_ANTHROPIC=1` and is OK to skip in CI).
- `slashcash doctor --quick` reports `assistant-provider` as a separate, non-blocking check.
- `slashcash sync --full` and `slashcash start` work concurrently (the Phase 3 mutex serializes them within one process).

## Out of scope

- Adding more merchants beyond Swiggy.
- Long-running per-user agent loops or RAG over transactions — that's an assistant feature follow-up, not this phase.
- Replacing `@clack/prompts` or rewriting the wizard from scratch.
- Adding telemetry. The product remains telemetry-free.
