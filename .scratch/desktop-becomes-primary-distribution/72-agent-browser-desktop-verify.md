# Research: How does agent-browser verify the desktop release?

**Ticket:** [How does agent-browser verify the desktop release?](https://github.com/Ravikumar911/knitly/issues/72)  
**Map:** [Desktop becomes primary distribution](https://github.com/Ravikumar911/knitly/issues/67)  
**Date:** 2026-07-12  
**Depends on:** [Packaging](./68-package-macos-desktop.md) (`SLASHCASH_HOME=~/.slashcash`, unsigned arm64 `.app` / `.dmg`)

## Recommendation (decision)

**Primary path: launch the packaged desktop app, then drive the UI over loopback with agent-browser** (`http://127.0.0.1:$PORT`). Do **not** require Electron CDP for the release bar.

Treat Electron CDP (`--remote-debugging-port` + `agent-browser connect`) as an **optional shell debug** path when the window fails to open or loopback health looks fine but the Electron chrome misbehaves.

| Layer | Tool | Why |
|-------|------|-----|
| Process + data home | Launch `.app` / `.dmg` install with real `~/.slashcash` | Proves packaging, `extraResources/slashcash`, and home wiring |
| Product UI journeys | `agent-browser` → loopback URL | Same Next dashboard the shell loads; stable CDP target (Chrome), not Electron |
| Marketing CTA | Separate `agent-browser` session on website | Download CTA is not inside the desktop shell |
| CI | Artifact + health smoke only | No real `~/.slashcash`, no agent-browser on runners |

## Why loopback-first (not Electron CDP)

### Architecture already splits shell vs UI

`apps/desktop/src/main.ts` starts `slashcash server run` on `127.0.0.1`, waits for `/api/healthz`, then `BrowserWindow.loadURL(http://127.0.0.1:$PORT)`. The product surface is a normal Chromium page on loopback. Attaching agent-browser’s own Chrome to that URL exercises the same React/tRPC UI the Electron window shows.

### Electron CDP is workable but fragile for agents

agent-browser’s Electron skill works (`open -a "slash.cash" --args --remote-debugging-port=9222` → `agent-browser connect 9222`). Friction for a repeatable pre-tag runbook:

1. **Must relaunch** with the flag; an already-running single-instance app (`requestSingleInstanceLock`) ignores a second CDP launch.
2. **Target picking** — blank / loading targets before the dashboard URL; need `agent-browser tab` / `--url`.
3. **Port / session collisions** with other Chromium apps and agent-browser’s own daemon.
4. **Unsigned Gatekeeper** prompts can block headless agent attach until the human has opened the app once.
5. CDP attach does **not** uniquely prove `SLASHCASH_HOME=~/.slashcash` — loopback against a mis-homed Electron process still “works” if that wrong home has data.

Loopback after a successful desktop launch still proves the shell started the server; asserting dashboard content from **known `~/.slashcash` facts** proves the home path.

### What Electron CDP uniquely covers (optional)

- Native window actually appeared (not “server up, window crashed”).
- `will-navigate` / `setWindowOpenHandler` open external URLs in the system browser.
- Multi-target / webview edge cases (not used today).

Keep a short optional CDP appendix; do not gate the release bar on it.

## Launch strategy (pre-tag / watch-CI verify)

### Preconditions

1. Real local state at `~/.slashcash` (at least `db.sqlite`, `config.json`). Do **not** point verify at Electron `userData` — product home is `~/.slashcash` (see #68).
2. Packaged build available: local `pnpm desktop:pack` (name TBD) output **or** GitHub Release `.dmg` / extracted `.app`.
3. `agent-browser` installed (`agent-browser --version`; skill: `~/.claude/skills/agent-browser/SKILL.md`).
4. Quit any running slash.cash / dashboard on the intended port (default **3000**). Desktop reuses a healthy existing server on that port; a stale CLI server can mask a bad packaged spawn.

### Env overrides (recommended for agents)

```bash
export SLASHCASH_HOME="$HOME/.slashcash"          # belt-and-suspenders until #68 lands
export SLASHCASH_DESKTOP_PORT=3000                # pin port for agent-browser URLs
export SLASHCASH_NO_OPEN=1
```

Pinning the port avoids hunting for `3000+N` when 3000 is busy.

### Launch (packaged)

```bash
# After Gatekeeper one-time Open (unsigned):
open -a "slash.cash"
# or: open /path/to/slash.cash.app
# or mount .dmg and open the app inside

# Wait for health (45s timeout matches main.ts)
for i in $(seq 1 90); do
  curl -sf "http://127.0.0.1:${SLASHCASH_DESKTOP_PORT:-3000}/api/healthz" && break
  sleep 0.5
done
curl -sf "http://127.0.0.1:${SLASHCASH_DESKTOP_PORT:-3000}/api/healthz"
```

Confirm the Electron process is the parent of the dashboard (optional): Activity Monitor / `pgrep -lf slash` — not required for the UI bar if healthz came up only after `open -a`.

### Drive UI (loopback)

```bash
PORT="${SLASHCASH_DESKTOP_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

agent-browser open "$BASE"
agent-browser wait --load networkidle
agent-browser snapshot -i
# …journey steps below…
agent-browser screenshot --screenshot-dir /tmp/slashcash-desktop-verify desktop-dashboard.png
agent-browser close
```

Use a named session if other agent-browser work is concurrent: `agent-browser --session desktop-verify …`.

### Dev-mode shortcut (not a release substitute)

```bash
pnpm --filter @knitly/desktop dev
# same loopback + healthz wait + agent-browser
```

Useful while iterating; **pre-tag verification must use the packaged `.app` / Release artifact.**

## Journey checklist (locked E2E bar)

Mirror existing Playwright customer journeys (`packages/e2e-tests/tests/dashboard.spec.ts`) but against **real** `~/.slashcash` labels (not fixture merchants).

### 1. Launch → existing data visible

| Check | How |
|-------|-----|
| Health | `GET /api/healthz` → 200 |
| Lands on product | URL `/` or `/dashboard`; shell links **Dashboard**, **Assistant**, **Settings** visible |
| Real spending context | Overview / restaurant or merchant text that you know exists in **this** DB (do not hardcode fixture names like “Truffles” unless that row exists locally) |
| Home wiring | If overview is empty but `~/.slashcash/db.sqlite` is large → fail (likely wrong `SLASHCASH_HOME`) |

Quick DB sanity (read-only):

```bash
sqlite3 "$HOME/.slashcash/db.sqlite" "SELECT COUNT(*) FROM transactions;"  # table name may vary; adjust to schema
```

Prefer asserting UI strings you just queried rather than assuming seed data.

### 2. Core nav

From the app shell, click through and re-snapshot after each navigation:

1. **Dashboard** → overview heading / charts load  
2. **Transactions** → at least one real row  
3. **Settings** → local setup / sync surface (not a sign-in wall)  
4. Back to **Dashboard**

Fail if any route 500s, spins forever, or redirects to hosted auth.

### 3. Assistant (if configured)

Detect configuration from `~/.slashcash/config.json`:

```bash
jq -r '.assistant.provider // "none"' "$HOME/.slashcash/config.json"
```

| Provider | Expectation |
|----------|-------------|
| `none` / missing | Open **Assistant**; chat shell visible; **skip** send/stream asserts |
| `ollama-local` / `openai-compatible` / `anthropic` | Open **Assistant**; placeholder like “Ask about your spending”; send a trivial question; wait for a streamed reply **or** a clear provider error (not a blank crash) |

Do not require a specific model answer. Screenshot on failure.

### 4. Website Download CTA

Separate session (does not need desktop running):

```bash
# Prefer production or the PR preview that ships with the release:
agent-browser open "https://slash.cash"   # or local website base URL
agent-browser wait --load networkidle
agent-browser snapshot -i
# Assert primary CTA is Download for Mac (post-#73), not npm Install
# Assert href points at GitHub Releases .dmg / latest pattern from #73
agent-browser close
```

Until #73 lands, record the **current** CTA (`Install free` → npm) as a known gap; the verify step for a desktop tag should fail closed once #73 is implemented (npm CTA must be gone).

## Optional: Electron CDP attach

Use when loopback passes but the human reports “no window” / wrong chrome.

```bash
# Quit slash.cash completely first
osascript -e 'quit app "slash.cash"' || true
sleep 1

open -a "slash.cash" --args --remote-debugging-port=9222
# wait healthz as above…

agent-browser connect 9222
agent-browser tab                    # pick the 127.0.0.1 dashboard target
agent-browser tab --url "*127.0.0.1*"
agent-browser snapshot -i
# same nav checks, then:
agent-browser close
```

If `connect` fails: confirm flag was present at launch, wait longer, `lsof -i :9222`, try `agent-browser --cdp 9222 snapshot -i`.

## CI smoke vs pre-tag verification

| Concern | CI (PR / tag build) | Pre-tag / watch-CI agent (human machine) |
|---------|---------------------|------------------------------------------|
| Runner | `macos-14` arm64 for desktop pack; Linux OK for website | Developer Mac with real `~/.slashcash` |
| Data | Ephemeral `SLASHCASH_HOME` under `$RUNNER_TEMP` | Real `~/.slashcash` |
| Launch | Build `.dmg`/`.zip`; optional headless “start packaged server binary / healthz” | `open` packaged app |
| UI | **No** agent-browser against personal finance data | Full journey checklist above |
| Website | Link/unit check or Playwright smoke on marketing | agent-browser Download CTA |
| Playwright e2e | Keep existing fixture journeys (`pnpm e2e:all`) on Linux — does **not** replace desktop verify | Optional; not required if agent checklist green |
| Secrets | None from user home | User’s assistant keys stay local; do not upload screenshots with PII to CI logs |

**CI smoke (recommended once #69 exists):**

1. Build unsigned arm64 artifacts.  
2. Assert artifact names + `latest-mac.yml` present.  
3. Extract `.app` (or run staged `slashcash` under Resources) with temp `SLASHCASH_HOME`, hit `/api/healthz`.  
4. Website deploy / CTA URL shape check (no npm primary CTA).  

**Do not** mount the developer’s `~/.slashcash` in GitHub Actions.

**Pre-tag / “watch CI” agent bar (this runbook):**

1. Install Release or local pack `.dmg` once (Gatekeeper).  
2. Launch → healthz → loopback agent-browser journeys 1–3.  
3. Website journey 4 against the deployed site for that tag.  
4. Paste checklist results + screenshot paths into the release / issue comment.  
5. Optional CDP only on shell failures.

## Failure triage (short)

| Symptom | Likely cause |
|---------|----------------|
| healthz never OK | Packaged CLI entry missing / native ABI (`better-sqlite3`) — see #68 risks |
| healthz OK, empty dashboard | `SLASHCASH_HOME` still `userData` (#68 implement gap) |
| Port wrong | 3000 taken; unset pin and discover via `lsof` / logs under `~/.slashcash/logs` |
| Assistant blank | Provider `none` or keychain missing — skip stream assert |
| CDP connect refused | App not launched with `--remote-debugging-port`; use loopback instead |
| Website still “Install free” | #73 not merged — block desktop-primary release |

## Answer in one line

**Launch the packaged app against `~/.slashcash`, wait for loopback `/api/healthz`, drive launch→data→nav→assistant (if configured) with agent-browser on `http://127.0.0.1:$PORT`, verify the website Download CTA in a separate session; keep Electron CDP optional; CI only smokes artifacts + healthz, never real home data.**
