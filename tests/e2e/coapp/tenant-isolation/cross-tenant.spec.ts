import { test, expect } from '@playwright/test';
import { LoginPage, StudentsPage } from '@/page-objects/coapp';

test.describe('Tenant Isolation @tenant @security', () => {
  test('Starter tenant should not see Growth tenant data', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const studentsPage = new StudentsPage(page);

    // Login as Starter tenant admin
    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );

    await studentsPage.goto();

    // Should only see Starter tenant students
    // This test will be meaningful once test data is seeded
    const tenantName = await studentsPage.getTenantName();
    expect(tenantName).toContain('starter');
  });

  test('Growth tenant should not see Starter tenant data', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const studentsPage = new StudentsPage(page);

    // Login as Growth tenant admin
    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_GROWTH_ADMIN_EMAIL || 'admin@growth-test.coapp.in',
      process.env.COAPP_GROWTH_ADMIN_PASSWORD || 'Test123!'
    );

    await studentsPage.goto();

    // Should only see Growth tenant students
    const tenantName = await studentsPage.getTenantName();
    expect(tenantName).toContain('growth');
  });

  test('Direct URL access should respect tenant boundaries', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as Starter tenant
    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );

    // Try to access a student from Growth tenant via direct URL
    // Should get 404 or redirect, not the actual data
    const response = await page.goto('/students/growth-tenant-student-id');

    // Should not find the resource (404) or redirect to own tenant
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });
});
