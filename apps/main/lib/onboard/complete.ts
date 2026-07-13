import {
  loadConfig,
  readStoredCredentials,
  resolvePaths,
} from "@workspace/tasks/local-state";
import { existsSync } from "node:fs";

/**
 * Local single-user gate: onboard is complete once assistant + Gmail IMAP
 * credentials are configured (E2E mode treats a persisted config as enough).
 *
 * Uses local-state helpers only so App Router entry gates do not pull the
 * Node-only onboard host (IMAP/subprocess) into the Next compile graph.
 */
export async function isOnboardComplete(): Promise<boolean> {
  const paths = resolvePaths();
  if (!existsSync(paths.config)) {
    return false;
  }

  const config = loadConfig();
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

  const credentials = await readStoredCredentials();
  return Boolean(
    credentials && credentials.address.trim().toLowerCase() === address,
  );
}
