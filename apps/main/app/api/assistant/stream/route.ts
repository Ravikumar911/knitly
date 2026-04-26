import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel, getAssistantProvider } from "@/lib/ai/provider";

export const maxDuration = 30;

/**
 * Simpler assistant transport: `streamText` + UI message stream.
 * For Swiggy tools + DB persistence, use `POST /api/assistant` instead.
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

  const json: {
    id?: string;
    messages?: UIMessage[];
    model?: string;
    webSearch?: boolean;
  } = await req.json();

  const { messages, webSearch } = json;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Expected a non-empty messages array", { status: 400 });
  }

  const system =
    webSearch === true
      ? "You are a helpful assistant. The user asked for web-style or up-to-date information. You do not have live web access; answer from your training knowledge and state clearly when a fact may be incomplete or out of date."
      : "You are a helpful assistant that can answer questions and help with tasks.";

  const result = streamText({
    // Local Ollama (Gemma) via configured provider; same for “search” mode — no Perplexity.
    model: chatModel(),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}
