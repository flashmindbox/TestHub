import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { FormComponent } from '../_common';

export class RegisterPage extends BasePage {
  readonly form: FormComponent;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;
  readonly googleSignupButton: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.form = new FormComponent(page);
    this.nameInput = page.locator('[data-testid="name-input"], input[name="name"]').first();
    this.emailInput = page.locator('[data-testid="email-input"], input[name="email"], input[type="email"]').first();
    this.passwordInput = page.locator('[data-testid="password-input"], input[name="password"]').first();
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password-input"], input[name="confirmPassword"]').first();
    this.termsCheckbox = page.locator('[data-testid="terms-checkbox"], input[name="terms"], input[type="checkbox"]').first();
    this.submitButton = page.locator('[data-testid="register-button"], button[type="submit"]').first();
    this.errorMessage = page.locator('[data-testid="register-error"], [role="alert"], .error-message').first();
    this.loginLink = page.locator('a:has-text("Sign in"), a:has-text("Login"), a:has-text("Already have")').first();
    this.googleSignupButton = page.locator('[data-testid="google-signup"], button:has-text("Google")').first();
  }

  async goto() {
    await super.goto('/auth/register');
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async register(data: { name: string; email: string; password: string; confirmPassword?: string }) {
    if (await this.nameInput.isVisible()) {
      await this.nameInput.fill(data.name);
    }
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(data.confirmPassword || data.password);
    }

    if (await this.termsCheckbox.isVisible()) {
      await this.termsCheckbox.check();
    }

    await this.submitButton.click();
  }

  async registerAndWaitForSuccess(data: { name: string; email: string; password: string }) {
    await this.register(data);
    // Wait for redirect to dashboard or email verification page
    await this.page.waitForURL((url) =>
      url.pathname.includes('/dashboard') ||
      url.pathname.includes('/verify') ||
      url.pathname.includes('/login'),
      { timeout: 15000 }
    );
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async goToLogin() {
    await this.loginLink.click();
    await this.page.waitForURL('**/login**');
  }
}
