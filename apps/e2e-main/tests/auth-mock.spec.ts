import { test, expect } from '@playwright/test';
import { createAuthMock, createMockUser, createMockSession } from '../mocks/auth';

test.describe('Authentication Mock Infrastructure', () => {
  test('should create mock user with correct properties', async ({ page }) => {
    const mockUser = createMockUser();
    
    expect(mockUser.id).toBe('test-user-123');
    expect(mockUser.email).toBe('test@example.com');
    expect(mockUser.name).toBe('Test User');
    expect(mockUser.avatar_url).toBe('https://example.com/avatar.png');
    expect(mockUser.user_metadata).toHaveProperty('name');
  });

  test('should create mock session with valid tokens', async ({ page }) => {
    const mockUser = createMockUser();
    const session = createMockSession(mockUser);
    
    expect(session.user).toEqual(mockUser);
    expect(session.access_token).toBeTruthy();
    expect(session.refresh_token).toBe('test-refresh-token');
    expect(session.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(session.provider_token).toBe('test-provider-token');
  });

  test('should mock authentication API responses', async ({ page }) => {
    const authMock = createAuthMock(page);
    const mockUser = createMockUser();
    
    // Setup auth mock
    await authMock.mockSuccessfulLogin(mockUser);
    
    // Test auth endpoint mocking
    const response = await page.request.get('http://localhost:54321/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    expect(response.status()).toBe(200);
    const userData = await response.json();
    expect(userData.id).toBe(mockUser.id);
    expect(userData.email).toBe(mockUser.email);
  });

  test('should mock OAuth flow responses', async ({ page }) => {
    const authMock = createAuthMock(page);
    const mockUser = createMockUser();
    
    // Setup OAuth mock
    await authMock.mockGoogleOAuth(mockUser);
    
    // Test OAuth authorization endpoint
    const response = await page.request.get('http://localhost:54321/auth/v1/authorize?provider=google');
    
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain('code=test-oauth-code');
  });

  test('should mock authentication failures', async ({ page }) => {
    const authMock = createAuthMock(page);
    
    // Setup auth failure mock
    await authMock.mockAuthFailure('Invalid credentials');
    
    // Test failed auth endpoint
    const response = await page.request.get('http://localhost:54321/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    expect(response.status()).toBe(401);
    const errorData = await response.json();
    expect(errorData.error).toBe('unauthorized');
    expect(errorData.error_description).toBe('Invalid credentials');
  });

  test('should set and clear browser authentication state', async ({ page }) => {
    const authMock = createAuthMock(page);
    const session = createMockSession();
    
    // Set authentication state
    await authMock.setAuthenticatedSession(session);
    
    // Verify localStorage has session data
    const storedSession = await page.evaluate(() => {
      return localStorage.getItem('sb-test-auth-token');
    });
    
    expect(storedSession).toBeTruthy();
    const parsedSession = JSON.parse(storedSession!);
    expect(parsedSession.access_token).toBe(session.access_token);
    
    // Clear authentication state
    await authMock.clearAuthState();
    
    // Verify localStorage is cleared
    const clearedSession = await page.evaluate(() => {
      return localStorage.getItem('sb-test-auth-token');
    });
    
    expect(clearedSession).toBeNull();
  });
});