"use client";

import type { AssistantConfig } from "@/lib/ai/provider";
import { ChatBot } from "./chat-bot";

/**
 * `/assistant` without a chat id in the address bar. A per-session id is used for the stream;
 * the URL changes to `/assistant/<uuid>` after the first complete assistant response (avoids
 * a mid-stream navigation that would remount the chat).
 * The id must be created in a Server Component and passed in so it matches on SSR + hydration.
 */
export function AssistantLandingChat({
  chatId,
  assistantConfig,
}: {
  chatId: string;
  assistantConfig: AssistantConfig;
}) {
  return (
    <ChatBot
      assistantConfig={assistantConfig}
      chatId={chatId}
      initialMessages={[]}
    />
  );
}
