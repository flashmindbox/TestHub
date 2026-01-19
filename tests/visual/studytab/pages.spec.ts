import { test, expect } from '../../../src/fixtures';

test.describe('Visual Regression - Pages @studytab @visual', () => {
  test.use({ storageState: '.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('login page visual', async ({ page, projectConfig }) => {
    // Use fresh context without auth for login page
    const context = await page.context().browser()!.newContext();
    const freshPage = await context.newPage();
    await freshPage.setViewportSize({ width: 1280, height: 720 });

    await freshPage.goto(`${projectConfig.baseUrl}/auth/login`);
    await freshPage.waitForLoadState('networkidle');

    await expect(freshPage).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    });

    await context.close();
  });

  test('dashboard visual', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('decks list visual', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/decks`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('decks-list.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('settings page visual', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('responsive - mobile viewport', async ({ page, projectConfig }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('responsive - tablet viewport', async ({ page, projectConfig }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dark mode visual', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/settings`);
    await page.waitForLoadState('networkidle');

    // Toggle dark mode
    const darkModeToggle = page.locator('[data-testid="dark-mode"], input[name="darkMode"], button:has-text("Dark")').first();
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(500); // Wait for theme transition
    }

    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
