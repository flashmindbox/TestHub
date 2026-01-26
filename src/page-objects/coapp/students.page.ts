import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class StudentsPage extends BasePage {
  readonly addStudentButton: Locator;
  readonly searchInput: Locator;
  readonly studentTable: Locator;
  readonly studentRows: Locator;
  readonly emptyState: Locator;

  // Form fields
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly guardianNameInput: Locator;
  readonly guardianPhoneInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addStudentButton = page.locator('[data-testid="add-student-button"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.studentTable = page.locator('[data-testid="student-table"]');
    this.studentRows = page.locator('[data-testid="student-row"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');

    this.nameInput = page.locator('input[name="name"]');
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.guardianNameInput = page.locator('input[name="guardianName"]');
    this.guardianPhoneInput = page.locator('input[name="guardianPhone"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');
  }

  async goto() {
    await this.navigateTo('/students');
  }

  async clickAddStudent() {
    await this.addStudentButton.click();
  }

  async fillStudentForm(data: {
    name: string;
    email?: string;
    phone?: string;
    guardianName: string;
    guardianPhone: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.phone) await this.phoneInput.fill(data.phone);
    await this.guardianNameInput.fill(data.guardianName);
    await this.guardianPhoneInput.fill(data.guardianPhone);
  }

  async submitForm() {
    await this.submitButton.click();
    await this.waitForLoad();
  }

  async searchStudent(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoad();
  }

  studentRow(name: string): Locator {
    return this.studentRows.filter({ hasText: name });
  }

  async getStudentCount(): Promise<number> {
    return this.studentRows.count();
  }

  async expectStudentVisible(name: string) {
    await expect(this.studentRow(name)).toBeVisible();
  }

  async expectStudentNotVisible(name: string) {
    await expect(this.studentRow(name)).not.toBeVisible();
  }
}
