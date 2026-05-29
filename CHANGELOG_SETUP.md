# Changelog and Release Setup Guide

This document explains how the changelog and release system works in this monorepo and how to use it.

## Overview

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelog generation in our monorepo. This system allows us to:

- Track changes across multiple packages
- Generate automatic changelogs
- Create GitHub releases with proper tags
- Version packages independently when needed

## How It Works

### 1. Creating a Changeset

When you make changes that should be included in a release, create a changeset:

```bash
# Add a changeset describing your changes
pnpm changeset
```

This will:

- Ask you which packages have changed
- Ask for the type of change (major, minor, patch)
- Ask for a description of the changes
- Create a markdown file in `.changeset/` directory

### 2. Automatic Release Process

When changes are merged to `main`:

1. **If there are pending changesets:**

   - A PR is created with version bumps and changelog updates
   - You can review and merge this PR to trigger a release

2. **If there are no pending changesets:**

   - No release is created (working as intended)

3. **When release PR is merged:**
   - Packages are built and published
   - GitHub release is created with auto-generated changelog
   - Git tag is created automatically

## Package Structure

All packages are configured with consistent versioning:

- `@knitly/main` (main app) - v0.1.0
- `@knitly/website` (marketing site) - v0.1.0
- `@workspace/database` (database package) - v0.1.0
- `@workspace/ui` (UI components) - v0.1.0
- `@workspace/tasks` (background tasks) - v0.1.0
- `@workspace/eslint-config` (ESLint config) - v0.1.0
- `@workspace/typescript-config` (TypeScript config) - v0.1.0

## Manual Commands

```bash
# Create a new changeset
pnpm changeset

# Check current changeset status
pnpm changeset:status

# Version packages locally (usually done by CI)
pnpm version-packages

# Release packages (usually done by CI)
pnpm release
```

## Testing the Workflow

### Method 1: Create a Test Changeset

1. Make a small change to any package (e.g., update a comment)
2. Run `pnpm changeset` and follow the prompts
3. Commit and push to a feature branch
4. Create PR and merge to main
5. Check if the Release PR is created automatically

### Method 2: Manual Release Testing

```bash
# 1. Create a changeset
pnpm changeset

# 2. Version packages
pnpm version-packages

# 3. Check what changed
git status

# 4. Commit the changes
git add .
git commit -m "chore: version packages"

# 5. Push to trigger release (or test locally)
git push
```

## Configuration Files

- `.changeset/config.json` - Changeset configuration
- `.github/workflows/release.yml` - Release workflow
- `package.json` - Root package with release scripts

## Troubleshooting

### No releases are being created

- Check if you have pending changesets: `pnpm changeset:status`
- Ensure changes are properly committed and pushed to main
- Check GitHub Actions logs for any errors

### Release workflow fails

- Ensure all packages build successfully: `pnpm build`
- Check if all dependencies are properly installed
- Verify GitHub token permissions

### Packages not getting versioned

- Check `.changeset/config.json` configuration
- Ensure packages are not in the `ignore` array
- Verify package.json files have proper names and versions

## Benefits of This Setup

1. **Automated**: Once configured, releases happen automatically
2. **Consistent**: All packages follow the same versioning scheme
3. **Transparent**: Clear changelog shows what changed in each release
4. **Flexible**: Can create different types of releases (major, minor, patch)
5. **Safe**: Review process ensures changes are intentional

## Example Changeset

When you run `pnpm changeset`, you might create something like:

```markdown
---
"@workspace/ui": patch
"@knitly/main": patch
---

Add new Button variant and update main app to use it

- Added `destructive` variant to Button component
- Updated login form to use new button style
- Fixed button spacing issues
```

This will update both the UI package and main app with a patch version bump.
