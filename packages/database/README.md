# @workspace/database

A centralized database package for the Knitly monorepo.

## Overview

This package centralizes all database interactions, including:
- Schema definitions (via Drizzle ORM)
- Query operations
- Database migrations

## Development

```bash
# Install dependencies
pnpm install

# Generate types from the database schema
pnpm generate

# Run migrations
pnpm migrate
```

## Testing

The database package includes a comprehensive testing setup:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Test Configuration

For testing, you need a separate test database to avoid affecting production data:

1. Copy `.env.test.example` to `.env.test`
2. Set the `TEST_DATABASE_URL` to point to your test database

### Testing Strategy

The test suite includes both unit tests and integration tests:

- **Unit Tests**: Mock the database client to test query logic without database connections
- **Integration Tests**: Test against a real database to verify queries work as expected

See the `/test/README.md` for more details on testing practices.

## Directory Structure

```
/packages/database
├── /src
│   ├── /schema      # Database schema definitions
│   ├── /queries     # Database query operations 
│   └── index.ts     # Package exports
├── /test            # Test suite
├── drizzle.config.ts # Drizzle configuration
└── package.json
```