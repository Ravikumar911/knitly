# Staged slashcash runtime (extraResources)

electron-builder copies this directory to `Contents/Resources/slashcash/` inside the `.app`.

Populate with `pnpm --filter @knitly/desktop stage:runtime` (or the full `pnpm desktop:pack` pipeline). Staging copies the CLI publish layout (`bin/`, `dist/`, `bundled-skills/`), writes top-level `entry.js` → `dist/entry.js`, installs production deps, then `rebuild:natives` rebuilds `better-sqlite3` / `keytar` for the Electron ABI.
