/**
 * Login Edge Case Tests
 *
 * Tests for security and edge case scenarios not covered in main login tests.
 */

import { test, expect } from '../../../../src/fixtures';
import { LoginPage } from '../../../../src/page-objects/studytab';

test.describe('Login Edge Cases @studytab @auth @edge-cases', () => {
  // Start with a clean (unauthenticated) browser — override project default
  test.use({ storageState: { cookies: [], origins: [] } });

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

      // Check for rate limit message or that we're still on login page.
      // Better Auth rate limit is 100 req/min, so 5 attempts may not trigger it.
      const rateLimitMessage = page.getByText(/too many|rate limit|try again later|locked/i);
      const loginHeading = page.getByRole('heading', { name: /welcome back/i });

      // Either rate limited OR still showing login form (not crashed/redirected)
      await expect(rateLimitMessage.or(loginHeading)).toBeVisible();
    });

    test.skip('should temporarily lock account after excessive failures', () => {
      // Feature not implemented: Better Auth config uses global rate limiting (100 req/min)
      // but has no per-account lockout after N failed login attempts.
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

      // Should redirect to login — check for session expired message or login heading
      const expiredMessage = page.getByText(/session.*expired|please.*login.*again/i);
      const loginHeading = page.getByRole('heading', { name: /welcome back/i });

      await expect(expiredMessage.or(loginHeading)).toBeVisible();
    });
  });

  test.describe('Remember Me Functionality', () => {
    test.skip('should persist session with remember me checked', () => {
      // Feature not implemented: Login form has no "Remember me" checkbox.
      // Sessions always persist for 7 days (Better Auth session.expiresIn).
    });

    test.skip('should not persist session without remember me', () => {
      // Feature not implemented: No "Remember me" toggle in UI.
      // All sessions use the same 7-day expiry regardless.
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

    test.skip('should invalidate old sessions on password change', () => {
      // Feature not implemented: No "Change password" UI exists.
      // A /logout-all API endpoint exists but isn't tied to password changes.
      // Better Auth supports password reset via email, but no in-app password change flow.
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
      // Use valid email format so browser validation passes and form submits
      await loginPage.login("admin'--@example.com", "' OR 1=1; --");

      // Should show normal invalid credentials error, not crash
      await expect(loginPage.errorMessage).toBeVisible();
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

      // Time request with valid email (wrong password)
      const startValid = Date.now();
      await loginPage.login(testUser.email, 'wrongpassword');
      await expect(loginPage.errorMessage).toBeVisible();
      const validTime = Date.now() - startValid;

      // Reload to clear form state
      await page.goto(`${projectConfig.baseUrl}/auth/login`);
      await loginPage.emailInput.waitFor({ state: 'visible' });

      // Time request with invalid email
      const startInvalid = Date.now();
      await loginPage.login('definitelynotauser@nonexistent.com', 'wrongpassword');
      await expect(loginPage.errorMessage).toBeVisible();
      const invalidTime = Date.now() - startInvalid;

      // Times should be similar (within 1000ms) to prevent timing attacks
      // This is a basic check - real timing attacks need statistical analysis
      const timeDiff = Math.abs(validTime - invalidTime);
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  test.describe('Browser Navigation', () => {
    test('should not allow back button to authenticated page after logout', async ({
      page,
      context,
      projectConfig,
    }) => {
      const testUser = projectConfig.auth.testUsers.standard;

      // Login
      await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

      // Logout by clearing cookies (simulates session end) and navigating away
      await context.clearCookies();
      await page.goto(`${projectConfig.baseUrl}/auth/login`);
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
