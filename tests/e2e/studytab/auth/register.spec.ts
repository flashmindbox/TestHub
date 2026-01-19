import { test, expect } from '../../../../src/fixtures';
import { RegisterPage } from '../../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../../src/utils';

test.describe('Registration Flow @studytab @auth', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page, projectConfig }) => {
    registerPage = new RegisterPage(page, projectConfig.baseUrl);
    await registerPage.goto();
  });

  test('should display registration form', async () => {
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('should show error with invalid email format', async () => {
    const userData = TestDataFactory.user();
    await registerPage.register({
      name: userData.name,
      email: 'invalid-email',
      password: userData.password,
    });

    // Should show validation error
    const hasError = await registerPage.form.hasErrors();
    expect(hasError).toBeTruthy();
  });

  test('should show error with weak password', async () => {
    const userData = TestDataFactory.user();
    await registerPage.register({
      name: userData.name,
      email: userData.email,
      password: '123', // Too weak
    });

    // Should show validation error about password strength
    const hasError = await registerPage.form.hasErrors();
    expect(hasError).toBeTruthy();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    const userData = TestDataFactory.user();

    if (await registerPage.confirmPasswordInput.isVisible()) {
      await registerPage.nameInput.fill(userData.name);
      await registerPage.emailInput.fill(userData.email);
      await registerPage.passwordInput.fill(userData.password);
      await registerPage.confirmPasswordInput.fill('differentpassword');
      await registerPage.submitButton.click();

      const hasError = await registerPage.form.hasErrors();
      expect(hasError).toBeTruthy();
    }
  });

  test('should register successfully with valid data', async ({ page, cleanup }) => {
    const userData = TestDataFactory.user();

    await registerPage.registerAndWaitForSuccess(userData);

    // Track for cleanup
    cleanup.track({
      type: 'user',
      id: userData.email,
      name: userData.name,
      deleteVia: 'api',
      deletePath: `/api/v1/users/test/${encodeURIComponent(userData.email)}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Should redirect away from register page
    await expect(page).not.toHaveURL(/.*register.*/);
  });

  test('should navigate to login page', async ({ page }) => {
    await registerPage.goToLogin();
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should show error for duplicate email', async ({ projectConfig }) => {
    // Try to register with existing test user email
    const existingUser = projectConfig.auth.testUsers.standard;

    await registerPage.register({
      name: 'Duplicate User',
      email: existingUser.email,
      password: 'Test123!',
    });

    await registerPage.expectError(/already exists|already registered|duplicate/i);
  });
});
