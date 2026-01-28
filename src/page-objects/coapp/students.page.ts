import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class StudentsPage extends BasePage {
  readonly addStudentButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly studentTable: Locator;
  readonly emptyState: Locator;
  readonly paginationInfo: Locator;

  constructor(page: Page) {
    super(page);
    this.addStudentButton = page.getByRole('link', { name: 'Add Student' });
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    // Use first() to avoid matching pagination combobox
    this.statusFilter = page.getByRole('combobox').first();
    this.studentTable = page.getByRole('table');
    this.emptyState = page.getByText('No students found');
    this.paginationInfo = page.getByText(/showing|no students/i);
  }

  async goto() {
    await this.navigateTo('/students');
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddStudent() {
    await this.addStudentButton.click();
    await this.page.waitForURL('**/students/new');
  }

  async searchStudent(query: string) {
    await this.searchInput.fill(query);
    // Debounced search - wait for network
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'PASSED_OUT') {
    await this.statusFilter.click();
    // Map enum values to display names (exact match)
    const displayNames: Record<string, string> = {
      'ALL': 'All Status',
      'ACTIVE': 'Active',
      'INACTIVE': 'Inactive',
      'PASSED_OUT': 'Passed Out',
    };
    await this.page.getByRole('option', { name: displayNames[status], exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async getStudentRows() {
    return this.studentTable.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
  }

  async getStudentCount(): Promise<number> {
    const rows = await this.getStudentRows();
    const count = await rows.count();
    // If empty state is shown, return 0
    if (await this.emptyState.isVisible().catch(() => false)) {
      return 0;
    }
    return count;
  }

  async expectStudentInTable(name: string) {
    await expect(this.studentTable.getByRole('cell', { name })).toBeVisible();
  }

  async expectStudentNotInTable(name: string) {
    await expect(this.studentTable.getByRole('cell', { name })).not.toBeVisible();
  }

  async clickViewStudent(name: string) {
    const row = this.studentTable.getByRole('row', { name: new RegExp(name) });
    await row.getByRole('link').click();
    await this.page.waitForURL(/\/students\/[a-z0-9-]+/);
  }

  async clickFirstStudent() {
    const rows = await this.getStudentRows();
    const firstRow = rows.first();
    await firstRow.getByRole('link').first().click();
    await this.page.waitForURL(/\/students\/[a-z0-9-]+/);
  }
}

export class StudentFormPage extends BasePage {
  // Step indicators
  readonly stepIndicators: Locator;

  // Step 1: Basic Info
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly dobInput: Locator;

  // Step 2: Guardian
  readonly guardianNameInput: Locator;
  readonly guardianRelationSelect: Locator;
  readonly guardianPhoneInput: Locator;
  readonly guardianEmailInput: Locator;

  // Step 3: Address
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly pincodeInput: Locator;

  // Navigation
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.stepIndicators = page.locator('[class*="step"]');

    // Step 1
    this.firstNameInput = page.getByRole('textbox', { name: /first name/i });
    this.lastNameInput = page.getByRole('textbox', { name: /last name/i });
    this.emailInput = page.getByRole('textbox', { name: /^email/i });
    this.phoneInput = page.getByRole('textbox', { name: /^phone$/i });
    this.dobInput = page.getByRole('textbox', { name: /date of birth/i });

    // Step 2
    this.guardianNameInput = page.getByRole('textbox', { name: /guardian name/i });
    this.guardianRelationSelect = page.getByRole('combobox', { name: /relation/i });
    this.guardianPhoneInput = page.getByRole('textbox', { name: /guardian phone/i });
    this.guardianEmailInput = page.getByRole('textbox', { name: /guardian email/i });

    // Step 3
    this.addressInput = page.getByRole('textbox', { name: /^address$/i });
    this.cityInput = page.getByRole('textbox', { name: /city/i });
    this.stateInput = page.getByRole('textbox', { name: /state/i });
    this.pincodeInput = page.getByRole('textbox', { name: /pincode/i });

    // Navigation
    this.backButton = page.getByRole('button', { name: /back/i });
    // Use first() as multi-step form may have multiple Next buttons (hidden/visible)
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true }).first();
    this.submitButton = page.getByRole('button', { name: /create student/i });
  }

  async goto() {
    await this.navigateTo('/students/new');
    await this.firstNameInput.waitFor({ state: 'visible' });
  }

  async fillStep1(data: { firstName: string; lastName: string; email: string; phone?: string }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    if (data.phone) await this.phoneInput.fill(data.phone);
  }

  async fillStep2(data: { guardianName?: string; guardianPhone?: string; guardianEmail?: string }) {
    if (data.guardianName) await this.guardianNameInput.fill(data.guardianName);
    if (data.guardianPhone) await this.guardianPhoneInput.fill(data.guardianPhone);
    if (data.guardianEmail) await this.guardianEmailInput.fill(data.guardianEmail);
  }

  async fillStep3(data: { address?: string; city?: string; state?: string; pincode?: string }) {
    if (data.address) await this.addressInput.fill(data.address);
    if (data.city) await this.cityInput.fill(data.city);
    if (data.state) await this.stateInput.fill(data.state);
    if (data.pincode) await this.pincodeInput.fill(data.pincode);
  }

  async goToNextStep() {
    await this.nextButton.click();
    await this.page.waitForTimeout(300); // Animation
  }

  async goToPreviousStep() {
    await this.backButton.click();
    await this.page.waitForTimeout(300);
  }

  async submitForm() {
    await this.submitButton.click();
    await this.page.waitForURL('**/students', { timeout: 10000 });
  }

  async createStudent(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    guardianName?: string;
    guardianPhone?: string;
  }) {
    await this.fillStep1({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone });
    await this.goToNextStep();
    await this.fillStep2({ guardianName: data.guardianName, guardianPhone: data.guardianPhone });
    await this.goToNextStep();
    await this.submitForm();
  }
}

