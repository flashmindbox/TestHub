import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class FinanceDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Stats Cards - using data-testid
  get todayCollectionCard() { return this.page.getByTestId('stats-today'); }
  get thisMonthCard() { return this.page.getByTestId('stats-month'); }
  get pendingDuesCard() { return this.page.getByTestId('stats-pending'); }
  get overdueFessCard() { return this.page.getByTestId('stats-overdue'); }

  // Charts
  get collectionChart() { return this.page.getByTestId('collection-chart'); }
  get methodPieChart() { return this.page.getByTestId('method-chart'); }

  // Tables
  get recentPaymentsTable() { return this.page.getByTestId('recent-payments-table'); }
  get overdueFeesTable() { return this.page.getByTestId('overdue-fees-table'); }

  // Actions
  get recordPaymentButton() { return this.page.getByTestId('record-payment-btn'); }

  async goto() {
    await this.navigateTo('/finance');
    await this.page.waitForLoadState('networkidle');
  }

  async getTodayCollection(): Promise<string> {
    const card = this.todayCollectionCard;
    const amount = await card.locator('p').filter({ hasText: /₹/ }).textContent();
    return amount || '₹0';
  }

  async getOverdueCount(): Promise<number> {
    const badge = this.overdueFessCard.locator('text=fees').locator('..');
    const text = await badge.locator('p').first().textContent();
    return parseInt(text || '0', 10);
  }

  async clickRecordPayment() {
    await this.recordPaymentButton.click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }
}

export class FeeStructuresPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements - using data-testid
  get pageContainer() { return this.page.getByTestId('fee-structures-page'); }
  get createButton() { return this.page.getByTestId('create-fee-structure-btn'); }
  get searchInput() { return this.page.getByTestId('search-input'); }
  get filterStatus() { return this.page.getByTestId('filter-status'); }
  get filterFrequency() { return this.page.getByTestId('filter-frequency'); }
  get structuresTable() { return this.page.getByTestId('fee-structures-table'); }
  get emptyState() { return this.page.getByText('No fee structures found'); }
  get paginationInfo() { return this.page.getByText(/showing|no fee structures/i); }

  // Dynamic elements
  row(id: string) { return this.page.getByTestId(`fee-structure-row-${id}`); }
  editBtn(id: string) { return this.page.getByTestId(`edit-btn-${id}`); }
  toggleBtn(id: string) { return this.page.getByTestId(`toggle-btn-${id}`); }
  actionsBtn(id: string) { return this.page.getByTestId(`actions-btn-${id}`); }

  async goto() {
    await this.navigateTo('/finance/structures');
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createButton.click();
    await this.page.waitForURL('**/finance/structures/new');
  }

  async getStructureCount(): Promise<number> {
    const rows = this.structuresTable.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    if (await this.emptyState.isVisible().catch(() => false)) {
      return 0;
    }
    return await rows.count();
  }

  async expectStructureInTable(name: string) {
    await expect(this.structuresTable.getByRole('cell', { name })).toBeVisible();
  }

  async clickEditStructure(name: string) {
    const row = this.structuresTable.getByRole('row', { name: new RegExp(name) });
    await row.getByRole('button').click(); // Actions dropdown
    await this.page.getByRole('menuitem', { name: /Edit/i }).click();
    await this.page.waitForURL(/\/finance\/structures\/[a-z0-9-]+$/);
  }

  async clickViewStructure(name: string) {
    const row = this.structuresTable.getByRole('row', { name: new RegExp(name) });
    await row.getByRole('link').first().click();
    await this.page.waitForURL(/\/finance\/structures\/[a-z0-9-]+$/);
  }
}

