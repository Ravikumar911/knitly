# slashcash CLI

`slashcash` starts the local slash.cash dashboard, manages the state directory under `~/.slashcash`, and seeds deterministic Phase 1 data.

Useful commands:

```bash
slashcash doctor --fix
slashcash reset --yes
slashcash db seed
slashcash start
slashcash status
slashcash stop
```

`slashcash reset --yes` wipes local slash.cash state under `~/.slashcash` so you can onboard from scratch again.
