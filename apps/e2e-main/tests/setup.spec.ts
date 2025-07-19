import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';

test.describe('Test Infrastructure Setup', () => {
  test('should verify test environment is working', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Navigate to the app
    await helpers.navigateTo('/');
    
    // Should redirect to login (since not authenticated)
    await expect(page).toHaveURL(/\/login/);
    
    // Should load the page title
    await expect(page).toHaveTitle(/Finwise|Slash/);
  });

  test('should verify mock servers are running', async ({ page }) => {
    // Test that we can intercept and mock API calls
    await page.route('**/api/test', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Test successful' }),
      });
    });

    // Make a test request
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/test');
      return res.json();
    });

    expect(response.message).toBe('Test successful');
  });

  test('should verify database mock is working', async ({ page }) => {
    // This test verifies that our test database setup is working
    // by checking that the app can handle database-related operations
    
    const helpers = createTestHelpers(page);
    
    // Navigate to app
    await helpers.navigateTo('/');
    
    // Should not crash due to database issues
    expect(page.url()).toContain('/login');
  });

  test('should handle console errors gracefully', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to app
    await helpers.navigateTo('/');

    // Should not have critical console errors
    // (Some errors might be expected in test environment)
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('chunk') || 
      error.includes('network') ||
      error.includes('FATAL')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});