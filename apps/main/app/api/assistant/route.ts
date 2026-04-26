import {
  Experimental_Agent as Agent,
  createUIMessageStream,
  convertToModelMessages,
  JsonToSseTransformStream,
  stepCountIs,
} from "ai";
import {
  chatModel,
  getAssistantProvider,
  resolveAiRuntimeConfig,
} from "@/lib/ai/provider";
import {
  getChatById,
  createChat,
  saveMessage,
  LOCAL_USER_ID,
  getSwiggySpendingOverview,
} from "@workspace/database";
import { swiggyAnalyticsTools } from "@/lib/ai/tools/swiggy-analytics";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log("[assistant] === REQUEST RECEIVED ===");
    const provider = getAssistantProvider();
    if (!provider.ready) {
      return new Response(
        JSON.stringify({
          error: provider.reason,
          message: "Configure an assistant provider before starting chat.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { message, chatId, id } = await req.json();
    console.log("[assistant] Message received:", {
      chatId,
      messageId: id,
      role: message?.role,
      partsCount: message?.parts?.length,
    });

    if (!message || !message.parts) {
      console.log("[assistant] ❌ Invalid message format");
      return new Response("Invalid message format", { status: 400 });
    }

    console.log("[assistant] Fetching chat:", chatId);
    let chatWithMessages = await getChatById(chatId, LOCAL_USER_ID);

    if (!chatWithMessages) {
      console.log("[assistant] Chat not found, creating new chat");
      const firstMessageText =
        message.parts.find((p: any) => p.type === "text")?.text || "New Chat";
      const title =
        firstMessageText.slice(0, 50) +
        (firstMessageText.length > 50 ? "..." : "");

      console.log("[assistant] Creating chat with title:", title);
      await createChat(LOCAL_USER_ID, title, chatId);
      chatWithMessages = await getChatById(chatId, LOCAL_USER_ID);
      console.log("[assistant] ✅ Chat created successfully");
    } else {
      console.log(
        "[assistant] ✅ Chat found with",
        chatWithMessages.messages?.length || 0,
        "existing messages",
      );
    }

    const existingMessages = chatWithMessages?.messages || [];

    console.log("[assistant] Saving user message to database");
    await saveMessage(chatId, message.role, message.parts);
    console.log("[assistant] ✅ User message saved");

    const uiMessages = [
      ...existingMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        createdAt: msg.createdAt,
      })),
      message,
    ];

    console.log("[assistant] Total messages for context:", uiMessages.length);
    const fallbackReply = await buildFallbackReply();
    const runtimeConfig = resolveAiRuntimeConfig();

    if (!(await modelSupportsTools(runtimeConfig))) {
      console.log(
        "[assistant] Tool calling unavailable, using deterministic fallback",
      );
      const fallbackStream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "start-step" });
          writer.write({ type: "text-start", id: "text-1" });
          writer.write({
            type: "text-delta",
            id: "text-1",
            delta: fallbackReply,
          });
          writer.write({ type: "text-end", id: "text-1" });
          writer.write({ type: "finish-step" });
          writer.write({ type: "finish" });
        },
        onFinish: async ({ messages: responseMessages }) => {
          await saveAssistantMessages(chatId, responseMessages);
        },
      });

      return new Response(
        fallbackStream.pipeThrough(new JsonToSseTransformStream()),
      );
    }

    console.log("[assistant] Creating local assistant agent");
    const agent = new Agent({
      model: chatModel(),
      system: `You are a friendly personal finance assistant that helps users understand their Swiggy spending patterns. You're conversational, insightful, and focused on giving users actionable insights about their food spending habits.

          Response Style:
          ✅ "I found your top 5 restaurants! Here's where you spend the most..."
          ✅ "Looking at your Swiggy data, you've spent ₹2,450 on food delivery this month..."
          ✅ "No completed food delivery orders found in your current local seed data yet."

          Use the Swiggy analytics tools whenever a question asks for totals, trends, restaurants, ordering behavior, delivery areas, delivery fees, savings, or date-specific spending.
          Do not mention implementation details.`,

      stopWhen: stepCountIs(4),
      tools: swiggyAnalyticsTools,

      onStepFinish: (options: any) => {
        console.log("[assistant] ✅ Step finished:", {
          stepNumber: options.stepNumber,
          toolCalls: options.toolCalls?.map((tc: any) => tc.toolName),
          toolResults: options.toolResults?.map((tr: any) => tr.toolName),
          finishReason: options.finishReason,
          hasText: !!options.text,
        });
      },
    });

    console.log("[assistant] Creating UI message stream with agent");
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log("[assistant] 🚀 Starting agent stream execution");
        const result = agent.stream({
          messages: convertToModelMessages(uiMessages),
        });

        // Consume and merge the stream
        console.log("[assistant] Consuming and merging agent stream");
        result.consumeStream({
          onError: (error) => {
            console.error("[assistant] stream consume error:", error);
          },
        });
        dataStream.merge(
          result.toUIMessageStream({
            onError: (error) => {
              console.error("[assistant] stream fallback:", error);
              return fallbackReply;
            },
          }),
        );
        console.log("[assistant] Stream setup complete");
      },
      onFinish: async ({ messages: responseMessages }) => {
        await saveAssistantMessages(chatId, responseMessages);
      },
    });

    console.log("[assistant] 📡 Returning SSE stream to client");
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error: any) {
    console.error("[assistant] ❌ ERROR:", error);
    console.error("[assistant] Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function buildFallbackReply() {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const overview = await getSwiggySpendingOverview(
      LOCAL_USER_ID,
      startDate,
      endDate,
    );

    if (overview.orderCount === 0) {
      return "No completed Swiggy orders were found in your local data yet, so there is nothing to summarize right now.";
    }

    const topRestaurant = overview.topRestaurants[0]?.name;
    const totalSpend = Math.round(overview.totalSpend);
    const avgOrderValue = Math.round(overview.avgOrderValue);
    const restaurantLine = topRestaurant
      ? ` Your top restaurant is ${topRestaurant}.`
      : "";

    return `Your last 90 days show ${overview.orderCount} Swiggy orders totaling Rs ${totalSpend}, with an average order value of Rs ${avgOrderValue}.${restaurantLine}`;
  } catch (error) {
    console.error("[assistant] fallback summary failed:", error);
    return "I could not load the detailed assistant tools just now, but your local data is still available in the dashboard and transactions views.";
  }
}

async function modelSupportsTools(input: {
  baseURL: string;
  chatModel: string;
}) {
  try {
    const response = await fetch(`${input.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: input.chatModel,
        messages: [{ role: "user", content: "ping" }],
        tools: [
          {
            type: "function",
            function: {
              name: "probe_tool_support",
              description: "Internal capability probe for tool calling.",
              parameters: {
                type: "object",
                properties: {},
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: "auto",
        max_tokens: 1,
        stream: false,
      }),
    });

    if (response.ok) {
      return true;
    }

    const body = await response.text();
    console.warn("[assistant] Tool support probe failed:", body);
    return false;
  } catch (error) {
    console.warn("[assistant] Tool support probe errored:", error);
    return false;
  }
}

async function saveAssistantMessages(chatId: string, responseMessages: any[]) {
  console.log("[assistant] 🏁 Stream finished, saving assistant messages");
  console.log("[assistant] Response messages count:", responseMessages.length);

  await Promise.all(
    responseMessages.map((msg: any) => {
      console.log("[assistant] Saving message:", {
        role: msg.role,
        partsCount: msg.parts?.length,
      });
      return saveMessage(chatId, msg.role, msg.parts);
    }),
  );

  console.log("[assistant] ✅ All assistant messages saved to database");
}
