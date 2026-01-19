import { Page, Locator } from '@playwright/test';

export class FormComponent {
  readonly page: Page;
  readonly form: Locator;

  constructor(page: Page, formSelector: string = 'form') {
    this.page = page;
    this.form = page.locator(formSelector).first();
  }

  /**
   * Get input by label text
   */
  getInputByLabel(label: string): Locator {
    return this.page.locator(`label:has-text("${label}") + input, label:has-text("${label}") input, input[aria-label="${label}"]`).first();
  }

  /**
   * Get input by name attribute
   */
  getInputByName(name: string): Locator {
    return this.form.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`).first();
  }

  /**
   * Get input by test ID
   */
  getInputByTestId(testId: string): Locator {
    return this.form.locator(`[data-testid="${testId}"]`).first();
  }

  /**
   * Fill form field
   */
  async fillField(nameOrLabel: string, value: string) {
    const input = this.getInputByName(nameOrLabel).or(this.getInputByLabel(nameOrLabel));
    await input.fill(value);
  }

  /**
   * Fill multiple form fields
   */
  async fillFields(fields: Record<string, string>) {
    for (const [name, value] of Object.entries(fields)) {
      await this.fillField(name, value);
    }
  }

  /**
   * Submit the form
   */
  async submit() {
    const submitButton = this.form.locator('button[type="submit"], input[type="submit"]').first();
    await submitButton.click();
  }

  /**
   * Get validation error for a field
   */
  async getFieldError(fieldName: string): Promise<string | null> {
    const errorSelector = `[data-testid="${fieldName}-error"], [id="${fieldName}-error"], .error-${fieldName}`;
    const error = this.form.locator(errorSelector).first();
    if (await error.isVisible()) {
      return await error.textContent();
    }
    return null;
  }

  /**
   * Check if form has any validation errors
   */
  async hasErrors(): Promise<boolean> {
    const errors = this.form.locator('[role="alert"], .error, .field-error, [data-error="true"]');
    return (await errors.count()) > 0;
  }

  /**
   * Get all form errors
   */
  async getAllErrors(): Promise<string[]> {
    const errors = this.form.locator('[role="alert"], .error, .field-error');
    return await errors.allTextContents();
  }

  /**
   * Check checkbox or radio
   */
  async check(nameOrLabel: string) {
    const input = this.getInputByName(nameOrLabel).or(this.getInputByLabel(nameOrLabel));
    await input.check();
  }

  /**
   * Select option from dropdown
   */
  async selectOption(nameOrLabel: string, value: string) {
    const select = this.form.locator(`select[name="${nameOrLabel}"], label:has-text("${nameOrLabel}") + select`).first();
    await select.selectOption(value);
  }
}
