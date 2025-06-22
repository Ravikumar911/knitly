import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  takeScreenshot, 
  expectPageTitle, 
  expectElementVisible 
} from './utils/test-helpers';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await waitForPageLoad(page);

    // Check that the page loads and displays expected content
    await expectPageTitle(page, 'Login - Finwise');
    
    // Check for main heading
    await expectElementVisible(page, 'h1');
    await expect(page.locator('h1')).toContainText('Welcome to Slash');
    
    // Check that login form is present
    await expectElementVisible(page, 'form');
    
    // Take a screenshot for visual verification
    await takeScreenshot(page, 'login-page');
  });

  test('should redirect to dashboard from home page', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Should be redirected to login page (if not authenticated) or dashboard
    // For now, we expect to be redirected away from home page
    await page.waitForURL(/\/(login|dashboard)/);
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('localhost:3000/');
    expect(currentUrl).toMatch(/\/(login|dashboard)/);
    
    await takeScreenshot(page, 'home-redirect');
  });

  test('should show register page', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register');
    await waitForPageLoad(page);
    
    // Check that the page loads
    await expect(page).toHaveURL(/.*register/);
    
    // Check that register form is present
    await expectElementVisible(page, 'form');
    
    await takeScreenshot(page, 'register-page');
  });
});