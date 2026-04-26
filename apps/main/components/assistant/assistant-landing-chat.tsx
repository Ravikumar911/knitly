"use client";

import { ChatBot } from "./chat-bot";

/**
 * `/assistant` without a chat id in the address bar. A per-session id is used for the stream;
 * the URL changes to `/assistant/<uuid>` after the first complete assistant response (avoids
 * a mid-stream navigation that would remount the chat).
 * The id must be created in a Server Component and passed in so it matches on SSR + hydration.
 */
export function AssistantLandingChat({ chatId }: { chatId: string }) {
  return <ChatBot chatId={chatId} initialMessages={[]} />;
}
