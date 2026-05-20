# slashcash CLI

`slashcash` starts the local slash.cash dashboard, manages the state directory under `~/.slashcash`, and seeds deterministic Phase 1 data.

Useful commands:

```bash
slashcash doctor --fix
slashcash reset --yes          # full wipe: config, credentials, db, attachments
slashcash db reset --yes       # empty db + attachments; keeps config/credentials
slashcash db repair-extractions
slashcash sync --full --reextract
slashcash db seed
slashcash start
slashcash status
slashcash stop
```

`slashcash reset --yes` wipes all local slash.cash state under `~/.slashcash` so you can onboard from scratch again.

`slashcash db reset --yes` clears the SQLite database and attachments but keeps saved config and Gmail credentials — use this to test Gmail ingestion repeatedly.

`slashcash db repair-extractions` re-runs Haiku extraction from stored email bodies and PDFs without contacting Gmail.
