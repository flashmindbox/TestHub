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
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.tenantInput = page.getByLabel(/Institute ID/);
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.registerLink = page.getByRole('link', { name: 'Register' });
  }

  async goto() {
    await this.page.goto('/login');
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async login(email: string, password: string, tenantSlug?: string) {
    // Clear and fill email
    await this.emailInput.clear();
    await this.emailInput.fill(email);

    // Clear and fill password
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);

    // Fill tenant slug if provided (optional field)
    if (tenantSlug) {
      await this.tenantInput.clear();
      await this.tenantInput.fill(tenantSlug);
    }

    // Wait for button to be enabled and click
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();

    // Wait for either dashboard redirect or error toast
    await Promise.race([
      this.page.waitForURL('**/dashboard', { timeout: 20000 }),
      this.page.locator('[data-sonner-toast][data-type="error"]').waitFor({ state: 'visible', timeout: 20000 }),
    ]);

    // If we got an error toast, throw
    const errorToast = this.page.locator('[data-sonner-toast][data-type="error"]');
    if (await errorToast.isVisible().catch(() => false)) {
      const message = await errorToast.textContent();
      throw new Error(`Login failed: ${message}`);
    }
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
