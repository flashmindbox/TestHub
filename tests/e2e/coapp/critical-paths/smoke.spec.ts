import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage, StudentsPage, BatchesPage } from '@/page-objects/coapp';

test.describe('CoApp Smoke Tests @smoke @critical', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );
  });

  test('should load dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.totalStudents).toBeVisible();
    await expect(dashboard.totalBatches).toBeVisible();
  });

  test('should load students page', async ({ page }) => {
    const students = new StudentsPage(page);
    await students.goto();

    await expect(students.addStudentButton).toBeVisible();
  });

  test('should load batches page', async ({ page }) => {
    const batches = new BatchesPage(page);
    await batches.goto();

    await expect(batches.addBatchButton).toBeVisible();
  });
});
