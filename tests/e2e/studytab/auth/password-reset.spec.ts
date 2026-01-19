import { test, expect } from '../../../../src/fixtures';
import { LoginPage, ForgotPasswordPage } from '../../../../src/page-objects/studytab';

/**
 * Password Reset Flow Tests
 *
 * Tests the forgot password functionality including:
 * - Navigation from login page
 * - Form validation
 * - Successful password reset request
 * - Rate limiting (if implemented)
 *
 * Tags: @studytab @auth @password-reset
 */
test.describe('Password Reset Flow @studytab @auth', () => {
  // These tests don't require authentication
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('Navigation', () => {
    test('shows forgot password link on login page', async ({ page, projectConfig }) => {
      const loginPage = new LoginPage(page, projectConfig.baseUrl);
      await loginPage.goto();

      // Verify the forgot password link is visible
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toHaveText(/forgot/i);
    });

    test('can navigate to forgot password page from login', async ({ page, projectConfig }) => {
      const loginPage = new LoginPage(page, projectConfig.baseUrl);
      await loginPage.goto();

      // Click forgot password link
      await loginPage.forgotPasswordLink.click();

      // Should navigate to forgot password page
      await expect(page).toHaveURL(/.*forgot-password.*/);

      // Verify forgot password form is visible
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.expectFormVisible();
    });

    test('can navigate back to login from forgot password page', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Click back to login link
      await forgotPage.goBackToLogin();

      // Should be on login page
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test.describe('Form Display', () => {
    test('displays forgot password form with all elements', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Verify all form elements are present
      await expect(forgotPage.heading).toBeVisible();
      await expect(forgotPage.heading).toHaveText('Forgot your password?');
      await expect(forgotPage.description).toBeVisible();
      await expect(forgotPage.emailInput).toBeVisible();
      await expect(forgotPage.submitButton).toBeVisible();
      await expect(forgotPage.submitButton).toHaveText('Send reset link');
      await expect(forgotPage.backToLoginLink).toBeVisible();
    });

    test('email input has correct attributes', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Verify email input has placeholder
      await expect(forgotPage.emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });
  });

  test.describe('Form Validation', () => {
    test('prevents submission with empty email (HTML5 validation)', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Try to submit without entering email
      await forgotPage.submitButton.click();

      // Should still be on the same page (HTML5 validation prevents submission)
      await expect(page).toHaveURL(/.*forgot-password.*/);

      // Email input should be focused or have validation state
      await expect(forgotPage.emailInput).toBeFocused();
    });

    test('prevents submission with invalid email format (HTML5 validation)', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Enter invalid email
      await forgotPage.emailInput.fill('notanemail');
      await forgotPage.submitButton.click();

      // Should still be on the same page (HTML5 validation prevents submission)
      await expect(page).toHaveURL(/.*forgot-password.*/);

      // Form should not show success state
      await expect(forgotPage.successHeading).not.toBeVisible();
    });

    test('accepts valid email format', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Enter valid email
      const testEmail = 'validuser@example.com';
      await forgotPage.requestPasswordReset(testEmail);

      // Should show success message
      await forgotPage.expectSuccess(testEmail);
    });
  });

  test.describe('Successful Password Reset Request', () => {
    test('shows success message after requesting reset', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      const testEmail = 'test@example.com';
      await forgotPage.requestPasswordReset(testEmail);

      // Verify success state
      await expect(forgotPage.successHeading).toBeVisible();
      await expect(forgotPage.successHeading).toHaveText('Check your email');
      await expect(page.getByText(testEmail)).toBeVisible();
      await expect(forgotPage.tryAgainButton).toBeVisible();
      await expect(forgotPage.backToLoginLink).toBeVisible();
    });

    test('can request reset again using try again button', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // First request
      await forgotPage.requestPasswordReset('first@example.com');
      await forgotPage.expectSuccess();

      // Click try again
      await forgotPage.clickTryAgain();

      // Should be back to form state
      await forgotPage.expectFormVisible();
      await expect(forgotPage.emailInput).toBeVisible();
    });

    test('can navigate to login after successful reset request', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      await forgotPage.requestPasswordReset('test@example.com');
      await forgotPage.expectSuccess();

      // Click back to login
      await forgotPage.goBackToLogin();

      // Should be on login page
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('shows success even for non-existent email (security)', async ({ page, projectConfig }) => {
      // For security, the app should not reveal whether an email exists
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
      await forgotPage.requestPasswordReset(nonExistentEmail);

      // Should still show success (to prevent email enumeration)
      await forgotPage.expectSuccess(nonExistentEmail);
    });
  });

  test.describe('Rate Limiting', () => {
    // Skip this test if rate limiting is not implemented
    // When implemented, this test verifies that users cannot spam reset requests
    test.skip('rate limits password reset requests', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      const testEmail = 'ratelimit@example.com';

      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        await forgotPage.requestPasswordReset(testEmail);
        if (i < 4) {
          await forgotPage.clickTryAgain();
        }
      }

      // Should show rate limit error after too many requests
      await expect(page.getByText(/too many requests|rate limit|try again later/i)).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('handles email with leading/trailing spaces', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Email with spaces (should be trimmed by the app)
      await forgotPage.requestPasswordReset('  test@example.com  ');

      // Should still succeed
      await forgotPage.expectSuccess();
    });

    test('handles email with different cases', async ({ page, projectConfig }) => {
      const forgotPage = new ForgotPasswordPage(page, projectConfig.baseUrl);
      await forgotPage.goto();

      // Email with mixed case
      await forgotPage.requestPasswordReset('Test@Example.COM');

      // Should succeed (emails are case-insensitive)
      await forgotPage.expectSuccess();
    });
  });
});
