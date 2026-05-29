import type { UIMessage } from "ai";
import { createChat, getChatById, saveMessage } from "@workspace/database";

function titleFromFirstUserText(text: string): string {
  const trimmed = text.trim() || "New Chat";
  return trimmed.slice(0, 50) + (trimmed.length > 50 ? "..." : "");
}

/**
 * Ensure a chat row exists for this id; create with title derived from user text if missing.
 */
export async function ensureChatForAssistant(
  userId: string,
  chatId: string,
  firstUserTextForTitle: string,
): Promise<void> {
  const existing = await getChatById(chatId, userId);
  if (existing) {
    return;
  }
  const title = titleFromFirstUserText(firstUserTextForTitle);
  await createChat(userId, title, chatId);
}

export async function saveNewUserTurn(
  chatId: string,
  lastUser: UIMessage,
): Promise<void> {
  await saveMessage(chatId, lastUser.role, lastUser.parts);
}

/**
 * Persist assistant (and any other) UI messages returned when a stream finishes.
 */
export async function saveAssistantFromFinish(
  chatId: string,
  responseMessages: UIMessage[],
): Promise<void> {
  await Promise.all(
    responseMessages.map((msg) => saveMessage(chatId, msg.role, msg.parts)),
  );
}

/**
 * Maximum number of recent messages we send to the model.
 * Full history is still persisted. This is a simple safeguard against
 * 100+ message threads blowing up context (see review Issue 8).
 */
export const MAX_MODEL_CONTEXT_MESSAGES = 40;

/**
 * Trim a message list to the last N turns for model context.
 * Keeps the most recent messages (including the latest user turn).
 */
export function trimMessagesForModel(messages: UIMessage[]): UIMessage[] {
  if (messages.length <= MAX_MODEL_CONTEXT_MESSAGES) return messages;
  return messages.slice(-MAX_MODEL_CONTEXT_MESSAGES);
}
