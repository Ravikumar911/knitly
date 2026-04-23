# Phase 4 — Release, packaging, observability, docs polish

> _Goal: `slashcash` is published on npm with provenance; a clean macOS install of the published tarball boots cleanly through `onboard`; evals run as a CI quality gate with a real threshold; the `logs` command is usable; and the public docs render the shipped state. This is the "works on a stranger's machine, audibly" phase._

## Status

- **Shipped.** `.github/workflows/release.yml` (tag-triggered publish with provenance + SBOM + checksum + published-version smoke), `packages/cli/scripts/bundle-app.mjs`, `bundle:check`, `bundle:pack-smoke`, `pnpm pack:local`, bundle checks for required runtime dependencies and for symlinks that escape `dist/app`, the `slashcash logs` reader, the rotation-aware `LogEvent` writer at `packages/cli/src/runtime/log.ts`, `packages/e2e-tests/bench/perf-budget.ts` covering CLI + doctor + dev-mode paths, `eval:gate` wiring (behind `SLASHCASH_EVAL_SKIP_MODEL=1`), the `phase-5.ts` scenario in fixture mode, and the end-user verification notes in `packages/docs/reference/release.md`. `packages/cli/package.json` declares every runtime dependency the bundled dashboard needs (`drizzle-orm`, `better-sqlite3`, `dotenv`, `ai`, `@ai-sdk/openai-compatible`, `next`, `react`, `react-dom`); `bundle-app` excludes those from the copied Next standalone tree so npm installs the user's ABI-compatible copy; the copied `.gitignore` is stripped so `.next` actually packs; `bundle:pack-smoke` installs the packed tarball into a temporary npm prefix to catch missing `.next` output or runtime modules.

## Pending — hand to next agent

- [ ] Push a real `vX.Y.Z` tag and run `release.yml` end-to-end with a live `NPM_TOKEN`. Confirm on GitHub that the run produces an npm provenance attestation, an uploaded `slashcash-sbom.json`, an uploaded `slashcash.sha256`, and that the `npx -y slashcash@<version> --version` smoke step passes on the published package.
- [ ] Run `npm i -g slashcash@<version>` on a **clean** macOS machine (no workspace checkout) and complete `slashcash onboard` from the published tarball. This is the only way to exercise the dual-mode `start` detection against real installed layout. (Partial local coverage exists on the maintainer machine, but that is not a clean-machine pass.)
- [ ] Replace the placeholder eval threshold in ADR-012 with a real baseline derived from model runs on approved data. Today the gate passes because `SLASHCASH_EVAL_SKIP_MODEL=1` short-circuits model calls in CI.
- [ ] Add hard perf gates for **dashboard SSR first byte** and **assistant first-token** to the bench harness. `packages/e2e-tests/bench/perf-budget.ts` currently only covers CLI / doctor / dev-mode; the two server-side budgets from ADR-020 are not asserted.
- [ ] Decommission the hosted surface (outside this repo): point `slash.cash` at the CLI landing story, shut down or redirect `app.slash.cash`, clean up Supabase / Vercel / Trigger / Render infra. Record the cutover date in [`../current-state.md`](../current-state.md).

## Verification (fixture / local — real-release variants are listed above)

```bash
pnpm architecture-smells
pnpm typecheck
pnpm lint
pnpm pack:local
pnpm bundle:check
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm eval:gate
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm e2e:phase-5
pnpm bench
```

## Out of scope for v1

No auto-updater. No menu-bar UI. No Raycast extension. No multi-user / sync / team features. No Windows or Linux as supported targets (Linux smell-tests still run; full support is v2). No telemetry beyond the opt-in `updates.checkOnVersion` probe. No remote model fallback. No third-party-installable skill packages (skills v2 is a v2 topic).
