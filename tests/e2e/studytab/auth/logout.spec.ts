import { test, expect } from '../../../../src/fixtures';
import { DashboardPage } from '../../../../src/page-objects/studytab';

test.describe('Logout Flow @studytab @auth', () => {
  // These tests use authenticated state
  test.use({ storageState: '.auth/user.json' });

  test('should logout successfully', async ({ page, projectConfig }) => {
    const dashboardPage = new DashboardPage(page, projectConfig.baseUrl);
    await dashboardPage.goto();

    // Open user menu and logout
    await dashboardPage.navigation.openUserMenu();

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")').first();
    await logoutButton.click();

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login.*|^\/$/, { timeout: 10000 });
  });

  test('should not access protected pages after logout', async ({ page, projectConfig }) => {
    const dashboardPage = new DashboardPage(page, projectConfig.baseUrl);
    await dashboardPage.goto();

    // Logout
    await dashboardPage.navigation.openUserMenu();
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    await logoutButton.click();

    // Wait for logout to complete
    await page.waitForURL(/.*login.*|^\/$/, { timeout: 10000 });

    // Try to access dashboard directly
    await page.goto(`${projectConfig.baseUrl}/dashboard`);

    // Should be redirected to login
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should clear session cookies on logout', async ({ page, projectConfig }) => {
    const dashboardPage = new DashboardPage(page, projectConfig.baseUrl);
    await dashboardPage.goto();

    // Check we have session cookie
    let cookies = await page.context().cookies();
    const sessionCookieBefore = cookies.find(c => c.name.includes('session'));
    expect(sessionCookieBefore).toBeDefined();

    // Logout
    await dashboardPage.navigation.openUserMenu();
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    await logoutButton.click();

    await page.waitForURL(/.*login.*|^\/$/, { timeout: 10000 });

    // Session cookie should be cleared or expired
    cookies = await page.context().cookies();
    const sessionCookieAfter = cookies.find(c => c.name.includes('session'));

    // Cookie should either be gone or have a past expiry
    if (sessionCookieAfter) {
      expect(sessionCookieAfter.expires).toBeLessThan(Date.now() / 1000);
    }
  });
});
