import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../../src/page-objects/coapp';

test.describe('CoApp Authentication @coapp @auth', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Use seeded test account
    await loginPage.login('testuser@coapp.test', 'Test123!');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.loginExpectError('wrong@email.com', 'wrongpassword');
  });

  test('should navigate to register page', async ({ page }) => {
    await loginPage.goToRegister();
    await expect(page).toHaveURL(/.*register/);
  });
});