export class FeeStructureFormPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Form elements - using data-testid
  get form() { return this.page.getByTestId('fee-structure-form'); }
  get nameInput() { return this.page.getByTestId('input-name'); }
  get descriptionInput() { return this.page.getByRole('textbox', { name: /description/i }); }
  get amountInput() { return this.page.getByTestId('input-amount'); }
  get frequencySelect() { return this.page.getByTestId('select-frequency'); }
  get batchSelect() { return this.page.getByTestId('select-batch'); }
  get dueDayInput() { return this.page.getByTestId('input-due-day'); }
  get lateFeeAmountInput() { return this.page.getByTestId('input-late-fee-amount'); }
  get lateFeeAfterDaysInput() { return this.page.getByTestId('input-late-fee-days'); }
  get submitButton() { return this.page.getByTestId('submit-btn'); }
  get cancelButton() { return this.page.getByTestId('cancel-btn'); }

  async goto() {
    await this.navigateTo('/finance/structures/new');
    await this.nameInput.waitFor({ state: 'visible' });
  }

  async fillForm(data: {
    name: string;
    description?: string;
    amount: number;
    frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
    dueDay?: number;
    lateFeeAmount?: number;
    lateFeeAfterDays?: number;
  }) {
    await this.nameInput.fill(data.name);
    if (data.description) await this.descriptionInput.fill(data.description);
    await this.amountInput.fill(String(data.amount));

    await this.frequencySelect.click();
    const frequencyLabels: Record<string, string> = {
      'ONE_TIME': 'One Time',
      'MONTHLY': 'Monthly',
      'QUARTERLY': 'Quarterly',
      'HALF_YEARLY': 'Half Yearly',
      'YEARLY': 'Yearly',
    };
    await this.page.getByRole('option', { name: frequencyLabels[data.frequency] }).click();

    if (data.dueDay) await this.dueDayInput.fill(String(data.dueDay));
    if (data.lateFeeAmount) await this.lateFeeAmountInput.fill(String(data.lateFeeAmount));
    if (data.lateFeeAfterDays) await this.lateFeeAfterDaysInput.fill(String(data.lateFeeAfterDays));
  }

  async submit() {
    await this.submitButton.click();
    await this.page.waitForURL('**/finance/structures', { timeout: 10000 });
  }
}

