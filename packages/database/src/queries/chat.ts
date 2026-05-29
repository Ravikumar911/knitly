import { eq, and, desc } from "drizzle-orm";
import { db } from "../";
import { chats } from "../schema/chat";
import { chatMessages } from "../schema/chatMessages";

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: string;
  parts: any;
  createdAt: Date;
}

export interface ChatWithMessages extends Chat {
  messages: ChatMessage[];
}

/**
 * Create a new chat session
 */
export async function createChat(
  userId: string,
  title: string,
  id?: string,
): Promise<Chat> {
  const result = await db
    .insert(chats)
    .values({
      ...(id && { id }), // ✅ Use provided ID if available
      userId,
      title,
    })
    .returning();

  return result[0] as Chat;
}

/**
 * Get chat by ID with auth check
 */
export async function getChatById(
  chatId: string,
  userId: string,
): Promise<ChatWithMessages | null> {
  const chatResult = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (!chatResult.length) {
    return null;
  }

  const messagesResult = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(chatMessages.createdAt);

  return {
    ...chatResult[0],
    messages: messagesResult as ChatMessage[],
  } as ChatWithMessages;
}

/**
 * Get user's chats with pagination
 */
export async function getUserChats(
  userId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Chat[]> {
  const result = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(limit)
    .offset(offset);

  return result as Chat[];
}

/**
 * Delete chat (messages cascade automatically)
 */
export async function deleteChat(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Save a message to a chat
 */
export async function saveMessage(
  chatId: string,
  role: string,
  parts: any,
): Promise<ChatMessage> {
  const result = await db
    .insert(chatMessages)
    .values({
      chatId,
      role,
      parts,
    })
    .returning();

  // Update chat's updatedAt timestamp
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));

  return result[0] as ChatMessage;
}

/**
 * Get all messages for a chat
 */
export async function getChatMessages(
  chatId: string,
  userId: string,
): Promise<ChatMessage[]> {
  // First verify user owns this chat
  const chatResult = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (!chatResult.length) {
    return [];
  }

  const result = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(chatMessages.createdAt);

  return result as ChatMessage[];
}

/**
 * Update chat title
 */
export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const result = await db
    .update(chats)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning();

  return result.length > 0;
}
