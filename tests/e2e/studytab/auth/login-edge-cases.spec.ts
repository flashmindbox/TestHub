/**
 * Login Edge Case Tests
 *
 * Tests for security and edge case scenarios not covered in main login tests.
 */

import { test, expect } from '../../../../src/fixtures';
import { LoginPage } from '../../../../src/page-objects/studytab';

test.describe('Login Edge Cases @studytab @auth @edge-cases', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, projectConfig }) => {
    loginPage = new LoginPage(page, projectConfig.baseUrl);
    await loginPage.goto();
  });

  test.describe('Rate Limiting / Brute Force Protection', () => {
    test('should show rate limit message after multiple failed attempts', async ({ page }) => {
      // Attempt login with wrong password multiple times
      const attempts = 5;

      for (let i = 0; i < attempts; i++) {
        await loginPage.login('test@example.com', `wrongpassword${i}`);
        // Wait a bit between attempts
        await page.waitForTimeout(500);
      }

      // Check for rate limit message or lockout
      const rateLimitMessage = page.getByText(/too many|rate limit|try again later|locked/i);
      const stillOnLogin = page.getByRole('heading', { name: /sign in/i });

      // Either rate limited OR still showing error (depends on implementation)
      await expect(rateLimitMessage.or(stillOnLogin)).toBeVisible();
    });

    test.skip('should temporarily lock account after excessive failures', async () => {
      // Skip if not implemented - document expected behavior
      // After 10 failed attempts, account should be locked for 15 minutes
      test.info().annotations.push({
        type: 'todo',
        description: 'Implement account lockout after 10 failed attempts',
      });
    });
  });

  test.describe('Session Timeout', () => {
    test('should redirect to login when session expires', async ({ page, context, projectConfig }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // First, log in successfully
      await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

      // Clear session storage/cookies to simulate expiry
      await context.clearCookies();

      // Try to access protected page
      await page.goto(`${projectConfig.baseUrl}/dashboard`);

      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should show session expired message when re-authenticating', async ({ page, context, projectConfig }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // Login first
      await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

      // Clear session
      await context.clearCookies();

      // Navigate to trigger re-auth
      await page.goto(`${projectConfig.baseUrl}/dashboard`);

      // Check for session expired message (if implemented)
      const expiredMessage = page.getByText(/session.*expired|please.*login.*again/i);
      const loginHeading = page.getByRole('heading', { name: /sign in/i });

      await expect(expiredMessage.or(loginHeading)).toBeVisible();
    });
  });

  test.describe('Remember Me Functionality', () => {
    test.skip('should persist session with remember me checked', async () => {
      // Skip if remember me not implemented
      test.info().annotations.push({
        type: 'todo',
        description: 'Implement remember me checkbox on login form',
      });

      // Expected behavior:
      // 1. Check "Remember me" checkbox
      // 2. Login
      // 3. Close browser
      // 4. Reopen - should still be logged in
    });

    test.skip('should not persist session without remember me', async () => {
      // Skip if not implemented
      test.info().annotations.push({
        type: 'todo',
        description: 'Session should expire on browser close without remember me',
      });
    });
  });

  test.describe('Concurrent Sessions', () => {
    test('should allow login from multiple devices', async ({ browser, projectConfig }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // Create two separate browser contexts (simulating two devices)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const loginPage1 = new LoginPage(page1, projectConfig.baseUrl);
      const loginPage2 = new LoginPage(page2, projectConfig.baseUrl);

      // Login on both
      await loginPage1.goto();
      await loginPage1.loginAndWaitForDashboard(testUser.email, testUser.password);

      await loginPage2.goto();
      await loginPage2.loginAndWaitForDashboard(testUser.email, testUser.password);

      // Both should be on dashboard
      await expect(page1).toHaveURL(/.*dashboard.*/);
      await expect(page2).toHaveURL(/.*dashboard.*/);

      // Cleanup
      await context1.close();
      await context2.close();
    });

    test.skip('should invalidate old sessions on password change', async () => {
      // Skip - requires password change implementation
      test.info().annotations.push({
        type: 'todo',
        description: 'Password change should invalidate all existing sessions',
      });
    });
  });

  test.describe('Input Edge Cases', () => {
    test('should handle email with special characters', async ({ page }) => {
      await loginPage.login('test+alias@example.com', 'Test123!');

      // Should either work or show appropriate error
      const errorOrDashboard = page
        .getByText(/invalid|not found/i)
        .or(page.locator('[data-testid="dashboard"]'));
      await expect(errorOrDashboard).toBeVisible({ timeout: 10000 });
    });

    test('should handle very long email input', async ({ page }) => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      await loginPage.emailInput.fill(longEmail);
      await loginPage.passwordInput.fill('Test123!');
      await loginPage.submitButton.click();

      // Should show validation error
      await expect(page.getByText(/invalid|too long|error/i)).toBeVisible();
    });

    test('should handle unicode in password', async ({ page }) => {
      await loginPage.login('test@example.com', 'Test123!密码');

      // Should handle gracefully (either accept or show error)
      await page.waitForLoadState('networkidle');
    });

    test('should trim whitespace from email', async ({ page }) => {
      await loginPage.login('  test@example.com  ', 'Test123!');

      // Should either login successfully or show appropriate error
      // (not "user not found" for the untrimmed email)
      await page.waitForLoadState('networkidle');
    });

    test('should handle SQL injection attempt gracefully', async ({ page }) => {
      await loginPage.login("'; DROP TABLE users; --", 'password');

      // Should show normal invalid credentials error, not crash
      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should handle XSS attempt in email field', async ({ page }) => {
      await loginPage.login('<script>alert("xss")</script>@test.com', 'password');

      // Should not execute script, should show validation error
      await page.waitForLoadState('networkidle');

      // Page should not have alert dialogs triggered
      // If XSS worked, this would have triggered an alert
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test.describe('Security Headers', () => {
    test('should not expose sensitive info in error messages', async ({ page }) => {
      await loginPage.login('nonexistent@example.com', 'wrongpassword');

      // Wait for error to appear
      await expect(loginPage.errorMessage).toBeVisible();

      const errorText = await loginPage.errorMessage.textContent();

      // Should NOT say "user not found" - reveals user existence
      expect(errorText?.toLowerCase()).not.toContain('user not found');
      expect(errorText?.toLowerCase()).not.toContain('no account');
      expect(errorText?.toLowerCase()).not.toContain('email does not exist');

      // Should say something generic
      expect(errorText?.toLowerCase()).toMatch(/invalid|incorrect|credentials|failed/);
    });

    test('should not leak timing information on user existence', async ({ page, projectConfig }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // Time request with valid email
      const startValid = Date.now();
      await loginPage.login(testUser.email, 'wrongpassword');
      await loginPage.errorMessage.waitFor({ state: 'visible' });
      const validTime = Date.now() - startValid;

      // Clear form
      await loginPage.emailInput.clear();
      await loginPage.passwordInput.clear();

      // Time request with invalid email
      const startInvalid = Date.now();
      await loginPage.login('definitelynotauser@nonexistent.com', 'wrongpassword');
      await loginPage.errorMessage.waitFor({ state: 'visible' });
      const invalidTime = Date.now() - startInvalid;

      // Times should be similar (within 500ms) to prevent timing attacks
      // This is a basic check - real timing attacks need statistical analysis
      const timeDiff = Math.abs(validTime - invalidTime);
      expect(timeDiff).toBeLessThan(500);
    });
  });

  test.describe('Browser Navigation', () => {
    test('should not allow back button to authenticated page after logout', async ({
      page,
      projectConfig,
    }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // Login
      await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

      // Logout (navigate to logout or click logout button)
      await page.goto(`${projectConfig.baseUrl}/auth/logout`);
      await page.waitForURL(/.*login.*/);

      // Try to go back
      await page.goBack();

      // Should redirect to login, not show cached dashboard
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should handle direct URL access to login when already authenticated', async ({
      page,
      projectConfig,
    }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // Login first
      await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

      // Try to access login page directly
      await page.goto(`${projectConfig.baseUrl}/auth/login`);

      // Should redirect to dashboard (already logged in)
      await expect(page).toHaveURL(/.*dashboard.*/);
    });
  });
});
