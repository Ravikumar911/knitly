import { Page, expect } from '@playwright/test';

/**
 * Wait for the page to load completely
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Take a screenshot with a meaningful name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}.png`,
    fullPage: true 
  });
}

/**
 * Check if we're on the expected page by URL pattern
 */
export async function expectPageUrl(page: Page, urlPattern: string | RegExp) {
  if (typeof urlPattern === 'string') {
    await expect(page).toHaveURL(new RegExp(urlPattern));
  } else {
    await expect(page).toHaveURL(urlPattern);
  }
}

/**
 * Check if page has the expected title
 */
export async function expectPageTitle(page: Page, title: string | RegExp) {
  await expect(page).toHaveTitle(title);
}

/**
 * Check if an element is visible on the page
 */
export async function expectElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Test responsive behavior across different viewport sizes
 */
export async function testResponsive(page: Page, testFn: (page: Page) => Promise<void>) {
  const viewports = [
    { width: 1920, height: 1080, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await testFn(page);
    await takeScreenshot(page, `responsive-${viewport.name}`);
  }
}