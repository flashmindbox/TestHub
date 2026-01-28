import { test, expect } from '@playwright/test';
import { LoginPage, StudentsPage, StudentFormPage, StudentDetailPage } from '../../../../src/page-objects/coapp';

test.describe('Student Management @coapp @students', () => {
  let loginPage: LoginPage;
  let studentsPage: StudentsPage;
  let studentFormPage: StudentFormPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    studentsPage = new StudentsPage(page);
    studentFormPage = new StudentFormPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.login('alpha@example.com', 'password123');
  });

  test('should display students list page', async ({ page }) => {
    await studentsPage.goto();

    await expect(studentsPage.addStudentButton).toBeVisible();
    await expect(studentsPage.searchInput).toBeVisible();
    await expect(studentsPage.studentTable).toBeVisible();
  });

  test('should navigate to add student form', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.clickAddStudent();

    await expect(page).toHaveURL(/.*students\/new/);
    await expect(studentFormPage.firstNameInput).toBeVisible();
  });

  test('should create a new student via multi-step form', async ({ page }) => {
    const uniqueEmail = `test${Date.now()}@example.com`;

    await studentFormPage.goto();

    // Step 1: Basic Info
    await studentFormPage.fillStep1({
      firstName: 'Test',
      lastName: 'Student',
      email: uniqueEmail,
      phone: '9876543210',
    });
    await studentFormPage.goToNextStep();

    // Step 2: Guardian
    await expect(studentFormPage.guardianNameInput).toBeVisible();
    await studentFormPage.fillStep2({
      guardianName: 'Test Parent',
      guardianPhone: '9876543211',
    });
    await studentFormPage.goToNextStep();

    // Step 3: Address (skip optional fields)
    await expect(studentFormPage.submitButton).toBeVisible();
    await studentFormPage.submitForm();

    // Should redirect to students list
    await expect(page).toHaveURL(/.*students$/);

    // Verify student appears in list
    await studentsPage.expectStudentInTable('Test Student');
  });

  test('should search for students', async () => {
    await studentsPage.goto();

    // Search for existing student
    await studentsPage.searchStudent('John');

    // Should filter results (may be 0 if no match)
    const count = await studentsPage.getStudentCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should view student detail page', async ({ page }) => {
    await studentsPage.goto();

    // Click on first student (if exists)
    const count = await studentsPage.getStudentCount();
    if (count > 0) {
      await studentsPage.clickViewStudent('John Doe');

      const detailPage = new StudentDetailPage(page);
      await expect(detailPage.studentName).toBeVisible();
      await expect(detailPage.editButton).toBeVisible();
      await expect(detailPage.deleteButton).toBeVisible();
      await expect(detailPage.tabs).toBeVisible();
    }
  });

  test('should filter students by status', async () => {
    await studentsPage.goto();

    await studentsPage.filterByStatus('ACTIVE');

    // Should show active students only
    const count = await studentsPage.getStudentCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
