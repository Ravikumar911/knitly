import { test, expect } from '@playwright/test';
import { createTestHelpers, SELECTORS } from '../utils/test-helpers';
import { createAuthMock, createMockUser } from '../mocks/auth';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    const authMock = createAuthMock(page);
    await authMock.clearAuthState();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Navigate to protected route
    await helpers.navigateTo('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should show login form
    await helpers.waitForElement(SELECTORS.GOOGLE_LOGIN_BUTTON);
    await expect(page.getByText('Welcome to Slash')).toBeVisible();
  });

  test('should successfully login with Google OAuth', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup OAuth mock
    const mockUser = createMockUser();
    const session = await authMock.mockGoogleOAuth(mockUser);
    
    // Navigate to login page
    await helpers.navigateTo('/login');
    
    // Click Google login button
    await helpers.clickAndWait(SELECTORS.GOOGLE_LOGIN_BUTTON, {
      waitForNavigation: true,
    });
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/dashboard');
    
    // Should show user info in sidebar
    await expect(page.getByText(mockUser.name)).toBeVisible();
    await expect(page.getByText(mockUser.email)).toBeVisible();
  });

  test('should handle OAuth authentication errors', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup OAuth failure mock
    await authMock.mockAuthFailure('OAuth permission denied');
    
    // Navigate to login page
    await helpers.navigateTo('/login');
    
    // Click Google login button
    await helpers.clickAndWait(SELECTORS.GOOGLE_LOGIN_BUTTON);
    
    // Should show error message
    await helpers.waitForText('Failed to sign in with Google');
    
    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should maintain session across page reloads', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup authenticated session
    const mockUser = createMockUser();
    const session = await authMock.mockSuccessfulLogin(mockUser);
    await authMock.setAuthenticatedSession(session);
    
    // Navigate to dashboard
    await helpers.navigateTo('/dashboard');
    
    // Verify user is authenticated
    await expect(page.getByText(mockUser.name)).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(mockUser.name)).toBeVisible();
  });

  test('should successfully logout', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup authenticated session
    const mockUser = createMockUser();
    const session = await authMock.mockSuccessfulLogin(mockUser);
    await authMock.setAuthenticatedSession(session);
    await authMock.mockLogout();
    
    // Navigate to dashboard
    await helpers.navigateTo('/dashboard');
    
    // Open user menu (might be in sidebar or header)
    const userMenu = page.getByText(mockUser.name);
    await userMenu.click();
    
    // Click logout
    await helpers.clickAndWait(SELECTORS.LOGOUT_BUTTON, {
      waitForNavigation: true,
    });
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should show login form
    await helpers.waitForElement(SELECTORS.GOOGLE_LOGIN_BUTTON);
  });

  test('should handle expired session', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup authenticated session
    const mockUser = createMockUser();
    const session = await authMock.mockSuccessfulLogin(mockUser);
    await authMock.setAuthenticatedSession(session);
    
    // Navigate to dashboard first
    await helpers.navigateTo('/dashboard');
    await expect(page.getByText(mockUser.name)).toBeVisible();
    
    // Mock session expiry
    await authMock.mockSessionExpiry();
    
    // Try to navigate to protected route
    await helpers.navigateTo('/dashboard/transactions');
    
    // Should redirect to login due to expired session
    await expect(page).toHaveURL(/\/login/);
  });

  test('should protect routes that require authentication', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/transactions',
      '/settings',
    ];
    
    for (const route of protectedRoutes) {
      await helpers.navigateTo(route);
      
      // Should redirect to login for each protected route
      await expect(page).toHaveURL(/\/login/);
    }
  });
});