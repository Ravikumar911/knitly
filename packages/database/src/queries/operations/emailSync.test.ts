import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db, ensureLocalDatabase } from "../../index";
import { profiles } from "../../schema/users";
import { getSyncStatus, markSyncComplete, markSyncFailed } from "./emailSync";

describe("email sync status queries", () => {
  it("clears stale error details when a sync completes", async () => {
    const userId = `sync-test-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Sync",
      last_name: "Test",
      updated_at: new Date(),
    });

    await markSyncFailed(userId, "interrupted");
    await markSyncComplete(userId);

    const status = await getSyncStatus(userId);
    expect(status.syncStatus).toBe("complete");
    expect(status.errorDetails).toBeNull();
    expect(status.requiresReauth).toBe(false);
  });
});
