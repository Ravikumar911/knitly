# slash.cash

Local-first personal finance for a single user on their own machine.

## Language

**Desktop app**:
The primary product the person downloads and runs — an Electron shell around the local dashboard and bundled runtime.
_Avoid_: CLI product, npm package (as the product), desktop shell (as a secondary optional path)

**Bundled runtime**:
The `slashcash` package shipped inside the desktop app to supervise the local server and machine-side setup steps.
_Avoid_: end-user CLI, global npm install, `npm i -g slashcash`

**State directory**:
`~/.slashcash/` — the single on-disk home for config, SQLite, attachments, and related local state for both desktop and any internal runtime commands.
_Avoid_: Electron `userData` as the product data home, Application Support `slash.cash` as a separate product store

**Desktop onboarding**:
First-launch setup inside the desktop app UI that covers the former CLI onboard scope (privacy, machine prep, Gmail IMAP credentials, optional assistant).
_Avoid_: `slashcash onboard`, terminal wizard, marketing-site onboarding
