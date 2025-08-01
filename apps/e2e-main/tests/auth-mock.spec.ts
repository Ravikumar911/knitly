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
});