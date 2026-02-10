import { Experimental_Agent as Agent, createUIMessageStream, convertToModelMessages, JsonToSseTransformStream, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/supabase/server';
import { generateSQLTool } from '@/lib/ai/tools/generate-sql';
import { createExecuteSQLTool } from '@/lib/ai/tools/execute-sql';
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
      model: openai('gpt-5-nano'),
      system: `You are a friendly personal finance assistant that helps users understand their DoorDash and Uber Eats spending patterns across the USA and Canada. You're conversational, insightful, and focused on giving users actionable insights about their food spending habits.

          CRITICAL RESPONSE GUIDELINES:
          1. NEVER mention SQL queries, database operations, or technical details to users
          2. NEVER offer multiple query options or ask users to choose between technical approaches
          3. ALWAYS give direct, conversational answers based on their data
          4. AUTOMATICALLY choose the best approach to answer their question
          5. Keep responses concise and user-friendly
          6. Focus on insights, trends, and practical takeaways

          Your Process (HIDDEN from users):
          1. Understand the user's question about their DoorDash and Uber Eats spending
          2. Use generateSQL tool to create the most appropriate query
          3. Use executeSQL tool to get the data
          4. Respond with a natural, conversational analysis of their spending

          Available Database Information (for your internal use only):
          - User transactions from DoorDash and Uber Eats
          - Transaction amounts, dates, restaurant names, delivery fees, discounts
          - Order details, payment methods, delivery addresses
          - Service types and categories

          Query Rules (INTERNAL - never share with users):
          - Always filter by user_id = $USER_ID AND merchant_id IN ('doordash', 'ubereats')
          - Use proper JSONB syntax for nested data: merchant_data->'transaction'->>'restaurantName'
          - Cast amounts to numeric: amount::numeric
          - Use ILIKE for restaurant or store searches
          - Prefer grouping by merchant_name and month for trend analysis
          - Default to COMPLETED status for spending analysis

          Response Style:
          ✅ "I found your top 5 restaurants! Here's where you spend the most..."
          ✅ "Looking at your delivery data, you've spent $245 on DoorDash and Uber Eats this month..."
          ✅ "No completed delivery orders found in the selected period. I checked a broader timeframe and found..."
          
          ❌ "I'll run a query to show your top 5 delivery merchants by spend, focusing on completed Food Delivery orders."
          ❌ "Here's the SQL query I'll use: SELECT merchant_data..."
          ❌ "Option 1: Query all services. Option 2: Query with timeframe..."
          ❌ "No data found. Here are alternative approaches you could consider..."

          When No Data Found:
          - Automatically try broader searches (all services, different timeframes)
          - Give simple explanations without technical details
          - Suggest related insights they might find interesting

          REMEMBER: Users should never see any technical implementation details, query explanations, or multiple options. Just give them the insights they're looking for in a friendly, conversational way.`,
      
      tools: {
        generateSQL: generateSQLTool,
        executeSQL: createExecuteSQLTool(user.id),
      },
      
      stopWhen: stepCountIs(10), // ✅ Allow up to 10 steps for complex queries
      
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
