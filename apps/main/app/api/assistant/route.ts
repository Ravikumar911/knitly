import { Experimental_Agent as Agent, createUIMessageStream, convertToModelMessages, JsonToSseTransformStream, stepCountIs } from 'ai';
import { chatModel } from '@/lib/ai/provider';
import { getChatById, createChat, saveMessage, LOCAL_USER_ID } from '@workspace/database';
import { swiggyAnalyticsTools } from '@/lib/ai/tools/swiggy-analytics';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log('[assistant] === REQUEST RECEIVED ===');
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

    console.log('[assistant] Fetching chat:', chatId);
    let chatWithMessages = await getChatById(chatId, LOCAL_USER_ID);
    
    if (!chatWithMessages) {
      console.log('[assistant] Chat not found, creating new chat');
      const firstMessageText = message.parts.find((p: any) => p.type === 'text')?.text || 'New Chat';
      const title = firstMessageText.slice(0, 50) + (firstMessageText.length > 50 ? '...' : '');
      
      console.log('[assistant] Creating chat with title:', title);
      await createChat(LOCAL_USER_ID, title, chatId);
      chatWithMessages = await getChatById(chatId, LOCAL_USER_ID);
      console.log('[assistant] ✅ Chat created successfully');
    } else {
      console.log('[assistant] ✅ Chat found with', chatWithMessages.messages?.length || 0, 'existing messages');
    }
    
    const existingMessages = chatWithMessages?.messages || [];
    
    console.log('[assistant] Saving user message to database');
    await saveMessage(chatId, message.role, message.parts);
    console.log('[assistant] ✅ User message saved');
    
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

    console.log('[assistant] Creating local assistant agent');
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
        console.log('[assistant] ✅ Step finished:', {
          stepNumber: options.stepNumber,
          toolCalls: options.toolCalls?.map((tc: any) => tc.toolName),
          toolResults: options.toolResults?.map((tr: any) => tr.toolName),
          finishReason: options.finishReason,
          hasText: !!options.text,
        });
      },
    });

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
