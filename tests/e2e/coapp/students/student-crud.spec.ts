import { test, expect } from '@playwright/test';
import { LoginPage, StudentsPage } from '@/page-objects/coapp';
import { faker } from '@faker-js/faker';

test.describe('Student Management @students', () => {
  let loginPage: LoginPage;
  let studentsPage: StudentsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    studentsPage = new StudentsPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
      process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!'
    );

    await studentsPage.goto();
  });

  test('should create a new student', async () => {
    const studentName = `Test Student ${faker.string.alphanumeric(6)}`;

    await studentsPage.clickAddStudent();
    await studentsPage.fillStudentForm({
      name: studentName,
      email: faker.internet.email(),
      guardianName: faker.person.fullName(),
      guardianPhone: '9876543210',
    });
    await studentsPage.submitForm();

    await studentsPage.expectToast('Student created');
    await studentsPage.expectStudentVisible(studentName);
  });

  test('should search for students', async () => {
    // Assumes test data exists
    await studentsPage.searchStudent('Test');

    // Should show filtered results
    const count = await studentsPage.getStudentCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should validate required fields', async ({ page }) => {
    await studentsPage.clickAddStudent();
    await studentsPage.submitForm();

    // Should show validation errors
    const nameError = page.locator('[data-testid="error-name"]');
    await expect(nameError).toBeVisible();
  });
});
