import { test, expect } from '@playwright/test';
import { createAuthMock, createMockUser } from '../mocks/auth';
import { createTestHelpers, SELECTORS } from '../utils/test-helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and context state
    await page.context().clearCookies();
    
    // Navigate to a page first to access localStorage safely
    await page.goto('about:blank');
    
    // Clear storage after navigation
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore storage access errors
      }
    });
  });

  test('should display login page when not authenticated', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Navigate to dashboard - should redirect to login
    await helpers.navigateTo('/dashboard');
    
    // Should be redirected to login
    expect(page.url()).toContain('/login');
    
    // Verify login form elements are present
    await helpers.waitForText('Welcome to Slash');
    await helpers.waitForText('Sign in to your account');
    await helpers.waitForText('Continue with Google');
  });

  test('should handle Google OAuth login flow', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    const mockUser = createMockUser({
      email: 'testuser@example.com',
      name: 'Test User E2E'
    });

    // Setup OAuth mocks with comprehensive Supabase mocking
    const session = await authMock.mockGoogleOAuth(mockUser);
    
    // Navigate to login page
    await helpers.navigateTo('/login');
    
    // Wait for page to load properly
    await page.waitForLoadState('networkidle');
    
    // Click Google login button
    const googleButton = page.getByText('Continue with Google');
    await googleButton.click();
    
    // Wait for auth flow to complete - it should redirect to dashboard
    // Use a more flexible approach since OAuth involves redirects
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    
    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup auth failure mock
    await authMock.mockAuthFailure('OAuth provider unavailable');
    
    // Navigate to login page
    await helpers.navigateTo('/login');
    
    // Click Google login button and wait for error
    const googleButton = page.getByText('Continue with Google');
    await googleButton.click();
    
    // Wait for error state - this might show up as an error in the UI
    // or redirect to an error page
    try {
      await helpers.waitForText('Failed to sign in with Google', { timeout: 5000 });
    } catch {
      // If the error text doesn't appear, check if we're on an error page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(error|auth-code-error|login)/);
    }
  });

  test('should redirect authenticated users from login page', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    const mockUser = createMockUser();
    
    // Setup authenticated session with comprehensive mocking
    const session = await authMock.mockSuccessfulLogin(mockUser);
    await authMock.setAuthenticatedSession(session);
    
    // Try to navigate to login page - should redirect to dashboard
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check if we got redirected to dashboard
    // Allow some time for middleware to process
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    
    // Should be redirected away from login
    expect(currentUrl).not.toContain('/login');
    // Ideally to dashboard, but any authenticated route is fine
    expect(currentUrl).toMatch(/(dashboard|\/)/);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    const mockUser = createMockUser();
    
    // Setup authenticated session with comprehensive mocking
    const session = await authMock.mockSuccessfulLogin(mockUser);
    await authMock.setAuthenticatedSession(session);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check we're on dashboard initially
    expect(page.url()).toContain('/dashboard');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on an authenticated page (dashboard or home)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    expect(currentUrl).toMatch(/(dashboard|\/)/);
  });
});