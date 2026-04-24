import { eq } from "drizzle-orm";
import { db } from "../client";
import { LOCAL_USER_ID, profiles } from "../schema/users";

export type LocalProfileIdentity = {
  id: string;
  name: string;
  email: string | null;
};

const DEFAULT_PROFILE_NAME = "Local user";

export async function getLocalProfileIdentity(
  userId: string = LOCAL_USER_ID,
): Promise<LocalProfileIdentity> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return {
    id: userId,
    name: buildDisplayName(profile?.first_name, profile?.last_name),
    email: normalizeStoredEmail(profile?.email),
  };
}

export async function syncLocalProfileIdentity(
  userId: string,
  email: string,
): Promise<LocalProfileIdentity> {
  const normalizedEmail = normalizeRequiredEmail(email);
  const { firstName, lastName } = deriveNameParts(normalizedEmail);
  const updatedAt = new Date();

  await db
    .insert(profiles)
    .values({
      id: userId,
      email: normalizedEmail,
      first_name: firstName,
      last_name: lastName,
      updated_at: updatedAt,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        updated_at: updatedAt,
      },
    });

  return getLocalProfileIdentity(userId);
}

export async function resetLocalProfileIdentity(
  userId: string = LOCAL_USER_ID,
): Promise<LocalProfileIdentity> {
  const updatedAt = new Date();

  await db
    .insert(profiles)
    .values({
      id: userId,
      email: null,
      first_name: "Local",
      last_name: "User",
      updated_at: updatedAt,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: null,
        first_name: "Local",
        last_name: "User",
        updated_at: updatedAt,
      },
    });

  return getLocalProfileIdentity(userId);
}

function normalizeRequiredEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Profile email is required.");
  }
  return normalized;
}

function normalizeStoredEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function buildDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const fullName = [firstName, lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return fullName || DEFAULT_PROFILE_NAME;
}

function deriveNameParts(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const parts = localPart
    .replace(/[._+-]+/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(capitalizeWord);

  return {
    firstName: parts[0] ?? "Local",
    lastName: parts.slice(1).join(" ") || null,
  };
}

function capitalizeWord(word: string) {
  if (word.length === 0) {
    return word;
  }

  return word[0]!.toUpperCase() + word.slice(1);
}
