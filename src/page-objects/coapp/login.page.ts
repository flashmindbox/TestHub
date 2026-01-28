import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly tenantInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    this.tenantInput = page.getByRole('textbox', { name: 'Institute ID' });
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.registerLink = page.getByRole('link', { name: 'Register' });
  }

  async goto() {
    await this.page.goto('/login');
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async login(email: string, password: string, tenantSlug?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (tenantSlug) {
      await this.tenantInput.fill(tenantSlug);
    }
    await this.submitButton.click();
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  async loginExpectError(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for error toast
    await expect(this.page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
  }

  async goToRegister() {
    await this.registerLink.click();
    await this.page.waitForURL('**/register');
  }
}