export class StudentDetailPage extends BasePage {
  readonly backLink: Locator;
  readonly studentName: Locator;
  readonly statusBadge: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly tabs: Locator;
  readonly profileTab: Locator;
  readonly batchesTab: Locator;
  readonly feesTab: Locator;
  readonly progressTab: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.getByRole('link', { name: /back to students/i });
    this.studentName = page.getByRole('heading', { level: 1 });
    this.statusBadge = page.locator('[class*="badge"]').first();
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.tabs = page.getByRole('tablist');
    this.profileTab = page.getByRole('tab', { name: /profile/i });
    this.batchesTab = page.getByRole('tab', { name: /batches/i });
    this.feesTab = page.getByRole('tab', { name: /fees/i });
    this.progressTab = page.getByRole('tab', { name: /progress/i });
  }

  async goto(studentId: string) {
    await this.navigateTo(`/students/${studentId}`);
    await this.studentName.waitFor({ state: 'visible' });
  }

  async getStudentName(): Promise<string> {
    return (await this.studentName.textContent()) || '';
  }

  async clickEdit() {
    await this.editButton.click();
    // Wait for edit dialog
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async clickDelete() {
    await this.deleteButton.click();
    // Wait for confirmation dialog
    await this.page.getByRole('alertdialog').waitFor({ state: 'visible' });
  }

  async confirmDelete() {
    await this.page.getByRole('alertdialog').getByRole('button', { name: /delete/i }).click();
    await this.page.waitForURL('**/students');
  }

  async switchToTab(tab: 'profile' | 'batches' | 'fees' | 'progress') {
    const tabLocator = {
      profile: this.profileTab,
      batches: this.batchesTab,
      fees: this.feesTab,
      progress: this.progressTab,
    }[tab];
    await tabLocator.click();
  }

  async expectProfileInfo(field: string, value: string) {
    const definition = this.page.getByRole('definition').filter({ hasText: value });
    await expect(definition).toBeVisible();
  }
}
