#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export DATABASE_URL="${DATABASE_URL:-postgres://slash:slash@127.0.0.1:5432/slashcash}"
export LOCAL_MODE="${LOCAL_MODE:-true}"
export LOCAL_USER_ID="${LOCAL_USER_ID:-11111111-1111-1111-1111-111111111111}"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-local-dev-key}"
export LOCAL_LLM_BASE_URL="${LOCAL_LLM_BASE_URL:-http://127.0.0.1:11434/v1}"
export LOCAL_LLM_MODEL="${LOCAL_LLM_MODEL:-gemma4}"

printf "🚀 Starting local Postgres via Docker...\n"
docker compose up -d postgres

printf "⏳ Waiting for Postgres...\n"
until docker exec slashcash-postgres pg_isready -U slash -d slashcash >/dev/null 2>&1; do
  sleep 1
done

printf "🧱 Preparing auth schema for local mode...\n"
psql "$DATABASE_URL" <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);
SQL

printf "📦 Installing dependencies...\n"
pnpm install

printf "🗃️ Running Drizzle migrations...\n"
pnpm --filter @workspace/database migrate

printf "🌱 Seeding local data...\n"
pnpm tsx scripts/seed-local.ts

mkdir -p apps/main packages/database

cat > apps/main/.env.local <<ENV
LOCAL_MODE=${LOCAL_MODE}
LOCAL_USER_ID=${LOCAL_USER_ID}
DATABASE_URL=${DATABASE_URL}
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
LOCAL_LLM_BASE_URL=${LOCAL_LLM_BASE_URL}
LOCAL_LLM_MODEL=${LOCAL_LLM_MODEL}
ENV

cat > packages/database/.env.local <<ENV
DATABASE_URL=${DATABASE_URL}
ENV

printf "\n✅ Local setup complete.\n"
printf "Run: pnpm --filter @knitly/main dev\n"
