# Trigger.dev Tasks

This package contains Trigger.dev tasks for the project.

## Environment Setup

Environment variables are set directly in the package.json scripts using cross-env, which ensures they work across all platforms.

The `TRIGGER_SECRET_KEY` is directly set in the `dev` script for development. For production environments, you should set this through your deployment platform.

To add more environment variables:

1. Update the dev script in package.json:
   ```json
   "dev": "pnpm dlx trigger.dev@latest dev"
   ```

2. Run the development server:
   ```
   pnpm dev
   ```

## Available Tasks

- `processEmails`: Processes emails by fetching messages from Gmail.

## Adding New Tasks

When creating new tasks, make sure to:

1. Export the task from its file
2. Follow the Trigger.dev v3 API pattern
3. Add any new environment variables to the dev script in package.json 