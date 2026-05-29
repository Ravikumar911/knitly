# Contributing

Thanks for your interest in slash.cash.

## Getting started

1. Fork and clone the repository.
2. Install dependencies: `pnpm install`
3. Run the dashboard: `pnpm --filter @knitly/main dev`
4. Run checks before opening a PR:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

See [`README.md`](./README.md) for onboarding, database, and CLI workflows.

## Project conventions

- Keep SQLite access inside `packages/database` only.
- Add tRPC procedures under `apps/main/trpc/routers/` backed by database query helpers.
- Follow existing patterns in [`AGENTS.md`](./AGENTS.md) and [`apps/main/AGENTS.md`](./apps/main/AGENTS.md).

## Pull requests

- Keep changes focused and include tests when behavior changes.
- Update docs when user-facing behavior or release steps change.
- Do not commit secrets, local databases, or personal finance fixtures.

## License

By contributing, you agree that your contributions are licensed under the same [ISC License](./LICENSE) as the project.
