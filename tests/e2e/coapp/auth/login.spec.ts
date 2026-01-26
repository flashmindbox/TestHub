import { test, expect } from '@playwright/test';
import { LoginPage } from '@/page-objects/coapp';

test.describe('CoApp Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.loginExpectError('wrong@email.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toContainText(/invalid|incorrect/i);
  });

  test('should logout successfully', async ({ page }) => {
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );

    await loginPage.logout();
    await expect(page).toHaveURL(/.*login/);
  });
});
