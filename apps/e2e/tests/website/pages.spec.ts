import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  takeScreenshot, 
  expectElementVisible,
  testResponsive
} from '../utils/test-helpers';

test.describe('Website - Marketing Pages', () => {
  test('should display homepage correctly @website', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await waitForPageLoad(page);

    // Check that the page loads
    await expect(page).toHaveURL('/');
    
    // Check for main content
    await expectElementVisible(page, 'main');
    
    // Take a screenshot for visual verification
    await takeScreenshot(page, 'website-homepage');
  });

  test('should display privacy page @website', async ({ page }) => {
    // Navigate to privacy page
    await page.goto('/privacy');
    await waitForPageLoad(page);
    
    // Check that the page loads
    await expect(page).toHaveURL(/.*privacy/);
    
    // Check for main content
    await expectElementVisible(page, 'main');
    
    await takeScreenshot(page, 'website-privacy-page');
  });

  test('should display terms page @website', async ({ page }) => {
    // Navigate to terms page
    await page.goto('/terms');
    await waitForPageLoad(page);
    
    // Check that the page loads
    await expect(page).toHaveURL(/.*terms/);
    
    // Check for main content
    await expectElementVisible(page, 'main');
    
    await takeScreenshot(page, 'website-terms-page');
  });

  test('should be responsive on different viewports @website', async ({ page }) => {
    await testResponsive(page, async (page) => {
      await page.goto('/');
      await waitForPageLoad(page);
      await expectElementVisible(page, 'main');
    });
  });
});