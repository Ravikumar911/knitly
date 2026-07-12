import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { OnboardHost } from "@workspace/tasks/onboard";
import { createDefaultOnboardHost } from "@workspace/tasks/onboard";

export function resolveBundledSkillsRoot(): string | null {
  if (process.env.SLASHCASH_BUNDLED_SKILLS_DIR) {
    return process.env.SLASHCASH_BUNDLED_SKILLS_DIR;
  }

  const candidates = [
    join(process.cwd(), "packages/cli/bundled-skills"),
    join(process.cwd(), "bundled-skills"),
    join(process.cwd(), "..", "cli", "bundled-skills"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function createAppOnboardHost(
  overrides: Partial<Parameters<typeof createDefaultOnboardHost>[0]> = {},
): OnboardHost {
  return createDefaultOnboardHost({
    bundledSkillsRoot: resolveBundledSkillsRoot(),
    ...overrides,
  });
}
