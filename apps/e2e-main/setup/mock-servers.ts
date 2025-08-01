import express from 'express';
import cors from 'cors';
import { Server } from 'http';

interface MockServers {
  triggerServer: Server | null;
  gmailMockServer: Server | null;
  openaiMockServer: Server | null;
}

const mockServers: MockServers = {
  triggerServer: null,
  gmailMockServer: null,
  openaiMockServer: null,
};

export async function startMockServers(): Promise<void> {
  await Promise.all([
    startTriggerMockServer(),
    startGmailMockServer(),
    startOpenAIMockServer(),
  ]);
}

export async function stopMockServers(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (mockServers.triggerServer) {
    promises.push(new Promise(resolve => {
      mockServers.triggerServer!.close(() => resolve());
    }));
  }

  if (mockServers.gmailMockServer) {
    promises.push(new Promise(resolve => {
      mockServers.gmailMockServer!.close(() => resolve());
    }));
  }

  if (mockServers.openaiMockServer) {
    promises.push(new Promise(resolve => {
      mockServers.openaiMockServer!.close(() => resolve());
    }));
  }

  await Promise.all(promises);
}

// Trigger.dev Mock Server
function startTriggerMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'trigger-mock' });
    });

    // Mock task trigger endpoint
    app.post('/api/v3/runs', (req, res) => {
      const { task, payload } = req.body;
      
      console.log('🔧 Mock trigger task:', task, payload);
      
      // Simulate successful task trigger
      res.json({
        id: `run_${Date.now()}`,
        status: 'EXECUTING',
        taskIdentifier: task,
        createdAt: new Date().toISOString(),
      });
    });

    // Mock task status endpoint
    app.get('/api/v3/runs/:runId', (req, res) => {
      const { runId } = req.params;
      
      // Simulate completed task
      res.json({
        id: runId,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        output: {
          success: true,
          processedCount: 10,
          skippedCount: 2,
          errorCount: 0,
        },
      });
    });

    // Mock batch endpoint
    app.post('/api/v3/batches', (req, res) => {
      const { items } = req.body;
      
      res.json({
        id: `batch_${Date.now()}`,
        runs: items.map((item: any, index: number) => ({
          id: `run_${Date.now()}_${index}`,
          ok: true,
          output: {
            processedCount: 5,
            skippedCount: 1,
            errorCount: 0,
          },
        })),
      });
    });

    mockServers.triggerServer = app.listen(3001, () => {
      console.log('🔧 Trigger.dev mock server running on port 3001');
      resolve();
    });

    mockServers.triggerServer.on('error', reject);
  });
}

// Gmail API Mock Server
function startGmailMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'gmail-mock' });
    });

    // Mock Gmail message list
    app.get('/gmail/v1/users/:userId/messages', (req, res) => {
      const { q, maxResults = 10 } = req.query;
      
      // Generate mock email IDs
      const messages = Array.from({ length: Number(maxResults) }, (_, i) => ({
        id: `msg_${Date.now()}_${i}`,
        threadId: `thread_${Date.now()}_${i}`,
      }));

      res.json({
        messages,
        nextPageToken: 'next_page_token',
        resultSizeEstimate: messages.length,
      });
    });

    // Mock Gmail message details
    app.get('/gmail/v1/users/:userId/messages/:messageId', (req, res) => {
      const { messageId } = req.params;
      
      res.json({
        id: messageId,
        threadId: `thread_${messageId}`,
        snippet: 'Your Swiggy order has been delivered...',
        payload: {
          headers: [
            { name: 'From', value: 'orders@swiggy.in' },
            { name: 'Subject', value: 'Your Swiggy order #12345 delivered' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          body: {
            data: Buffer.from('Order delivered successfully! Total: ₹299').toString('base64'),
          },
          parts: [],
        },
        internalDate: Date.now().toString(),
      });
    });

    mockServers.gmailMockServer = app.listen(3002, () => {
      console.log('📧 Gmail API mock server running on port 3002');
      resolve();
    });

    mockServers.gmailMockServer.on('error', reject);
  });
}

// OpenAI API Mock Server
function startOpenAIMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'openai-mock' });
    });

    // Mock OpenAI chat completions
    app.post('/v1/chat/completions', (req, res) => {
      const { messages } = req.body;
      
      // Simulate AI response for transaction extraction
      const mockResponse = {
        parseSuccess: true,
        amount: 299,
        currency: 'INR',
        type: 'DEBIT',
        description: 'Swiggy food order',
        merchantName: 'Swiggy',
        transactionDate: new Date().toISOString(),
        category: 'FOOD_DELIVERY',
        referenceIds: {
          orderId: '12345',
        },
      };

      res.json({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(mockResponse),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });
    });

    mockServers.openaiMockServer = app.listen(3003, () => {
      console.log('🤖 OpenAI API mock server running on port 3003');
      resolve();
    });

    mockServers.openaiMockServer.on('error', reject);
  });
}

// Export for CLI usage
if (typeof require !== 'undefined' && require.main === module) {
  startMockServers().catch(console.error);
}