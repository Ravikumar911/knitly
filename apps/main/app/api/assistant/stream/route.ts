import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import {
  ASSISTANT_NOT_CONFIGURED_ERROR,
  ASSISTANT_STREAM_CHAT_MODEL_IDS,
  getAssistantProvider,
  resolveAssistantRuntimeConfig,
  resolveChatModelForRequest,
} from "@/lib/ai/provider";
import {
  buildAssistantFinanceContext,
  buildDeterministicQueryPlan,
  shouldLoadFinanceContext,
} from "@/lib/assistant/finance-context";
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
  model: z
    .enum(ASSISTANT_STREAM_CHAT_MODEL_IDS as unknown as [string, ...string[]])
    .optional(),
  webSearch: z.boolean().optional(),
  id: z.string().optional(),
});

function firstTextFromUserMessage(message: UIMessage): string {
  return textFromMessage(message) || "New Chat";
}

function textFromMessage(message: UIMessage): string {
  const textPart = message.parts.find(
    (p): p is { type: "text"; text: string } => p.type === "text",
  );
  return textPart?.text?.trim() || "";
}

function conversationTextFromMessages(messages: UIMessage[]) {
  return messages
    .slice(-8)
    .map((message) => {
      const text = textFromMessage(message);
      return text ? `${message.role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Streaming assistant for the current UI.
 *
 * Local finance questions get a deterministic SQLite fact pack before the model
 * runs. This keeps the path friendly to laptop-sized OpenAI-compatible models
 * that may not reliably support tool calls.
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

  let financeContext: Awaited<ReturnType<typeof buildAssistantFinanceContext>> =
    null;
  let financeContextError: string | null = null;
  const conversationText = conversationTextFromMessages(messages.slice(0, -1));

  if (shouldLoadFinanceContext(titleSource, conversationText)) {
    try {
      const queryPlan = buildDeterministicQueryPlan({
        userText: titleSource,
        conversationText,
      });
      financeContext = await buildAssistantFinanceContext({
        userId: LOCAL_USER_ID,
        userText: titleSource,
        conversationText,
        queryPlan,
      });
    } catch (err) {
      financeContextError =
        err instanceof Error ? err.message : "Unknown local data error";
      console.error("[assistant/stream] finance context failed:", err);
    }
  }

  const system = buildSystemPrompt({
    webSearch: webSearch === true,
    financeContext: financeContext?.system,
    financeContextError,
  });

  const result = streamText({
    model: provider.model,
    system,
    messages: await convertToModelMessages(messages),
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

function buildSystemPrompt(input: {
  webSearch: boolean;
  financeContext?: string;
  financeContextError: string | null;
}) {
  const parts = [
    "You are slash.cash's local-first assistant. Be concise, practical, and honest about what data you have.",
  ];

  if (input.webSearch) {
    parts.push(
      "The user requested web-style or up-to-date information, but this assistant has no live web access in this stream. Answer from model knowledge and clearly say when current facts may be incomplete or out of date.",
    );
  }

  if (input.financeContext) {
    parts.push(input.financeContext);
  } else if (input.financeContextError) {
    parts.push(
      `The user appears to be asking about local spending, but local finance data could not be loaded (${input.financeContextError}). Do not invent numbers; say the local data is unavailable right now.`,
    );
  }

  return parts.join("\n\n");
}
