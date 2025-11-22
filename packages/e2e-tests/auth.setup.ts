import { test as setup, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const authFile = 'playwright/.auth/user.json';

/**
 * Global setup for authentication
 * This runs once before all tests to create an authenticated session
 * 
 * Uses Google OAuth authentication through the browser (matching the app's flow).
 * The test will:
 * 1. Navigate to the login page
 * 2. Click "Continue with Google"
 * 3. Pause for manual Google OAuth completion (handles 2FA, CAPTCHA, etc.)
 * 4. Wait for redirect back to the app
 * 5. Save the authenticated session state
 * 
 * Follows Playwright authentication best practices:
 * https://playwright.dev/docs/auth
 */
setup('authenticate', async ({ page, context }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  console.log('🚀 Starting manual auth setup...');
  console.log('1. Ensure your Next.js app is running on', baseURL);
  console.log('2. A browser will open shortly. Follow the prompts to log in manually.');
  console.log('3. If Google shows "browser not secure" error, try:');
  console.log('   - Click "Try again" button');
  console.log('   - Or manually navigate to Google sign-in in the same browser window');

  // Navigate to login page
  await page.goto(`${baseURL}/login`);

  // Wait for the login page to be ready - check for either the heading or the Google button
  // "Sign in to your account" is not a heading role, so we wait for the Google button instead
  const googleButton = page.getByRole('button', { name: /continue with google/i });
  await expect(googleButton).toBeVisible({ timeout: 60000 });

  console.log('✅ Navigated to login page. Browser is open.');
  
  // Start the OAuth flow
  await googleButton.click();
  console.log('✅ Clicked Google login. You will now be redirected to Google.');

  // Wait for navigation to Google OAuth page or handle error page
  try {
    await page.waitForURL(/accounts\.google\.com/, { timeout: 60000 });
  } catch (error) {
    // Check if we hit the "browser not secure" error
    const errorText = await page.textContent('body').catch(() => '');
    if (errorText?.includes("Couldn't sign you in") || errorText?.includes("browser or app may not be secure")) {
      console.log('\n⚠️  Google detected automated browser.');
      console.log('Please manually navigate to Google sign-in in the browser window.');
      console.log('You can copy the OAuth URL from the address bar or click "Try again".');
    }
    // Wait a bit more for manual navigation
    await page.waitForURL(/accounts\.google\.com/, { timeout: 60000 });
  }

  console.log('\n🔐 MANUAL STEP:');
  console.log('- On Google\'s page, enter your email/password manually.');
  console.log('- Handle any 2FA/CAPTCHA as you normally would.');
  console.log('- If you see "browser not secure", click "Try again" or manually navigate.');
  console.log('- The script will automatically detect when you\'re redirected back to the app...');

  // Wait for redirect back to the app after OAuth completes
  // The callback URL is: /auth/callback
  // After callback, app redirects to /dashboard or /
  // Listen for route changes automatically - no manual prompt needed
  console.log('⏳ Waiting for OAuth redirect back to the app...');
  await page.waitForURL(
    new RegExp(`${baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/auth/callback|/dashboard|/$)`), 
    { timeout: 120000 }
  );

  console.log('OAuth callback received. Waiting for redirect...');

  // Wait for the app to redirect to authenticated area
  // The middleware redirects authenticated users away from /auth/callback
  // Final destination should be /dashboard or /
  await page.waitForLoadState('networkidle');
  
  // Verify we're on an authenticated page (not callback or login)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/callback')) {
    // Still on callback, wait for redirect
    await page.waitForURL(
      new RegExp(`${baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/dashboard|/)$`), 
      { timeout: 60000 }
    );
  }

  // Verify we're authenticated by checking for authenticated UI elements
  await page.waitForLoadState('networkidle');
  
  // Verify we're on an authenticated route (dashboard or home) - not login or callback
  const finalUrl = page.url();
  const isAuthenticatedRoute = finalUrl.includes('/dashboard') || 
                                (finalUrl === baseURL || finalUrl === `${baseURL}/`);
  const isNotLoginOrCallback = !finalUrl.includes('/login') && !finalUrl.includes('/auth/callback');
  
  if (!isAuthenticatedRoute || !isNotLoginOrCallback) {
    throw new Error(
      `Expected to be on authenticated route after login, but got: ${finalUrl}. ` +
      'Make sure Google OAuth authentication completed successfully.'
    );
  }
  
  // Wait for SidebarTrigger which is always visible in authenticated layout
  // This is the most reliable indicator that we're in the authenticated layout
  const sidebarTrigger = page.locator('[data-sidebar="trigger"]');
  await expect(sidebarTrigger).toBeVisible({ timeout: 60000 });
  
  // Also check for Dashboard breadcrumb text which should be visible on dashboard route
  // This provides additional confirmation
  try {
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
  } catch {
    // Breadcrumb might not be visible if on home route, that's okay
    // SidebarTrigger being visible is sufficient
    console.log('ℹ️  Dashboard breadcrumb not found, but sidebar trigger is visible.');
  }

  console.log('✅ Detected logged-in state!');

  // Ensure auth directory exists
  const authDir = dirname(authFile);
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Save authentication state (includes cookies AND localStorage)
  // Following Playwright best practices: save state after confirming authentication
  // Note: Supabase stores auth tokens in localStorage, so we need to save both
  await context.storageState({ path: authFile });

  console.log(`\n🎉 Auth state saved to ${authFile}`);
  console.log('You can now run your tests with authenticated state.');
});
