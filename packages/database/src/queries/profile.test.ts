import { describe, expect, it } from "vitest";
import { LOCAL_USER_ID, sqlite } from "../index";
import {
  getLocalProfileIdentity,
  resetLocalProfileIdentity,
  syncLocalProfileIdentity,
} from "./profile";

describe("local profile identity", () => {
  it("stores the onboarded Gmail address and derives a display name", async () => {
    await resetLocalProfileIdentity(LOCAL_USER_ID);

    const updated = await syncLocalProfileIdentity(
      LOCAL_USER_ID,
      "jane.doe+money@gmail.com",
    );

    expect(updated.email).toBe("jane.doe+money@gmail.com");
    expect(updated.name).toBe("Jane Doe Money");
  });

  it("falls back to the local placeholder after reset", async () => {
    await syncLocalProfileIdentity(LOCAL_USER_ID, "owner@example.com");
    await resetLocalProfileIdentity(LOCAL_USER_ID);

    const profile = await getLocalProfileIdentity(LOCAL_USER_ID);
    const stored = sqlite
      .prepare("select email from profiles where id = ?")
      .get(LOCAL_USER_ID) as { email: string | null };

    expect(profile.email).toBeNull();
    expect(profile.name).toBe("Local User");
    expect(stored.email).toBeNull();
  });
});
