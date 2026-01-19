import { Page, Locator } from '@playwright/test';

export class ModalComponent {
  readonly page: Page;
  readonly modal: Locator;
  readonly overlay: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;
  readonly content: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[role="dialog"], [data-testid="modal"], .modal').first();
    this.overlay = page.locator('[data-testid="modal-overlay"], .modal-overlay, [aria-hidden="true"]').first();
    this.closeButton = this.modal.locator('[data-testid="modal-close"], button[aria-label="Close"], .close-button').first();
    this.title = this.modal.locator('[data-testid="modal-title"], h2, .modal-title').first();
    this.content = this.modal.locator('[data-testid="modal-content"], .modal-content, .modal-body').first();
    this.confirmButton = this.modal.locator('[data-testid="modal-confirm"], button:has-text("Confirm"), button:has-text("Save"), button:has-text("Yes")').first();
    this.cancelButton = this.modal.locator('[data-testid="modal-cancel"], button:has-text("Cancel"), button:has-text("No")').first();
  }

  /**
   * Wait for modal to be visible
   */
  async waitForOpen(timeout: number = 5000) {
    await this.modal.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for modal to be closed
   */
  async waitForClose(timeout: number = 5000) {
    await this.modal.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  /**
   * Close modal using X button
   */
  async close() {
    await this.closeButton.click();
    await this.waitForClose();
  }

  /**
   * Close modal by clicking overlay
   */
  async closeByOverlay() {
    await this.overlay.click({ position: { x: 10, y: 10 } });
    await this.waitForClose();
  }

  /**
   * Close modal by pressing Escape
   */
  async closeByEscape() {
    await this.page.keyboard.press('Escape');
    await this.waitForClose();
  }

  /**
   * Get modal title text
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  /**
   * Confirm modal action
   */
  async confirm() {
    await this.confirmButton.click();
  }

  /**
   * Cancel modal action
   */
  async cancel() {
    await this.cancelButton.click();
    await this.waitForClose();
  }

  /**
   * Confirm and wait for modal to close
   */
  async confirmAndClose() {
    await this.confirm();
    await this.waitForClose();
  }
}
