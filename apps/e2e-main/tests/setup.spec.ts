import { test, expect } from '@playwright/test';

test.describe('Test Infrastructure Setup', () => {
  test('should verify mock servers are accessible', async ({ page }) => {
    // Test Trigger.dev mock server
    const triggerResponse = await page.request.get('http://localhost:3001/health');
    expect(triggerResponse.status()).toBe(200);
    const triggerData = await triggerResponse.json();
    expect(triggerData.service).toBe('trigger-mock');

    // Test Gmail mock server
    const gmailResponse = await page.request.get('http://localhost:3002/health');
    expect(gmailResponse.status()).toBe(200);
    const gmailData = await gmailResponse.json();
    expect(gmailData.service).toBe('gmail-mock');

    // Test OpenAI mock server
    const openaiResponse = await page.request.get('http://localhost:3003/health');
    expect(openaiResponse.status()).toBe(200);
    const openaiData = await openaiResponse.json();
    expect(openaiData.service).toBe('openai-mock');
  });

  test('should verify trigger.dev mock API endpoints', async ({ page }) => {
    // Test task trigger endpoint
    const response = await page.request.post('http://localhost:3001/api/v3/runs', {
      data: {
        task: 'test-task',
        payload: { userId: 'test-user' }
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('EXECUTING');
    expect(data.taskIdentifier).toBe('test-task');
    expect(data.id).toMatch(/^run_\d+$/);
  });

  test('should verify gmail mock API endpoints', async ({ page }) => {
    // Test Gmail message list endpoint
    const response = await page.request.get('http://localhost:3002/gmail/v1/users/test/messages?maxResults=5');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.messages).toHaveLength(5);
    expect(data.messages[0]).toHaveProperty('id');
    expect(data.messages[0]).toHaveProperty('threadId');
  });

  test('should verify openai mock API endpoints', async ({ page }) => {
    // Test OpenAI chat completions endpoint
    const response = await page.request.post('http://localhost:3003/v1/chat/completions', {
      data: {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Extract transaction data' }]
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0].message.role).toBe('assistant');
    
    // Parse the response content as JSON
    const parsedContent = JSON.parse(data.choices[0].message.content);
    expect(parsedContent.parseSuccess).toBe(true);
    expect(parsedContent.amount).toBe(299);
    expect(parsedContent.merchantName).toBe('Swiggy');
  });
});