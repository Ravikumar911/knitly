# Research: How do we package the macOS desktop app?

**Ticket:** [How do we package the macOS desktop app?](https://github.com/Ravikumar911/knitly/issues/68)  
**Map:** [Desktop becomes primary distribution](https://github.com/Ravikumar911/knitly/issues/67)  
**Date:** 2026-07-12

## Recommendation (decision)

Ship `@knitly/desktop` with **electron-builder** + **electron-updater**, macOS **arm64 only** for v1:

| Artifact | Audience |
|----------|----------|
| `.dmg` | Humans / website “Download for Mac” |
| `.zip` | `electron-updater` (required; dmg-only breaks Mac updates) |
| `latest-mac.yml` | Updater feed (auto-produced; must be on the GitHub Release) |

Reuse today’s CLI packaging pipeline (`pnpm pack:local` / `bundle:app`) as an **extraResources** stage so the Electron shell keeps spawning `slashcash server run` via `ELECTRON_RUN_AS_NODE` against `process.resourcesPath/slashcash/entry.js` (already coded in `apps/desktop/src/main.ts`).

Force **unsigned / ad-hoc** builds with `CSC_IDENTITY_AUTO_DISCOVERY=false`. Set `SLASHCASH_HOME` to **`~/.slashcash`** (not Electron `userData`).

## Why this shape

### Shell already expects a packaged CLI layout

`resolveCliEntrypoint()` looks for:

1. `process.resourcesPath/slashcash/entry.js`
2. `process.resourcesPath/app/packages/cli/dist/entry.js`
3. else repo-root `pnpm --filter slashcash dev` (dev only)

So the release layout should put the **same tree the npm tarball would ship** under `Contents/Resources/slashcash/`, with `entry.js` at the top of that tree (alongside `bin/`, `dist/`, `dist/app/`, `bundled-skills/`).

### Next + natives already solved for the CLI tarball

`packages/cli/scripts/bundle-app.mjs` already copies Next standalone + workspace packages into `packages/cli/dist/app`. `better-sqlite3` and `keytar` are CLI dependencies. Desktop should not invent a second bundler — **stage after `pack:local`-equivalent build**, then feed that directory to electron-builder `extraResources`.

### Targets match the locked auto-update choice

electron-updater on macOS updates from **zip**, not dmg. Default electron-builder mac target is `dmg`+`zip`; keep both. Publish provider: **GitHub Releases** (`Ravikumar911/knitly`).

### Arch: arm64 only

Map is macOS-only; no existing users. Recommend **Apple Silicon only** (`macos-14` / `--arm64`) for the first release. Universal / Intel is a later ticket if needed.

## Proposed build pipeline (local + CI)

```text
1. pnpm --filter @knitly/main build          # Next standalone
2. pnpm --filter @workspace/database build
3. pnpm --filter @workspace/tasks build
4. pnpm --filter slashcash build
5. pnpm --filter slashcash bundle:app        # → packages/cli/dist/app
6. Stage resources/slashcash/ from CLI package files
   (bin, dist, bundled-skills — same as npm `files`)
7. Rebuild native modules for Electron ABI (see Risks)
8. pnpm --filter @knitly/desktop build       # tsc → dist/main.js
9. electron-builder --mac dmg zip --arm64
```

Root convenience script (name TBD at implement): e.g. `pnpm desktop:pack`.

## Config sketch (`apps/desktop`)

```jsonc
// apps/desktop/package.json (additions)
{
  "version": "0.1.0", // source of truth for v* tags
  "main": "dist/main.js",
  "productName": "slash.cash",
  "scripts": {
    "pack:mac": "electron-builder --mac dmg zip --arm64",
    "dist": "electron-builder --mac dmg zip --arm64 --publish never"
  },
  "dependencies": {
    "electron-updater": "^6.x"
  },
  "devDependencies": {
    "electron": "^39.2.7",
    "electron-builder": "^26.x"
  },
  "build": {
    "appId": "cash.slash.app",
    "productName": "slash.cash",
    "directories": { "output": "release" },
    "files": ["dist/**/*", "package.json"],
    "extraResources": [
      {
        "from": "../../packages/cli/pack-stage/slashcash",
        "to": "slashcash",
        "filter": ["**/*"]
      }
    ],
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.finance",
      "identity": null,
      "hardenedRuntime": false,
      "gatekeeperAssess": false
    },
    "dmg": {
      "artifactName": "slash.cash-${version}-mac-${arch}.${ext}"
    },
    "publish": [
      {
        "provider": "github",
        "owner": "Ravikumar911",
        "repo": "knitly",
        "releaseType": "release"
      }
    ]
  }
}
```

Staging dir `packages/cli/pack-stage/slashcash` is a thin copy (or pack+extract) of what npm would publish — implement detail, not a second product.

CI env for unsigned:

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
```

## Main-process changes required at implement (not done here)

1. **`SLASHCASH_HOME`**: today sets `app.getPath("userData")`. Must become `process.env.SLASHCASH_HOME || join(homedir(), ".slashcash")`. Stop using `resolveDesktopSlashcashHome()` for product data (or delete/repurpose it later).
2. **Updater**: on `app.whenReady`, call `autoUpdater.checkForUpdatesAndNotify()` (and optional “Check for updates” menu). Document Gatekeeper re-prompt after swap.
3. **Dev vs pack**: keep current pnpm fallback when `resources/slashcash/entry.js` is missing.

## What goes in the bundle vs stays on disk

| In `.app` / Resources | On disk under `~/.slashcash` |
|----------------------|------------------------------|
| Electron shell + `dist/main.js` | `db.sqlite`, `config.json`, credentials, attachments |
| Bundled `slashcash` runtime + Next standalone (`dist/app`) | `py-venv` / PDF extractor venv (provisioned by onboard/doctor) |
| Native modules for Electron ABI | User skills, logs, pid |

Python/pdf extractor is **not** shipped inside the dmg for v1; first-launch desktop onboarding / doctor-equivalent provisions it into the state directory (same as CLI today).

## Risks

1. **Native ABI (`better-sqlite3`, `keytar`)**  
   Packaged launch uses `process.execPath` + `ELECTRON_RUN_AS_NODE=1`, so natives must match **Electron’s** NODE_MODULE_VERSION, not system Node. Mitigations (pick one at implement; prefer A):  
   - **A.** `electron-rebuild` / `@electron/rebuild` against the staged CLI `node_modules` after bundle.  
   - **B.** Ship a real Node 20+ binary under Resources and spawn that instead of Electron-as-Node (bigger artifact, clearer ABI).

2. **Gatekeeper**  
   Unsigned dmg/zip: first open needs right-click → Open (or `xattr -dr com.apple.quarantine`). Updates may re-trigger. Website/docs must say this until signing lands (out of map scope).

3. **Artifact size**  
   Next standalone + Electron is large. Accept for v1; watch CI upload limits / GitHub release asset size.

4. **Monorepo + electron-builder**  
   Builder expects app package as project dir (`apps/desktop`). Workspace deps for the **shell** stay minimal; runtime lives in `extraResources`, not as Electron `asar` deps.

5. **`resolveDesktopSlashcashHome` drift**  
   Helper exists but product decision is `~/.slashcash`. Implement should wire home correctly and avoid shipping the Application Support path by accident.

## Open items for later tickets (not this decision)

- Exact CI job graph / version gate → [How does release CI ship desktop and drop npm?](https://github.com/Ravikumar911/knitly/issues/69)
- Website URL → artifact name pattern above → [How does the website point at the latest Mac build?](https://github.com/Ravikumar911/knitly/issues/73)
- Agent-browser attach strategy → [How does agent-browser verify the desktop release?](https://github.com/Ravikumar911/knitly/issues/72)
- Intel / universal mac builds — out of scope until arm64 release is green

## Answer in one line

**Use electron-builder on `apps/desktop` to emit unsigned arm64 `.dmg` + `.zip` (+ `latest-mac.yml`), with the existing CLI/`bundle:app` tree as `extraResources/slashcash`, `SLASHCASH_HOME=~/.slashcash`, and Electron-ABI rebuild of native modules.**
