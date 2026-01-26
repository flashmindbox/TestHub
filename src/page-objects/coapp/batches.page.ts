import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class BatchesPage extends BasePage {
  readonly addBatchButton: Locator;
  readonly batchCards: Locator;
  readonly emptyState: Locator;

  // Form fields
  readonly nameInput: Locator;
  readonly capacityInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addBatchButton = page.locator('[data-testid="add-batch-button"]');
    this.batchCards = page.locator('[data-testid="batch-card"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');

    this.nameInput = page.locator('input[name="name"]');
    this.capacityInput = page.locator('input[name="capacity"]');
    this.startDateInput = page.locator('input[name="startDate"]');
    this.endDateInput = page.locator('input[name="endDate"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.navigateTo('/batches');
  }

  async clickAddBatch() {
    await this.addBatchButton.click();
  }

  async fillBatchForm(data: {
    name: string;
    capacity: number;
    startDate?: string;
    endDate?: string;
  }) {
    await this.nameInput.fill(data.name);
    await this.capacityInput.fill(data.capacity.toString());
    if (data.startDate) await this.startDateInput.fill(data.startDate);
    if (data.endDate) await this.endDateInput.fill(data.endDate);
  }

  async submitForm() {
    await this.submitButton.click();
    await this.waitForLoad();
  }

  batchCard(name: string): Locator {
    return this.batchCards.filter({ hasText: name });
  }

  async getBatchCount(): Promise<number> {
    return this.batchCards.count();
  }
}
