# Knitly - Modern Monorepo with shadcn/ui

This is a full-stack monorepo template using a modern tech stack including Next.js, shadcn/ui, Supabase, Drizzle ORM, tRPC, and TriggerDev.

## Project Structure

```
.
├── apps/
│   ├── main/               # Main application with Next.js, Supabase, and tRPC
│   └── website/            # Marketing website (Next.js)
│
└── packages/
    ├── database/           # Shared database schema and Drizzle ORM setup
    ├── eslint-config/      # Shared ESLint configuration
    ├── tasks/              # TriggerDev background tasks
    ├── typescript-config/  # Shared TypeScript configuration
    └── ui/                 # Shared UI components (shadcn/ui)
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10.4.1

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter main dev
pnpm --filter website dev
```

## Adding UI Components

To add shadcn/ui components, run the following command:

```bash
# From the root directory
pnpm dlx shadcn@latest add button -c packages/ui

# For app-specific components
pnpm dlx shadcn@latest add button -c apps/main
```

## Using Components

Import UI components from the shared UI package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Database

This project uses Supabase with Drizzle ORM. The database schema is defined in the `packages/database` package.

## Background Tasks

Background jobs and scheduled tasks are managed with TriggerDev in the `packages/tasks` package.

## Environment Variables

Each app and some packages have their own `.env` files. Copy the `.env.example` files to `.env.local` and fill in the required values.

## Building for Production

```bash
# Build all packages and apps
pnpm build

# Build specific app
pnpm --filter main build
```

## Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/docs)
- [TriggerDev Documentation](https://trigger.dev/docs)
