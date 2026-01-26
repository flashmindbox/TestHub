import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  readonly totalStudents: Locator;
  readonly totalBatches: Locator;
  readonly pendingFees: Locator;
  readonly recentInquiries: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    super(page);
    this.totalStudents = page.locator('[data-testid="stat-total-students"]');
    this.totalBatches = page.locator('[data-testid="stat-total-batches"]');
    this.pendingFees = page.locator('[data-testid="stat-pending-fees"]');
    this.recentInquiries = page.locator('[data-testid="recent-inquiries"]');
    this.quickActions = page.locator('[data-testid="quick-actions"]');
  }

  async goto() {
    await this.navigateTo('/dashboard');
  }

  async getStats() {
    return {
      students: await this.totalStudents.textContent(),
      batches: await this.totalBatches.textContent(),
      pendingFees: await this.pendingFees.textContent(),
    };
  }
}
