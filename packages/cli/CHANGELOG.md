# slashcash

## 0.1.12

### Patch Changes

- Reworked the npm README so the published `slashcash` package explains the open-source slash.cash app, local-first dashboard, install flow, requirements, common commands, contribution path, and security reporting.
- Updated npm package metadata with a clearer app-focused description and discovery keywords.
- Refreshed release documentation now that the repository is public and npm provenance is enabled.

**Full Diff**: https://github.com/Ravikumar911/knitly/compare/v0.1.11...v0.1.12

## 0.1.11

### Major Features

- **Assistant Refactor**: Complete migration from deterministic planner to model-driven AI SDK v5 tools

  - 6 new focused finance tools (`listOrders`, `spendingSummary`, `spendingTrends`, `topMerchants`, `orderDetail`, `spendingOverview`)
  - All tools backed exclusively by new helpers in `@workspace/database`
  - Strong system prompt enforcing "call `spendingOverview` first" for better context

- **Evaluation System**: New comprehensive evaluation harness under `apps/main/lib/ai/evals/`
  - Golden dataset with high-signal test cases
  - Vitest snapshot tests on tool trajectories (runs in CI)
  - Full runner script with optional LLM-as-judge scoring
  - CI job for assistant regression testing

### Review Fixes (all 11 issues addressed)

- Fixed missing `mkdirSync` for eval results directory
- Removed dead analytics rotation code from MessageBubble
- Unified error return shapes across all 6 finance tools (`FinanceToolError` type)
- Aligned evals to production `streamText` / `generateText` path (removed `ToolLoopAgent` divergence)
- Deleted legacy `Experimental_Agent` route (`/api/assistant`)
- Added `FULL_HISTORY_CAP` (8000 rows) + truncation notes for non-recent DB queries
- Fixed local timezone issues in date filter parsing (`toDbFilters`)
- Expanded Vitest mocks to cover all imported DB helpers
- Clarified `listAssistantOrders` recent vs top-spend fallback behavior
- Updated stale "5 tools" comments and documentation
- Improved `hasActiveTools` detection to include in-progress streaming messages

### Other Improvements

- Proper ESLint configuration for `_`-prefixed unused variables in shared config (no more scattered disables)
- Various UI loading state and chat improvements

**Full Diff**: https://github.com/Ravikumar911/knitly/compare/v0.1.10...v0.1.11
