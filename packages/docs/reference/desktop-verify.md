# Reference — Desktop pre-tag verification

Maintainers verify a packaged macOS desktop build against real `~/.slashcash` before (or while watching) the first desktop `v*` release. This is the human/agent bar; CI must not mount personal finance data.

Research origin: `.scratch/desktop-becomes-primary-distribution/72-agent-browser-desktop-verify.md` (issue #72 / #84).

## Decision

**Primary path:** launch the packaged `.app`, wait for loopback `/api/healthz`, drive the product UI with `agent-browser` on `http://127.0.0.1:$PORT`.

Do **not** require Electron CDP for the release bar. CDP (`--remote-debugging-port` + `agent-browser connect`) is optional when the window fails to open but healthz looks fine.

| Layer | Tool | Scope |
|-------|------|--------|
| Process + home | Open packaged `.app` with `SLASHCASH_HOME=~/.slashcash` | Packaging + home wiring |
| Product UI | `agent-browser` → loopback | Dashboard / nav / assistant |
| Marketing CTA | Separate session or build-time URL check | Download for Mac → `.dmg` or releases fallback |
| CI | Artifact names + optional temp-home healthz | Never real `~/.slashcash` |

## Preconditions

1. Real local state at `~/.slashcash` (`db.sqlite`, `config.json`).
2. Packaged build: `apps/desktop/release/mac-arm64/slash.cash.app` from `pnpm desktop:pack`, or a GitHub Release `.dmg` / extracted `.app`.
3. `agent-browser` installed (`agent-browser --version`).
4. Quit any slash.cash / dashboard already bound to the verify port (default **3000**). Desktop reuses a healthy server on that port; a leftover CLI server can mask a bad packaged spawn.

## Env (recommended)

```bash
export SLASHCASH_HOME="$HOME/.slashcash"
export SLASHCASH_DESKTOP_PORT=3000
export SLASHCASH_NO_OPEN=1
```

## Fast path: script

From the repo root:

```bash
./scripts/desktop-verify.sh
# or with an explicit .app:
./scripts/desktop-verify.sh /path/to/slash.cash.app
```

The script:

1. Quits conflicting listeners on the pin port when safe.
2. Launches the packaged app with the env above.
3. Waits for `GET /api/healthz` (45s budget, matching `apps/desktop/src/main.ts`).
4. Prints DB / assistant sanity from `~/.slashcash`.
5. Runs an `agent-browser` loopback session: open → snapshot → core nav clicks → screenshot under `/tmp/slashcash-desktop-verify/`.
6. Prints the first-tag CI watch checklist (does **not** push a `v*` tag).

Pass `--skip-browser` to stop after healthz. Pass `--no-launch` if the packaged app is already up and you only want the browser journey.

## Manual launch → healthz

```bash
export SLASHCASH_HOME="$HOME/.slashcash"
export SLASHCASH_DESKTOP_PORT=3000
export SLASHCASH_NO_OPEN=1

# Gatekeeper one-time Open may be required for unsigned builds.
open "$PWD/apps/desktop/release/mac-arm64/slash.cash.app"
# or: open -a "slash.cash"

PORT="${SLASHCASH_DESKTOP_PORT:-3000}"
for i in $(seq 1 90); do
  curl -sf "http://127.0.0.1:${PORT}/api/healthz" && break
  sleep 0.5
done
curl -sf "http://127.0.0.1:${PORT}/api/healthz"
```

Confirm `dbPath` in the healthz JSON is under `~/.slashcash` (not Electron `userData`).

Read-only DB sanity (adjust if schema names change):

```bash
sqlite3 "$HOME/.slashcash/db.sqlite" "SELECT COUNT(*) FROM transactions_v2;"
sqlite3 "$HOME/.slashcash/db.sqlite" \
  "SELECT DISTINCT merchant_name FROM transactions_v2 WHERE merchant_name IS NOT NULL LIMIT 5;"
jq -r '.assistant.provider // "none"' "$HOME/.slashcash/config.json"
```

Prefer asserting UI strings you just queried (do not hardcode fixture merchants).

## agent-browser journey (loopback)

```bash
PORT="${SLASHCASH_DESKTOP_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"
SESSION="desktop-verify"
SCREEN_DIR="/tmp/slashcash-desktop-verify"
mkdir -p "$SCREEN_DIR"

agent-browser --session "$SESSION" open "$BASE"
agent-browser --session "$SESSION" wait --load networkidle
agent-browser --session "$SESSION" snapshot -i
```

### Checklist

1. **Launch → data**
   - Healthz 200; URL is `/` or dashboard.
   - Shell links: Dashboard, Assistant, Settings (and Transactions when present).
   - Overview shows spending context that exists in this DB.
   - Empty overview + large `db.sqlite` ⇒ wrong `SLASHCASH_HOME` (fail).

2. **Core nav** (re-snapshot after each click)
   - Dashboard → overview / charts load
   - Transactions → at least one real row
   - Settings → local setup / sync (not a hosted sign-in wall)
   - Back to Dashboard
   - Fail on 500s, infinite spinners, or auth redirects

3. **Assistant** (if configured)

   | Provider (`config.json`) | Expectation |
   |--------------------------|-------------|
   | `none` / missing | Chat shell visible; skip send/stream |
   | `ollama-local` / `openai-compatible` / `anthropic` | Send a trivial question; streamed reply **or** clear provider error |

4. **Screenshot + close**

```bash
agent-browser --session "$SESSION" screenshot --screenshot-dir "$SCREEN_DIR" desktop-dashboard.png
agent-browser --session "$SESSION" close
```

### Optional Electron CDP

Only when loopback passes but the human reports “no window”:

```bash
osascript -e 'quit app "slash.cash"' || true
sleep 1
open -a "slash.cash" --args --remote-debugging-port=9222
# wait healthz…
agent-browser connect 9222
agent-browser tab --url "*127.0.0.1*"
agent-browser snapshot -i
agent-browser close
```

## Website Download for Mac

CTA source: `apps/website/lib/links.ts` + build-time resolve in `apps/website/next.config.mjs`.

- When a GitHub Release has `slash.cash-*-mac-arm64.dmg`, build embeds that `browser_download_url`.
- Otherwise `MAC_DMG_URL` falls back to `https://github.com/Ravikumar911/knitly/releases/latest`.

Check without a full website build:

```bash
node -e '
const RE=/^slash\.cash-.+-mac-arm64\.dmg$/;
const fallback="https://github.com/Ravikumar911/knitly/releases/latest";
fetch("https://api.github.com/repos/Ravikumar911/knitly/releases/latest",{
  headers:{Accept:"application/vnd.github+json","User-Agent":"slash-cash-desktop-verify"}
}).then(async r=>{
  if(!r.ok){console.log(fallback);return;}
  const rel=await r.json();
  const asset=(rel.assets||[]).find(a=>RE.test(a.name));
  console.log(asset?.browser_download_url??fallback);
});
'
```

Until the first desktop tag ships a matching `.dmg`, **fallback to `/releases/latest` is expected and correct**.

## First `v*` tag — CI watch (do not push casually)

Desktop version today: `apps/desktop/package.json` → **0.1.0**. Tag must match: `v0.1.0`.

1. Merge `desktop-distribution-complete` (or equivalent) to the default branch.
2. **Dry-run first** (no GitHub Release, no website deploy). The branch must exist on `origin` (`gh workflow run` cannot target a local-only ref):

   ```bash
   git push -u origin HEAD   # if desktop-distribution-complete is not on origin yet
   gh workflow run Publish --ref desktop-distribution-complete
   # or after merge:
   gh workflow run Publish --ref main
   gh run watch   # follow the run
   ```

   Expect: preflight gates, `build-macos` pack, artifact upload named `desktop-macos-arm64-<version>` containing `.dmg`, `.zip`, `latest-mac.yml`, `.blockmap`. No `create-release` / `publish-website` on `workflow_dispatch`.

3. **Production tag** (maintainer-only, after dry-run green):

   ```bash
   git checkout main && git pull
   # confirm apps/desktop/package.json version is 0.1.0
   git tag v0.1.0
   git push origin v0.1.0
   gh run watch
   ```

   Expect GitHub Release `v0.1.0` with the same assets; website deploy may run when Vercel secrets exist. Re-check `MAC_DMG_URL` resolve — should point at the real `.dmg`.

4. Paste checklist + `/tmp/slashcash-desktop-verify/` screenshot paths into the release or tracking issue.

## CI policy (non-negotiable)

| Concern | CI (PR / tag / workflow_dispatch) | This runbook (maintainer Mac) |
|---------|-----------------------------------|-------------------------------|
| Home | Ephemeral `$RUNNER_TEMP/slashcash-home` | Real `~/.slashcash` |
| Artifacts | `.dmg` / `.zip` / `latest-mac.yml` | Local pack or Release install |
| Health | Pack / temp-home healthz only | Launch packaged app → healthz |
| UI | **No** agent-browser on personal data | Full journey above |

Do **not** mount the developer’s `~/.slashcash` in GitHub Actions. Do **not** add agent-browser to the Publish workflow.

Current Publish workflow (`.github/workflows/release.yml`): tag push creates the Release; `workflow_dispatch` is the dry-run path (pack + upload artifacts only).

## Failure triage

| Symptom | Likely cause |
|---------|--------------|
| healthz never OK | Bundled CLI / native ABI (`better-sqlite3`) |
| healthz OK, empty dashboard | Wrong `SLASHCASH_HOME` |
| Port wrong | 3000 taken; pin unset or discover via `lsof` / `~/.slashcash/logs` |
| Assistant blank | Provider `none` — skip stream assert |
| Website still npm Install | Marketing CTA not retargeted — block desktop-primary release |
| `MAC_DMG_URL` = `/releases/latest` | No desktop `.dmg` on latest release yet — expected until first desktop tag |

## One-line bar

Launch the packaged app against `~/.slashcash`, wait for loopback `/api/healthz`, drive launch→data→nav→assistant (if configured) with agent-browser on `http://127.0.0.1:$PORT`, confirm Download for Mac resolves to a real `.dmg` or the documented releases fallback; keep Electron CDP optional; CI only smokes artifacts (+ temp-home healthz), never real home data.
