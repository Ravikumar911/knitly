# slash.cash - Modern Full-Stack Monorepo

A modern, type-safe, and scalable monorepo built with Next.js, Supabase, shadcn/ui, Drizzle ORM, tRPC, and TriggerDev. Features strict separation of concerns and centralized database management.

## 🏗️ Project Structure

```
.
├── apps/
│   ├── main/               # Core Next.js app with Supabase Auth SSR and tRPC
│   ├── website/           # Marketing website (Next.js, static)
│   └── e2e-main/          # End-to-end testing for main app (Playwright)
│
└── packages/
    ├── database/          # Centralized database schema and queries
    ├── eslint-config/     # Shared ESLint configuration
    ├── tasks/             # Background tasks and jobs
    ├── typescript-config/ # Shared TypeScript configuration
    └── ui/                # Shared UI components (shadcn/ui)
```

## 🏛️ Architecture & Guidelines

### Core Principles

1. **Strict Separation of Concerns**
   - Each app and package has a single, well-defined responsibility
   - Clear boundaries between UI, database, and business logic

2. **Centralized Database Management**
   - All Supabase and Drizzle ORM queries are in `packages/database`
   - Type-safe database operations exported as reusable functions
   - No direct database queries in apps or other packages

3. **Authentication & Authorization**
   - Supabase Auth SSR implemented in `apps/main` using `@supabase/ssr`
   - Consistent cookie handling patterns across the application

4. **UI Component System**
   - Shared UI components in `packages/ui` using shadcn/ui
   - Consistent design system across all applications

### Package-Specific Guidelines

#### apps/main
- Core Next.js application with SSR
- Uses tRPC for type-safe API endpoints
- Implements Supabase Auth SSR
- Imports UI components from `@workspace/ui`
- Uses database queries from `@workspace/database`

#### apps/website
- Static marketing site
- No authentication or database queries
- Uses shared UI components
- Focus on SEO and performance

#### packages/database
- Central source for all database operations
- Drizzle ORM schema definitions
- Type-safe query functions
- No UI or application logic

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10.4.1
- Supabase account and project

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/main/.env.example apps/main/.env.local
cp packages/database/.env.example packages/database/.env.local
```

### Development

```bash
# Run all apps and packages
pnpm dev

# Run specific app
pnpm --filter main dev
pnpm --filter website dev
```

## 🛠️ Development Workflow

### Adding UI Components

```bash
# Add shared components
pnpm dlx shadcn@latest add button -c packages/ui

# Add app-specific components
pnpm dlx shadcn@latest add button -c apps/main
```

### Database Operations

1. Define schemas in `packages/database/src/schema`
2. Create queries in `packages/database/src/queries`
3. Export and use type-safe query functions

### Authentication

Authentication is handled in `apps/main`:
- SSR implementation in `apps/main/lib/auth.ts`
- Middleware in `apps/main/middleware.ts`
- Uses `@supabase/ssr` for cookie management

### End-to-End Testing

E2E testing is organized per application following industry best practices:

- **`apps/e2e-main`**: Dedicated e2e tests for the main application
- **Playwright**: Cross-browser testing (Chrome, Firefox, Safari, Mobile)
- **GitHub Actions**: Automated testing on pull requests
- **Multi-browser support**: Desktop and mobile viewports

```bash
# First time setup
pnpm --filter e2e-main run install-browsers

# Run main app e2e tests (requires main app running on port 3000)
pnpm --filter main dev  # In separate terminal
pnpm --filter e2e-main test

# Interactive mode
pnpm --filter e2e-main test:ui

# Run all e2e tests via turbo
pnpm turbo test:e2e
```

**Test Coverage**: Login/register pages, navigation, dashboard access, responsive design

**CI/CD**: Tests run automatically on PRs to `main`/`develop` branches with artifact upload for failures.

## 🏗️ Building for Production

```bash
# Build all packages and apps
pnpm build

# Build specific app
pnpm --filter main build
pnpm --filter website build
```

## 📚 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **API**: tRPC
- **UI**: shadcn/ui + Tailwind CSS
- **Authentication**: Supabase Auth
- **Background Jobs**: TriggerDev
- **Testing**: Playwright (E2E)
- **Package Manager**: pnpm
- **Build Tool**: Turborepo

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TriggerDev Documentation](https://trigger.dev/docs)

## 📝 License

MIT
