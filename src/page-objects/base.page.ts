import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = '') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Navigate to a path relative to baseUrl
   */
  async goto(path: string = '') {
    await this.page.goto(`${this.baseUrl}${path}`);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current URL path
   */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Check if currently on a specific path
   */
  async isOnPath(path: string): Promise<boolean> {
    return this.getCurrentPath() === path;
  }

  /**
   * Wait for URL to match a pattern
   */
  async waitForPath(path: string | RegExp, options?: { timeout?: number }) {
    await this.page.waitForURL(
      typeof path === 'string' ? `**${path}` : path,
      options
    );
  }

  /**
   * Get text content of an element
   */
  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fill input and verify value
   */
  async fillInput(locator: Locator, value: string) {
    await locator.clear();
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }

  /**
   * Click and wait for navigation
   */
  async clickAndWaitForNavigation(locator: Locator, urlPattern?: string | RegExp) {
    await Promise.all([
      urlPattern ? this.page.waitForURL(urlPattern) : this.page.waitForNavigation(),
      locator.click(),
    ]);
  }

  /**
   * Take a screenshot of the page
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `reports/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Get all console errors from the page
   */
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Assert no console errors
   */
  async expectNoConsoleErrors() {
    const errors = await this.getConsoleErrors();
    expect(errors).toHaveLength(0);
  }

  /**
   * Scroll to element
   */
  async scrollTo(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for toast/notification and get text
   */
  async waitForToast(type: 'success' | 'error' | 'info' = 'success'): Promise<string> {
    const toastSelector = `[data-testid="toast-${type}"], [role="alert"], .toast-${type}`;
    const toast = this.page.locator(toastSelector).first();
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    return await this.getText(toast);
  }
}
