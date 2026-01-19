import { test, expect } from '../../../../src/fixtures';
import { LoginPage } from '../../../../src/page-objects/studytab';

test.describe('Login Flow @studytab @auth', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, projectConfig }) => {
    loginPage = new LoginPage(page, projectConfig.baseUrl);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should show error with invalid credentials', async () => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await loginPage.expectError(/invalid|incorrect|wrong/i);
  });

  test('should show error with empty email', async ({ page }) => {
    await loginPage.passwordInput.fill('somepassword');
    await loginPage.submitButton.click();

    // Should show validation error or remain on login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should show error with empty password', async ({ page }) => {
    await loginPage.emailInput.fill('test@example.com');
    await loginPage.submitButton.click();

    // Should show validation error or remain on login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should login successfully with valid credentials', async ({ page, projectConfig }) => {
    const testUser = projectConfig.auth.testUsers.standard;
    await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should navigate to register page', async ({ page }) => {
    await loginPage.goToRegister();
    await expect(page).toHaveURL(/.*register.*/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await loginPage.goToForgotPassword();
    await expect(page).toHaveURL(/.*forgot-password.*/);
  });

  test('should persist session after page reload', async ({ page, projectConfig }) => {
    const testUser = projectConfig.auth.testUsers.standard;
    await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

    // Reload page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
