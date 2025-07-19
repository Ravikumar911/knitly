import { Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

/**
 * Authentication mock utilities for e2e tests
 */

export interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  user_metadata?: Record<string, any>;
}

export interface MockSession {
  user: MockUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  provider_token?: string;
  provider_refresh_token?: string;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: process.env.TEST_USER_ID || 'test-user-123',
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    name: process.env.TEST_USER_NAME || 'Test User',
    avatar_url: 'https://example.com/avatar.png',
    user_metadata: {
      name: process.env.TEST_USER_NAME || 'Test User',
      avatar_url: 'https://example.com/avatar.png',
    },
    ...overrides,
  };
}

/**
 * Create a mock JWT token
 */
export function createMockJWT(user: MockUser, expiresIn: string = '1h'): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      aud: 'authenticated',
      role: 'authenticated',
    },
    'test-secret',
    { expiresIn }
  );
}

/**
 * Create a mock session
 */
export function createMockSession(user?: MockUser): MockSession {
  const mockUser = user || createMockUser();
  const accessToken = createMockJWT(mockUser);
  
  return {
    user: mockUser,
    access_token: accessToken,
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    provider_token: 'test-provider-token',
    provider_refresh_token: 'test-provider-refresh-token',
  };
}

/**
 * Mock Supabase authentication responses
 */
export class AuthMock {
  constructor(private page: Page) {}

  /**
   * Mock successful login flow
   */
  async mockSuccessfulLogin(user?: MockUser): Promise<MockSession> {
    const session = createMockSession(user);

    // Mock Supabase auth endpoints
    await this.page.route('**/auth/v1/token**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: 3600,
          token_type: 'bearer',
          user: session.user,
        }),
      });
    });

    // Mock user endpoint
    await this.page.route('**/auth/v1/user**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session.user),
      });
    });

    // Mock session endpoint
    await this.page.route('**/auth/v1/session**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user,
        }),
      });
    });

    return session;
  }

  /**
   * Mock OAuth flow for Google sign-in
   */
  async mockGoogleOAuth(user?: MockUser): Promise<MockSession> {
    const session = createMockSession(user);

    // Mock OAuth URL generation
    await this.page.route('**/auth/v1/authorize**', route => {
      const url = new URL(route.request().url());
      const redirectTo = url.searchParams.get('redirect_to') || '/';
      
      // Simulate OAuth redirect with code
      route.fulfill({
        status: 302,
        headers: {
          'Location': `${redirectTo}?code=test-oauth-code`,
        },
      });
    });

    // Mock code exchange
    await this.page.route('**/auth/v1/token**', route => {
      const body = route.request().postData();
      
      if (body?.includes('authorization_code')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: 3600,
            token_type: 'bearer',
            user: session.user,
            provider_token: session.provider_token,
            provider_refresh_token: session.provider_refresh_token,
          }),
        });
      } else {
        route.continue();
      }
    });

    return session;
  }

  /**
   * Mock authentication failure
   */
  async mockAuthFailure(errorMessage: string = 'Authentication failed'): Promise<void> {
    await this.page.route('**/auth/v1/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'unauthorized',
          error_description: errorMessage,
        }),
      });
    });
  }

  /**
   * Mock session expiry
   */
  async mockSessionExpiry(): Promise<void> {
    await this.page.route('**/auth/v1/user**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_token',
          error_description: 'The access token is expired',
        }),
      });
    });
  }

  /**
   * Mock successful logout
   */
  async mockLogout(): Promise<void> {
    await this.page.route('**/auth/v1/logout**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  }

  /**
   * Set authenticated session in browser storage
   */
  async setAuthenticatedSession(session: MockSession): Promise<void> {
    await this.page.addInitScript((sessionData) => {
      // Mock Supabase session in localStorage
      const supabaseSession = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        user: sessionData.user,
      };

      localStorage.setItem(
        'sb-test-auth-token',
        JSON.stringify(supabaseSession)
      );

      // Set cookies for SSR
      document.cookie = `sb-access-token=${sessionData.access_token}; path=/`;
      document.cookie = `sb-refresh-token=${sessionData.refresh_token}; path=/`;
    }, session);
  }

  /**
   * Clear authentication state
   */
  async clearAuthState(): Promise<void> {
    await this.page.addInitScript(() => {
      localStorage.removeItem('sb-test-auth-token');
      document.cookie = 'sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'sb-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
  }
}

/**
 * Create authentication mock instance
 */
export function createAuthMock(page: Page): AuthMock {
  return new AuthMock(page);
}