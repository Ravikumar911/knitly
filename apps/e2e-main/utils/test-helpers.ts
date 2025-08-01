import { Page, expect, Locator } from '@playwright/test';

/**
 * Common test utilities for Playwright e2e tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a page and wait for it to load
   */
  async navigateTo(path: string, waitForSelector?: string): Promise<void> {
    await this.page.goto(path);
    
    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector);
    }
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for element to be visible and enabled
   */
  async waitForElement(selector: string, options?: { timeout?: number }): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: options?.timeout });
    return element;
  }

  /**
   * Fill input field and verify the value
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = await this.waitForElement(selector);
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }

  /**
   * Click button and wait for navigation or response
   */
  async clickAndWait(
    selector: string,
    options?: {
      waitForNavigation?: boolean;
      waitForResponse?: string | RegExp;
      timeout?: number;
    }
  ): Promise<void> {
    const element = await this.waitForElement(selector);
    
    if (options?.waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({ timeout: options?.timeout }),
        element.click(),
      ]);
    } else if (options?.waitForResponse) {
      await Promise.all([
        this.page.waitForResponse(options.waitForResponse, { timeout: options?.timeout }),
        element.click(),
      ]);
    } else {
      await element.click();
    }
  }

  /**
   * Wait for specific text to appear on page
   */
  async waitForText(text: string, options?: { timeout?: number; exact?: boolean }): Promise<void> {
    const locator = options?.exact 
      ? this.page.getByText(text, { exact: true })
      : this.page.getByText(text);
    
    await locator.waitFor({ state: 'visible', timeout: options?.timeout });
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoading(loadingSelector = '[data-testid="loading"]'): Promise<void> {
    // Wait for loading to appear (optional)
    try {
      await this.page.waitForSelector(loadingSelector, { timeout: 1000 });
    } catch {
      // Loading might not appear if response is fast
    }

    // Wait for loading to disappear
    await this.page.waitForSelector(loadingSelector, { state: 'detached', timeout: 30000 });
  }

  /**
   * Take screenshot with automatic naming
   */
  async takeScreenshot(name?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotName = name ? `${name}-${timestamp}` : `screenshot-${timestamp}`;
    
    await this.page.screenshot({
      path: `test-results/${screenshotName}.png`,
      fullPage: true,
    });
  }

  /**
   * Mock API responses for testing
   */
  async mockApiResponse(pattern: string | RegExp, response: any): Promise<void> {
    await this.page.route(pattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock API error responses
   */
  async mockApiError(pattern: string | RegExp, status: number = 500, message: string = 'Internal Server Error'): Promise<void> {
    await this.page.route(pattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message }),
      });
    });
  }

  /**
   * Wait for console log with specific text
   */
  async waitForConsoleLog(text: string, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Console log "${text}" not found within ${timeout}ms`));
      }, timeout);

      const handleConsole = (msg: any) => {
        if (msg.text().includes(text)) {
          clearTimeout(timer);
          this.page.off('console', handleConsole);
          resolve();
        }
      };

      this.page.on('console', handleConsole);
    });
  }

  /**
   * Clear all local storage and cookies
   */
  async clearBrowserState(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await this.page.context().clearCookies();
  }

  /**
   * Set viewport for responsive testing
   */
  async setViewport(preset: 'mobile' | 'tablet' | 'desktop'): Promise<void> {
    const viewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1920, height: 1080 },
    };

    await this.page.setViewportSize(viewports[preset]);
  }

  /**
   * Wait for element count to match expected value
   */
  async waitForElementCount(selector: string, expectedCount: number, timeout: number = 5000): Promise<void> {
    await expect(this.page.locator(selector)).toHaveCount(expectedCount, { timeout });
  }

  /**
   * Verify table data matches expected values
   */
  async verifyTableData(tableSelector: string, expectedData: string[][]): Promise<void> {
    const table = this.page.locator(tableSelector);
    await table.waitFor({ state: 'visible' });

    for (let rowIndex = 0; rowIndex < expectedData.length; rowIndex++) {
      const row = expectedData[rowIndex];
      
      if (!row) continue;
      
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const expectedText = row[cellIndex];
        
        if (expectedText) {
          const cell = table.locator('tbody tr').nth(rowIndex).locator('td').nth(cellIndex);
          await expect(cell).toContainText(expectedText);
        }
      }
    }
  }
}

/**
 * Create test helpers instance
 */
export function createTestHelpers(page: Page): TestHelpers {
  return new TestHelpers(page);
}

/**
 * Common selectors used across tests
 */
export const SELECTORS = {
  // Auth
  LOGIN_BUTTON: '[data-testid="login-button"]',
  GOOGLE_LOGIN_BUTTON: '[data-testid="google-login-button"]',
  LOGOUT_BUTTON: '[data-testid="logout-button"]',
  
  // Navigation
  SIDEBAR_TRIGGER: '[data-testid="sidebar-trigger"]',
  DASHBOARD_LINK: 'a[href="/dashboard"]',
  TRANSACTIONS_LINK: 'a[href="/dashboard/transactions"]',
  SETTINGS_LINK: 'a[href="/settings"]',
  
  // Dashboard
  SYNC_BUTTON: '[data-testid="sync-button"]',
  SYNC_PROGRESS: '[data-testid="sync-progress"]',
  ANALYTICS_CARDS: '[data-testid="analytics-card"]',
  
  // Transactions
  TRANSACTION_TABLE: '[data-testid="transaction-table"]',
  TRANSACTION_ROW: '[data-testid="transaction-row"]',
  SORT_BY_DATE: '[data-testid="sort-date"]',
  FILTER_DROPDOWN: '[data-testid="filter-dropdown"]',
  
  // Common
  LOADING_SPINNER: '[data-testid="loading"]',
  ERROR_MESSAGE: '[data-testid="error-message"]',
  SUCCESS_MESSAGE: '[data-testid="success-message"]',
  MODAL: '[data-testid="modal"]',
  MODAL_CLOSE: '[data-testid="modal-close"]',
} as const;