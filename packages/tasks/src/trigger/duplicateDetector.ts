import { markDuplicatesForUser } from "@workspace/database";

export async function runDuplicateDetection(payload: { userId: string }) {
  const duplicatesFound = await markDuplicatesForUser(payload.userId);
  return {
    userId: payload.userId,
    duplicatesFound,
    completedAt: new Date().toISOString(),
  };
}

export const detectDuplicateTransactionsForUser = {
  trigger: runDuplicateDetection,
};
