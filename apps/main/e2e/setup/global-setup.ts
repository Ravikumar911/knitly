import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up Playwright tests...');
  
  // Create a browser instance for any pre-test setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Wait for the dev server to be ready
  try {
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    console.log('✅ Dev server is ready');
  } catch (error) {
    console.error('❌ Dev server is not ready:', error);
    throw error;
  }

  await browser.close();
  console.log('🎭 Playwright setup complete');
}

export default globalSetup;