import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ForgotPasswordPage extends BasePage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  readonly errorMessage: Locator;

  // Success state elements
  readonly successHeading: Locator;
  readonly successEmailConfirmation: Locator;
  readonly tryAgainButton: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.heading = page.getByRole('heading', { name: 'Forgot your password?' });
    this.description = page.getByText('Enter your email and we\'ll send you a reset link');
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.submitButton = page.getByRole('button', { name: 'Send reset link' });
    this.backToLoginLink = page.getByRole('link', { name: /back to login|sign in/i });
    this.errorMessage = page.locator('[role="alert"], .error-message').first();

    // Success state
    this.successHeading = page.getByRole('heading', { name: 'Check your email' });
    this.successEmailConfirmation = page.getByText(/We've sent a password reset link to/);
    this.tryAgainButton = page.getByRole('button', { name: 'try again' });
  }

  async goto() {
    await super.goto('/auth/forgot-password');
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async expectFormVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectSuccess(email?: string) {
    await expect(this.successHeading).toBeVisible({ timeout: 10000 });
    await expect(this.successEmailConfirmation).toBeVisible();
    if (email) {
      await expect(this.page.getByText(email)).toBeVisible();
    }
    await expect(this.tryAgainButton).toBeVisible();
    await expect(this.backToLoginLink).toBeVisible();
  }

  async expectError(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async clickTryAgain() {
    await this.tryAgainButton.click();
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async goBackToLogin() {
    await this.backToLoginLink.click();
    await this.page.waitForURL('**/login**');
  }
}
