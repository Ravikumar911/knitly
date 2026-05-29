import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  ASSISTANT_NOT_CONFIGURED_ERROR,
  ASSISTANT_STREAM_CHAT_MODEL_IDS,
  getAssistantProvider,
  resolveAssistantRuntimeConfig,
  resolveChatModelForRequest,
} from "@/lib/ai/provider";
import { financeTools } from "@/lib/ai/tools/finance";
import { buildAssistantSystemPrompt } from "@/lib/ai/assistant-instructions";
import { LOCAL_USER_ID } from "@workspace/database";
import {
  ensureChatForAssistant,
  saveAssistantFromFinish,
  saveNewUserTurn,
  trimMessagesForModel,
} from "@/lib/assistant/persist-chat";

export const maxDuration = 30;

const streamBodySchema = z.object({
  chatId: z.string().uuid(),
  messages: z.array(z.unknown()),
  model: z
    .enum(ASSISTANT_STREAM_CHAT_MODEL_IDS as unknown as [string, ...string[]])
    .optional(),
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
 * Streaming assistant powered by AI SDK tools (model decides all parameters).
 */
export async function POST(req: Request) {
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

  const runtime = resolveAssistantRuntimeConfig();
  const resolvedModel = resolveChatModelForRequest(parsed.data.model, runtime);
  if (!resolvedModel.ok) {
    const status =
      resolvedModel.error === ASSISTANT_NOT_CONFIGURED_ERROR ? 409 : 400;
    return new Response(JSON.stringify({ error: resolvedModel.error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const provider = await getAssistantProvider({
    ...runtime,
    chatModel: resolvedModel.chatModel,
  });
  if (!provider.ready) {
    return new Response(
      JSON.stringify({
        error: provider.reason,
        message: "Configure an assistant provider before starting chat.",
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
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

  // Always provide the finance tools. The model decides whether (and how) to call them.
  // Tool calling quality depends on the chosen provider/model — capable models will use them naturally.
  const result = streamText({
    model: provider.model,
    system: buildAssistantSystemPrompt({ webSearch: webSearch === true }),
    messages: await convertToModelMessages(trimMessagesForModel(messages)),
    tools: financeTools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    sendSources: true,
    onFinish: async ({ responseMessage, isAborted }) => {
      if (
        isAborted ||
        !responseMessage ||
        responseMessage.role !== "assistant"
      ) {
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
