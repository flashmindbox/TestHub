import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { FormComponent } from '../_common';

export class LoginPage extends BasePage {
  readonly form: FormComponent;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly googleLoginButton: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.form = new FormComponent(page);
    this.emailInput = page.locator('[data-testid="email-input"], input[name="email"], input[type="email"]').first();
    this.passwordInput = page.locator('[data-testid="password-input"], input[name="password"], input[type="password"]').first();
    this.submitButton = page.locator('[data-testid="login-button"], button[type="submit"]').first();
    this.errorMessage = page.locator('[data-testid="login-error"], [role="alert"], .error-message').first();
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot.*password/i });
    this.registerLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create account")').first();
    this.googleLoginButton = page.locator('[data-testid="google-login"], button:has-text("Google")').first();
  }

  async goto() {
    await super.goto('/auth/login');
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 });
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL('**/forgot-password**');
  }

  async goToRegister() {
    await this.registerLink.click();
    await this.page.waitForURL('**/register**');
  }

  async loginWithGoogle() {
    await this.googleLoginButton.click();
    // OAuth flow will redirect to Google
  }
}
