import { test, expect } from '@playwright/test';
import { LoginPage } from '@/page-objects/coapp';

test.describe('Plan Feature Gates @plan', () => {
  test('Starter plan should have limited features', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );

    // AI features should be hidden/disabled for Starter
    const aiFeatureButton = page.locator('[data-testid="ai-feature"]');
    await expect(aiFeatureButton).not.toBeVisible();
  });

  test('Growth plan should have AI features available', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_GROWTH_ADMIN_EMAIL || 'admin@growth-test.coapp.in',
      process.env.COAPP_GROWTH_ADMIN_PASSWORD || 'Test123!'
    );

    // AI features should be visible for Growth (if add-on purchased)
    // This is a placeholder - actual test depends on implementation
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});
