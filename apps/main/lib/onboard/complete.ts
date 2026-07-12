import {
  createDefaultOnboardHost,
  type OnboardHost,
} from "@workspace/tasks/onboard";
import { existsSync } from "node:fs";
import { join } from "node:path";

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

/**
 * Local single-user gate: onboard is complete once assistant + Gmail IMAP
 * credentials are configured (E2E mode treats a persisted config as enough).
 */
export async function isOnboardComplete(
  host: OnboardHost = createAppOnboardHost(),
): Promise<boolean> {
  const paths = host.resolvePaths();
  if (!host.configExists(paths)) {
    return false;
  }

  const config = host.loadConfig();
  if (config.assistant.provider === "none") {
    return false;
  }

  if (process.env.SLASHCASH_E2E === "1") {
    return existsSync(paths.db);
  }

  const address = config.gmail.address.trim().toLowerCase();
  if (!address) {
    return false;
  }

  const credentials = await host.readStoredCredentials();
  return Boolean(
    credentials && credentials.address.trim().toLowerCase() === address,
  );
}
