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
    path: `e2e/screenshots/${name}.png`,
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
export async function expectPageTitle(page: Page, titlePattern: string | RegExp) {
  if (typeof titlePattern === 'string') {
    await expect(page).toHaveTitle(new RegExp(titlePattern));
  } else {
    await expect(page).toHaveTitle(titlePattern);
  }
}

/**
 * Check if element exists and is visible
 */
export async function expectElementVisible(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  return element;
}

/**
 * Fill form field and verify
 */
export async function fillFormField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await expect(field).toBeVisible();
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

/**
 * Click button and wait for navigation
 */
export async function clickAndWaitForNavigation(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector)
  ]);
}