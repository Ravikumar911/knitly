import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { chatModel, getAssistantProvider } from "@/lib/ai/provider";
import { LOCAL_USER_ID } from "@workspace/database";
import {
  ensureChatForAssistant,
  saveAssistantFromFinish,
  saveNewUserTurn,
} from "@/lib/assistant/persist-chat";

export const maxDuration = 30;

const streamBodySchema = z.object({
  chatId: z.string().uuid(),
  messages: z.array(z.unknown()),
  model: z.string().optional(),
  webSearch: z.boolean().optional(),
  id: z.string().optional(),
});

function firstTextFromUserMessage(message: UIMessage): string {
  const textPart = message.parts.find(
    (p): p is { type: "text"; text: string } => p.type === "text",
  );
  return textPart?.text?.trim() || "New Chat";
}

/**
 * Simple assistant: `streamText` + UI message stream, persisted like POST /api/assistant.
 * Swiggy tools + agent path remain on `POST /api/assistant`.
 */
export async function POST(req: Request) {
  const provider = getAssistantProvider();
  if (!provider.ready) {
    return new Response(
      JSON.stringify({
        error: provider.reason,
        message: "Configure an assistant provider before starting chat.",
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = streamBodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages: rawMessages, webSearch } = parsed.data;
  const messages = rawMessages as UIMessage[];
  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Expected a non-empty messages array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { chatId } = parsed.data;
  const lastMessage = messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return new Response(
      JSON.stringify({
        error: "Last message must be a user message for this transport.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const titleSource = firstTextFromUserMessage(lastMessage);

  try {
    await ensureChatForAssistant(LOCAL_USER_ID, chatId, titleSource);
    await saveNewUserTurn(chatId, lastMessage);
  } catch (err) {
    console.error("[assistant/stream] persist user / ensure chat failed:", err);
    return new Response(
      JSON.stringify({
        error: "Could not save chat message",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const system =
    webSearch === true
      ? "You are a helpful assistant. The user asked for web-style or up-to-date information. You do not have live web access; answer from your training knowledge and state clearly when a fact may be incomplete or out of date."
      : "You are a helpful assistant that can answer questions and help with tasks.";

  const result = streamText({
    model: chatModel(),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    sendSources: true,
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted || !responseMessage || responseMessage.role !== "assistant") {
        return;
      }
      try {
        await saveAssistantFromFinish(chatId, [responseMessage]);
      } catch (err) {
        console.error("[assistant/stream] persist assistant failed:", err);
      }
    },
  });
}