export class PaymentsListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements - using data-testid
  get pageContainer() { return this.page.getByTestId('payments-page'); }
  get searchInput() { return this.page.getByTestId('search-input'); }
  get methodFilter() { return this.page.getByTestId('filter-method'); }
  get statusFilter() { return this.page.getByTestId('filter-status'); }
  get sourceFilter() { return this.page.getByTestId('filter-source'); }
  get startDateInput() { return this.page.getByTestId('filter-start-date'); }
  get endDateInput() { return this.page.getByTestId('filter-end-date'); }
  get paymentsTable() { return this.page.getByTestId('payments-table'); }
  get exportButton() { return this.page.getByTestId('export-btn'); }
  get paginationInfo() { return this.page.getByText(/showing|no payments/i); }

  // Dynamic elements
  row(id: string) { return this.page.getByTestId(`payment-row-${id}`); }
  receiptLink(id: string) { return this.page.getByTestId(`receipt-link-${id}`); }
  voidBtn(id: string) { return this.page.getByTestId(`void-btn-${id}`); }
  actionsBtn(id: string) { return this.page.getByTestId(`actions-btn-${id}`); }

  async goto() {
    await this.navigateTo('/finance/payments');
    await this.page.waitForLoadState('networkidle');
  }

  async getPaymentCount(): Promise<number> {
    const rows = this.paymentsTable.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    const emptyState = this.page.getByText('No payments found');
    if (await emptyState.isVisible().catch(() => false)) {
      return 0;
    }
    return await rows.count();
  }

  async searchPayments(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByMethod(method: string) {
    await this.methodFilter.click();
    await this.page.getByRole('option', { name: method }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickReceipt(receiptNumber: string) {
    await this.paymentsTable.getByText(receiptNumber).click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async expectPaymentInTable(studentName: string) {
    await expect(this.paymentsTable.getByRole('cell', { name: new RegExp(studentName) })).toBeVisible();
  }
}

export class StudentFeesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Summary Cards - using data-testid
  get totalFeesCard() { return this.page.getByTestId('summary-total'); }
  get paidCard() { return this.page.getByTestId('summary-paid'); }
  get pendingCard() { return this.page.getByTestId('summary-pending'); }
  get overdueCard() { return this.page.getByTestId('summary-overdue'); }

  // Tables
  get feesTable() { return this.page.getByTestId('fees-table'); }
  get paymentsTable() { return this.page.getByTestId('payments-table'); }

  // Actions
  get recordPaymentButton() { return this.page.getByTestId('record-payment-btn'); }
  get assignFeeButton() { return this.page.getByTestId('assign-fee-btn'); }

  // Dynamic elements
  feeRow(id: string) { return this.page.getByTestId(`fee-row-${id}`); }
  waiveBtn(id: string) { return this.page.getByTestId(`waive-btn-${id}`); }
  actionsBtn(id: string) { return this.page.getByTestId(`actions-btn-${id}`); }

  async goto(studentId: string) {
    await this.navigateTo(`/students/${studentId}/fees`);
    await this.page.waitForLoadState('networkidle');
  }

  async getTotalFees(): Promise<string> {
    const amount = await this.totalFeesCard.locator('p').filter({ hasText: /₹/ }).textContent();
    return amount || '₹0';
  }

  async clickRecordPayment() {
    await this.recordPaymentButton.click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async clickAssignFee() {
    await this.assignFeeButton.click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async getFeeCount(): Promise<number> {
    const rows = this.feesTable.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    const emptyState = this.page.getByText('No fees assigned');
    if (await emptyState.isVisible().catch(() => false)) {
      return 0;
    }
    return await rows.count();
  }

  async clickWaiveFee(feeName: string) {
    const row = this.feesTable.getByRole('row', { name: new RegExp(feeName) });
    await row.getByRole('button').click(); // Actions dropdown
    await this.page.getByRole('menuitem', { name: /Waive/i }).click();
    await this.page.getByRole('alertdialog').waitFor({ state: 'visible' });
  }

  async expectFeeInTable(name: string) {
    await expect(this.feesTable.getByRole('cell', { name })).toBeVisible();
  }
}

export class RecordPaymentDialog {
  constructor(private page: Page) {}

  // Dialog elements - using data-testid
  get dialog() { return this.page.getByTestId('record-payment-dialog'); }
  get feeSelect() { return this.page.getByTestId('select-fee'); }
  get amountInput() { return this.page.getByTestId('input-amount'); }
  get methodSelect() { return this.page.getByTestId('select-method'); }
  get referenceInput() { return this.page.getByTestId('input-reference'); }
  get dateInput() { return this.page.getByTestId('input-date'); }
  get notesInput() { return this.page.getByTestId('input-notes'); }
  get submitButton() { return this.page.getByTestId('submit-payment-btn'); }
  get cancelButton() { return this.page.getByRole('button', { name: /cancel/i }); }

  // Success state
  get successView() { return this.page.getByTestId('payment-success'); }
  get receiptNumber() { return this.page.getByTestId('receipt-number'); }

  async fillForm(data: {
    amount: number;
    method: 'CASH' | 'UPI_MANUAL' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';
    reference?: string;
    notes?: string;
  }) {
    await this.amountInput.fill(String(data.amount));

    await this.methodSelect.click();
    const methodLabels: Record<string, string> = {
      'CASH': 'Cash',
      'UPI_MANUAL': 'UPI',
      'BANK_TRANSFER': 'Bank Transfer',
      'CHEQUE': 'Cheque',
      'CARD': 'Card',
    };
    await this.page.getByRole('option', { name: methodLabels[data.method] }).click();

    if (data.reference) await this.referenceInput.fill(data.reference);
    if (data.notes) await this.notesInput.fill(data.notes);
  }

  async submit() {
    await this.submitButton.click();
    // Wait for either success view or dialog to close
    await Promise.race([
      this.successView.waitFor({ state: 'visible', timeout: 10000 }),
      this.dialog.waitFor({ state: 'hidden', timeout: 10000 }),
    ]);
  }
}

export class AssignFeeDialog {
  constructor(private page: Page) {}

  // Dialog elements - using data-testid
  get dialog() { return this.page.getByTestId('assign-fee-dialog'); }
  get feeStructureSelect() { return this.page.getByTestId('select-structure'); }
  get manualToggle() { return this.page.getByTestId('toggle-manual'); }
  get feeNameInput() { return this.page.getByTestId('input-fee-name'); }
  get feeAmountInput() { return this.page.getByTestId('input-fee-amount'); }
  get discountInput() { return this.page.getByTestId('input-discount'); }
  get discountReasonInput() { return this.page.getByTestId('input-discount-reason'); }
  get dueDateInput() { return this.page.getByTestId('input-due-date'); }
  get submitButton() { return this.page.getByTestId('submit-assign-btn'); }
  get cancelButton() { return this.page.getByRole('button', { name: /cancel/i }); }

  async selectFeeStructure(name: string) {
    await this.feeStructureSelect.click();
    await this.page.getByRole('option', { name: new RegExp(name) }).click();
  }

  async setDueDate(date: string) {
    await this.dueDateInput.fill(date);
  }

  async submit() {
    await this.submitButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

export class ReceiptModal {
  constructor(private page: Page) {}

  // Modal elements - using data-testid
  get modal() { return this.page.getByTestId('receipt-modal'); }
  get content() { return this.page.getByTestId('receipt-content'); }
  get receiptNumber() { return this.page.getByTestId('receipt-number'); }
  get studentName() { return this.page.getByTestId('receipt-student'); }
  get amount() { return this.page.getByTestId('receipt-amount'); }
  get method() { return this.page.getByTestId('receipt-method'); }
  get printButton() { return this.page.getByTestId('print-btn'); }
  get closeButton() { return this.page.getByTestId('close-btn'); }

  async expectVisible() {
    await expect(this.modal).toBeVisible();
    await expect(this.receiptNumber).toBeVisible();
  }

  async close() {
    await this.closeButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}

export class PaymentSettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Form - using data-testid
  get form() { return this.page.getByTestId('payment-settings-form'); }

  // UPI Section
  get upiIdInput() { return this.page.getByTestId('input-upi-id'); }
  get upiQrInput() { return this.page.getByTestId('input-upi-qr'); }

  // Bank Section
  get bankAccountNameInput() { return this.page.getByTestId('input-account-name'); }
  get bankAccountNumberInput() { return this.page.getByTestId('input-bank-account'); }
  get bankIfscInput() { return this.page.getByTestId('input-bank-ifsc'); }
  get bankNameInput() { return this.page.getByTestId('input-bank-name'); }

  // Razorpay Section
  get razorpayToggle() { return this.page.getByTestId('toggle-razorpay'); }
  get razorpayKeyIdInput() { return this.page.getByTestId('input-razorpay-key'); }
  get razorpayKeySecretInput() { return this.page.getByTestId('input-razorpay-secret'); }

  // AutoPay Section
  get autopayToggle() { return this.page.getByTestId('toggle-autopay'); }
  get maxMandateAmountInput() { return this.page.getByTestId('input-max-mandate'); }

  // Actions
  get saveButton() { return this.page.getByTestId('save-settings-btn'); }

  async goto() {
    await this.navigateTo('/settings/payments');
    await this.page.waitForLoadState('networkidle');
  }

  async updateUpiId(upiId: string) {
    await this.upiIdInput.fill(upiId);
  }

  async updateBankDetails(data: {
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  }) {
    if (data.accountName) await this.bankAccountNameInput.fill(data.accountName);
    if (data.accountNumber) await this.bankAccountNumberInput.fill(data.accountNumber);
    if (data.ifsc) await this.bankIfscInput.fill(data.ifsc);
    if (data.bankName) await this.bankNameInput.fill(data.bankName);
  }

  async save() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getUpiId(): Promise<string> {
    return await this.upiIdInput.inputValue();
  }
}
