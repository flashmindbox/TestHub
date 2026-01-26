import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly tenantName: Locator;
  readonly loadingSpinner: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.tenantName = page.locator('[data-testid="tenant-name"]');
    this.loadingSpinner = page.locator('[data-testid="loading"]');
    this.toast = page.locator('[data-testid="toast"]');
  }

  async waitForLoad() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForLoad();
  }

  async expectToast(message: string) {
    await this.toast.filter({ hasText: message }).waitFor({ state: 'visible' });
  }

  async getTenantName(): Promise<string> {
    return this.tenantName.textContent() ?? '';
  }
}
