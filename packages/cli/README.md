# slash.cash

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://github.com/Ravikumar911/knitly/blob/main/LICENSE)

`slashcash` installs the open-source slash.cash app: a local-first personal finance dashboard for turning your own receipt and transaction data into a private SQLite-backed spending workspace.

The npm package bundles the dashboard and CLI together. After onboarding, it can sync Gmail over IMAP with a user-generated app password, store attachments locally, extract supported receipt data deterministically, and open the dashboard on your machine. Assistant chat is optional and configured separately.

## What it is for

- Run a personal finance dashboard locally without hosted auth, a cloud database, or a remote job queue.
- Keep app state under `~/.slashcash`, including SQLite data, attachments, config, logs, and installed skills.
- Ingest supported Gmail receipts, with current built-in support for Swiggy, Uber Eats, and DoorDash.
- Use optional assistant providers only after you configure them with `slashcash assistant`.
- Inspect, reset, repair, and rehearse local data flows from the CLI.

## Install

```bash
npm i -g slashcash
slashcash onboard
slashcash start
```

The dashboard runs at `http://127.0.0.1:3000` by default.

## Requirements

- Node.js 20 or newer.
- A Gmail account with 2-Step Verification and a 16-character app password if you want Gmail sync.
- Optional: an assistant provider such as local Ollama or an OpenAI-compatible endpoint.

## Common Commands

```bash
slashcash onboard                 # create local config and walk through setup
slashcash start                   # start the local dashboard
slashcash status                  # show runtime status
slashcash stop                    # stop the dashboard
slashcash doctor --fix            # repair local prerequisites where possible
slashcash sync --full             # run Gmail sync from the configured query
slashcash db seed                 # load deterministic demo data
slashcash db reset --yes          # clear DB and attachments, keep config
slashcash reset --yes             # full local wipe under ~/.slashcash
slashcash assistant status        # inspect optional assistant provider setup
slashcash logs --follow           # stream structured local logs
```

`slashcash db reset --yes` clears the SQLite database and local attachments but keeps saved config and Gmail credentials. `slashcash reset --yes` removes all slash.cash local state so onboarding can start from scratch.

## Open Source

slash.cash is open source under the [ISC License](https://github.com/Ravikumar911/knitly/blob/main/LICENSE). Contributions are welcome in [Ravikumar911/knitly](https://github.com/Ravikumar911/knitly); start with the [project README](https://github.com/Ravikumar911/knitly#readme) and [contributing guide](https://github.com/Ravikumar911/knitly/blob/main/CONTRIBUTING.md).

Please report security issues through GitHub private vulnerability reporting as described in the [security policy](https://github.com/Ravikumar911/knitly/blob/main/SECURITY.md), not in a public issue.
