import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should verify main app loads correctly', async ({ page }) => {
    // Navigate to the main app
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we can see some content (login page since not authenticated)
    await expect(page).toHaveTitle(/.*Finwise.*/);
    
    // Verify basic page structure loads
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

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

  test('should verify login page loads when not authenticated', async ({ page }) => {
    // Clear any existing auth state first
    await page.context().clearCookies();
    
    // Navigate to dashboard (should redirect to login)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login page
    expect(page.url()).toContain('/login');
    
    // Verify login elements are present
    await expect(page.getByText('Welcome to Slash')).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });
});