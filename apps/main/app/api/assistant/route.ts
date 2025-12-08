import { Experimental_Agent as Agent, createUIMessageStream, convertToModelMessages, JsonToSseTransformStream, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/supabase/server';
import { createQuerySwiggyDataTool } from '@/lib/ai/tools/query-swiggy-data';
import { getChatById, createChat, saveMessage } from '@workspace/database';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('[assistant] === REQUEST RECEIVED ===');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[assistant] ❌ Authentication failed:', authError);
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('[assistant] ✅ User authenticated:', user.id);

    const { message, chatId, id } = await req.json();
    console.log('[assistant] Message received:', {
      chatId,
      messageId: id,
      role: message?.role,
      partsCount: message?.parts?.length,
    });

    if (!message || !message.parts) {
      console.log('[assistant] ❌ Invalid message format');
      return new Response('Invalid message format', { status: 400 });
    }

    // ✅ Get or create chat
    console.log('[assistant] Fetching chat:', chatId);
    let chatWithMessages = await getChatById(chatId, user.id);
    
    if (!chatWithMessages) {
      console.log('[assistant] Chat not found, creating new chat');
      // ✅ Create chat if it doesn't exist (auto-generate title from first message)
      const firstMessageText = message.parts.find((p: any) => p.type === 'text')?.text || 'New Chat';
      const title = firstMessageText.slice(0, 50) + (firstMessageText.length > 50 ? '...' : '');
      
      console.log('[assistant] Creating chat with title:', title);
      await createChat(user.id, title, chatId); // ✅ Pass chatId
      chatWithMessages = await getChatById(chatId, user.id);
      console.log('[assistant] ✅ Chat created successfully');
    } else {
      console.log('[assistant] ✅ Chat found with', chatWithMessages.messages?.length || 0, 'existing messages');
    }
    
    const existingMessages = chatWithMessages?.messages || [];
    
    // ✅ Save user message to database immediately (like reference implementation)
    console.log('[assistant] Saving user message to database');
    await saveMessage(chatId, message.role, message.parts);
    console.log('[assistant] ✅ User message saved');
    
    // ✅ Convert to UI messages format (matching reference)
    const uiMessages = [
      ...existingMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        createdAt: msg.createdAt,
      })),
      message,
    ];

    console.log('[assistant] Total messages for context:', uiMessages.length);

    // ✅ Create agent with multi-step execution
    console.log('[assistant] Creating agent with tools');
    const agent = new Agent({
      model: openai('gpt-5-mini'),
      system: `You are a friendly personal finance assistant helping users understand their Swiggy spending patterns.

RESPONSE GUIDELINES:
1. NEVER mention technical details (SQL, database operations, queries) to users
2. Give direct, conversational answers based on their data
3. Keep responses concise and insightful
4. Focus on trends and actionable takeaways

YOUR PROCESS:
1. Use the querySwiggyData tool to get transaction data
2. If no data is found, respond immediately with a simple explanation
3. If data is found, provide a natural, friendly analysis

RESPONSE STYLE:
✅ "You've spent ₹2,450 on pizza across 12 orders!"
✅ "Your top restaurant is Domino's with ₹3,200 in spending."
✅ "I couldn't find any pizza orders in your Swiggy history."

❌ "I'll query your transactions to find pizza spending..."
❌ "The database returned no results. Let me try a different query..."

When no data is found, respond immediately and suggest what the user might want to explore instead. Do not retry with different queries automatically.`,
      
      tools: {
        querySwiggyData: createQuerySwiggyDataTool(user.id),
      },
      
      stopWhen: stepCountIs(3), // Limit to 3 steps for faster responses
      
      onStepFinish: (options: any) => {
        console.log('[assistant] ✅ Step finished:', {
          stepNumber: options.stepNumber,
          toolCalls: options.toolCalls?.map((tc: any) => tc.toolName),
          toolResults: options.toolResults?.map((tr: any) => tr.toolName),
          finishReason: options.finishReason,
          hasText: !!options.text,
        });
      },
    });

    // ✅ Create UI message stream with agent
    console.log('[assistant] Creating UI message stream with agent');
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log('[assistant] 🚀 Starting agent stream execution');
        const result = agent.stream({
          messages: convertToModelMessages(uiMessages),
        });

        // Consume and merge the stream
        console.log('[assistant] Consuming and merging agent stream');
        result.consumeStream();
        dataStream.merge(result.toUIMessageStream());
        console.log('[assistant] Stream setup complete');
      },
      onFinish: async ({ messages: responseMessages }) => {
        console.log('[assistant] 🏁 Stream finished, saving assistant messages');
        console.log('[assistant] Response messages count:', responseMessages.length);
        
        // ✅ Save assistant messages to database
        await Promise.all(
          responseMessages.map((msg: any) => {
            console.log('[assistant] Saving message:', {
              role: msg.role,
              partsCount: msg.parts?.length,
            });
            return saveMessage(chatId, msg.role, msg.parts);
          })
        );
        
        console.log('[assistant] ✅ All assistant messages saved to database');
      },
    });

    // ✅ Return SSE stream (matching reference implementation)
    console.log('[assistant] 📡 Returning SSE stream to client');
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    
  } catch (error: any) {
    console.error('[assistant] ❌ ERROR:', error);
    console.error('[assistant] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
