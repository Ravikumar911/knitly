# Reference — Skills

A skill is a folder under `~/.slashcash/skills/` that extends what the local app can do. In Phase 2 we ship one bundled skill, `gmail-swiggy`, which registers the Gmail ingest job with the cron worker. Users can author their own skills (for example, a Sheets exporter, a Calendar-to-spend cross-reference, or a bank-statement PDF ingester) by dropping a folder with the right files into the skills directory.

This document describes the on-disk format, the manifest schema, the discovery rules, and the authoring guidelines. The registry implementation lives in `packages/cli/src/skills/`. The bundled `gmail-swiggy` skill ships from `packages/cli/src/skills-bundled/gmail-swiggy/` and is copied to `~/.slashcash/skills/` by `slashcash onboard`.

## On-disk format

A skill folder contains two required files and any number of optional ones.

`SKILL.md` is the human-readable runbook. It opens with a YAML frontmatter block and continues with prose describing what the skill does, how the agent should invoke it, and any caveats. The frontmatter mirrors the format used by openclaw and by the existing `gws-shared` skill: a `name`, a `description`, and a `metadata` object with a version and a `slashcash` namespace for our specific fields.

`manifest.json` duplicates the machine-readable parts of the frontmatter in a format the registry can load quickly without parsing markdown. It is the source of truth for job registration and doctor checks. When the two files disagree, the registry reports it and refuses to enable the skill until `slashcash doctor --fix` reconciles them (the repair regenerates the manifest from the frontmatter).

Optional additions sit alongside the two required files: a `scripts/` folder for shell or Node scripts the skill exposes, a `references/` folder for longer docs the agent may cite, an `assets/` folder for static files. Nothing under a skill folder is executed at load; the registry only reads the frontmatter and the manifest.

## What a manifest declares

A manifest carries the skill id, a semantic version, a short description, a category tag (one of `ingest`, `export`, `analytics`, `automation`, `other`), a list of binaries the skill needs on `PATH`, and a list of jobs the skill contributes. Each job carries an id, a cron schedule string, and an entrypoint reference that the worker uses to resolve the job function.

Binaries are enforced by `slashcash doctor`: if an enabled skill declares a binary that is not on `PATH`, doctor reports it and either repairs it (when the binary has a known install method, like the Homebrew tap for `gws`) or surfaces a clear message.

Jobs are registered with the cron worker at `slashcash start`. Disabling a skill in config unregisters its jobs on the next start. The bundled `gmail-swiggy` skill contributes a single job that runs the Gmail ingest function from `packages/tasks`.

## Discovery rules

At CLI start, the registry enumerates every folder under `~/.slashcash/skills/`. For each folder with a `manifest.json`, the manifest is validated against the schema. Enabled skills (per `config.json`) contribute their jobs to the worker's registry. Disabled skills are noted in `slashcash skills list` but contribute nothing.

Hot-loading is limited: adding a new skill folder shows up in `slashcash skills list` without a restart because `list` re-reads the directory, but the cron worker only picks up new jobs at `slashcash start`. This keeps the running process predictable.

## Authoring a skill

A skill author writes `SKILL.md` with the frontmatter block, writes a matching `manifest.json`, and drops the folder into `~/.slashcash/skills/`. If the skill contributes jobs that call functions from the codebase (as `gmail-swiggy` does), those functions live in the `packages/tasks` workspace package and the manifest entrypoint references them by package-relative path. For user-authored skills, the entrypoint can also reference a local script inside the skill folder.

The registry validates before it enables. An invalid manifest, a missing required binary, or a broken entrypoint are all reasons to refuse to register the skill's jobs; the user sees a single clear message telling them what needs fixing.

## Versioning and compatibility

Skills declare a `version` in their manifest. The registry does not enforce semver constraints between the CLI and the skill; in v1 we maintain manual compatibility and document it here. Skills are treated as user content: they do not ship on npm, and they are not sandboxed. Only install skills from sources the user trusts.

## What's explicitly out of scope in v1

No plugin SDK with versioned contracts. No sandboxing. No npm-installable skill packages. No marketplace. No remote registry of skills. These are topics for a later phase, once the core CLI is stable and there is real demand for a richer skill surface.
