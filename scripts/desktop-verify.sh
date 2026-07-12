#!/usr/bin/env bash
# Maintainer desktop verify: launch packaged .app → healthz → agent-browser loopback.
# See packages/docs/reference/desktop-verify.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${SLASHCASH_DESKTOP_PORT:-3000}"
HOME_DIR="${SLASHCASH_HOME:-$HOME/.slashcash}"
DEFAULT_APP="$ROOT/apps/desktop/release/mac-arm64/slash.cash.app"
APP_PATH="${1:-$DEFAULT_APP}"
SESSION="${DESKTOP_VERIFY_SESSION:-desktop-verify}"
SCREEN_DIR="${DESKTOP_VERIFY_SCREEN_DIR:-/tmp/slashcash-desktop-verify}"
SKIP_BROWSER=0
NO_LAUNCH=0
HEALTH_URL="http://127.0.0.1:${PORT}/api/healthz"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--skip-browser] [--no-launch] [path/to/slash.cash.app]

Env:
  SLASHCASH_HOME            Product home (default: ~/.slashcash)
  SLASHCASH_DESKTOP_PORT    Loopback port (default: 3000)
  DESKTOP_VERIFY_SESSION    agent-browser session name
  DESKTOP_VERIFY_SCREEN_DIR Screenshot directory

Flags:
  --skip-browser   Stop after healthz + DB sanity
  --no-launch      Assume the app/server is already up; only run browser journey
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-browser) SKIP_BROWSER=1; shift ;;
    --no-launch) NO_LAUNCH=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*)
      echo "Unknown flag: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      APP_PATH="$1"
      shift
      ;;
  esac
done

export SLASHCASH_HOME="$HOME_DIR"
export SLASHCASH_DESKTOP_PORT="$PORT"
export SLASHCASH_NO_OPEN=1

log() { printf '==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

wait_healthz() {
  local i
  for i in $(seq 1 90); do
    if curl -sf "$HEALTH_URL" >/dev/null; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

quit_port_owner_if_slashcash() {
  local pids
  pids="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi
  log "Port $PORT is in use (pids: $pids); quitting slash.cash / slashcash listeners"
  osascript -e 'quit app "slash.cash"' >/dev/null 2>&1 || true

  # Parent CLI / desktop wrappers (may not be the LISTEN pid — Next is often the listener).
  pkill -f "slashcash server run" 2>/dev/null || true
  pkill -f "slash.cash.app/Contents/MacOS" 2>/dev/null || true

  # shellcheck disable=SC2086
  for pid in $pids; do
    local cmd
    cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    if [[ "$cmd" == *slashcash* || "$cmd" == *slash.cash* || "$cmd" == *Electron* || "$cmd" == *next-server* || "$cmd" == *next\ start* ]]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  sleep 2
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    # Last resort for the pinned verify port: kill remaining listeners.
    local leftover
    leftover="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
    # shellcheck disable=SC2086
    kill $leftover 2>/dev/null || true
    sleep 1
  fi
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "port $PORT still listening after quit attempt — free it and retry"
  fi
}

print_db_sanity() {
  local db="$HOME_DIR/db.sqlite"
  local config="$HOME_DIR/config.json"
  if [[ ! -f "$db" ]]; then
    log "No db at $db (fresh home — data asserts will be empty)"
    return 0
  fi
  if command -v sqlite3 >/dev/null 2>&1; then
    local count
    count="$(sqlite3 "$db" "SELECT COUNT(*) FROM transactions_v2;" 2>/dev/null || echo "?")"
    log "transactions_v2 count: $count"
    log "sample merchants:"
    sqlite3 "$db" \
      "SELECT DISTINCT merchant_name FROM transactions_v2 WHERE merchant_name IS NOT NULL AND merchant_name != '' LIMIT 5;" \
      2>/dev/null || true
  fi
  if [[ -f "$config" ]] && command -v jq >/dev/null 2>&1; then
    log "assistant.provider: $(jq -r '.assistant.provider // "none"' "$config")"
  fi
}

launch_app() {
  [[ -d "$APP_PATH" ]] || fail "packaged app not found: $APP_PATH (run pnpm desktop:pack first)"
  log "Launching $APP_PATH"
  log "SLASHCASH_HOME=$SLASHCASH_HOME SLASHCASH_DESKTOP_PORT=$PORT"
  # open inherits env for the launched process on macOS when set in this shell
  open "$APP_PATH"
}

run_browser_journey() {
  require_cmd agent-browser
  mkdir -p "$SCREEN_DIR"
  local base="http://127.0.0.1:${PORT}"

  log "agent-browser open $base (session=$SESSION)"
  agent-browser --session "$SESSION" open "$base"
  agent-browser --session "$SESSION" wait --load networkidle
  agent-browser --session "$SESSION" snapshot -i || true

  # Prefer direct routes over text clicks (sidebar labels can collide).
  visit() {
    local path="$1"
    local label="$2"
    log "Navigate $label → ${base}${path}"
    agent-browser --session "$SESSION" open "${base}${path}"
    agent-browser --session "$SESSION" wait --load networkidle || true
    agent-browser --session "$SESSION" snapshot -i || true
  }

  visit "/dashboard" "Dashboard"
  visit "/transactions" "Transactions"
  visit "/settings" "Settings"
  visit "/assistant" "Assistant"
  visit "/dashboard" "Dashboard"

  agent-browser --session "$SESSION" screenshot --screenshot-dir "$SCREEN_DIR" desktop-dashboard.png || true
  log "Screenshot dir: $SCREEN_DIR"
  agent-browser --session "$SESSION" close || true
}

print_tag_watch() {
  local version
  version="$(node -p "require('$ROOT/apps/desktop/package.json').version" 2>/dev/null || echo "0.1.0")"
  cat <<EOF

────────────────────────────────────────
First tag CI watch (human step — do not push casually)
────────────────────────────────────────
Desktop version: ${version}
Dry-run (no Release / no website deploy) — requires the branch on origin:
  git push -u origin HEAD   # if not pushed yet
  gh workflow run Publish --ref <branch-or-main>
  gh run watch

Production tag after merge + dry-run green:
  git tag v${version}
  git push origin v${version}
  # Expect Release assets: .dmg, .zip, latest-mac.yml, .blockmap

Website MAC_DMG_URL: real .dmg after that Release, else fallback
  https://github.com/Ravikumar911/knitly/releases/latest

CI policy: artifact pack (+ temp-home healthz only). Never mount ~/.slashcash.
Full runbook: packages/docs/reference/desktop-verify.md
EOF
}

# --- main ---
require_cmd curl
require_cmd open

if [[ "$NO_LAUNCH" -eq 0 ]]; then
  quit_port_owner_if_slashcash
  launch_app
  log "Waiting for $HEALTH_URL"
  wait_healthz || fail "healthz did not become ready within 45s"
else
  log "Skipping launch (--no-launch)"
  curl -sf "$HEALTH_URL" >/dev/null || fail "healthz not reachable at $HEALTH_URL"
fi

log "healthz OK:"
curl -sf "$HEALTH_URL"
echo
print_db_sanity

if [[ "$SKIP_BROWSER" -eq 1 ]]; then
  log "Skipping agent-browser (--skip-browser)"
else
  run_browser_journey
fi

print_tag_watch
log "Desktop verify finished."
