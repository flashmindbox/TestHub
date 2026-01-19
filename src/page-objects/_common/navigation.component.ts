import { Page, Locator } from '@playwright/test';

export class NavigationComponent {
  readonly page: Page;

  // Common navigation elements
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header, [data-testid="header"], nav').first();
    this.sidebar = page.locator('aside, [data-testid="sidebar"], [role="navigation"]').first();
    this.userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]').first();
    this.logo = page.locator('[data-testid="logo"], .logo, header a[href="/"]').first();
  }

  /**
   * Navigate using sidebar or nav link
   */
  async navigateTo(linkText: string) {
    const link = this.page.locator(`a:has-text("${linkText}"), [role="link"]:has-text("${linkText}")`).first();
    await link.click();
  }

  /**
   * Open user dropdown menu
   */
  async openUserMenu() {
    await this.userMenu.click();
  }

  /**
   * Check if navigation item is active
   */
  async isNavItemActive(linkText: string): Promise<boolean> {
    const link = this.page.locator(`a:has-text("${linkText}")`).first();
    const classList = await link.getAttribute('class') || '';
    return classList.includes('active') || (await link.getAttribute('aria-current')) === 'page';
  }

  /**
   * Get breadcrumb items
   */
  async getBreadcrumbs(): Promise<string[]> {
    const breadcrumbs = this.page.locator('[aria-label="Breadcrumb"] a, .breadcrumb a');
    const texts = await breadcrumbs.allTextContents();
    return texts.map(t => t.trim());
  }
}
