import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ProfilePage extends BasePage {
  readonly heading: Locator;
  readonly avatarButton: Locator;
  readonly avatarHint: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly timezoneSelect: Locator;
  readonly bioInput: Locator;
  readonly saveButton: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.heading = page.getByRole('heading', { name: 'Profile Settings' });
    this.avatarButton = page.locator('main').getByRole('button').filter({ hasText: /^[A-Z]{1,2}$/ }).first();
    this.avatarHint = page.getByText('Click avatar to change');
    this.nameInput = page.getByRole('textbox', { name: 'Your name' });
    // Email field is a disabled textbox
    this.emailInput = page.locator('input[type="email"]');
    this.timezoneSelect = page.locator('main').getByRole('combobox');
    this.bioInput = page.getByPlaceholder('Tell us about yourself...');
    this.saveButton = page.getByRole('button', { name: 'Save Changes' });
    this.signOutButton = page.getByRole('button', { name: 'Sign Out' });
  }

  async goto() {
    await super.goto('/profile');
    await this.heading.waitFor({ state: 'visible' });
    await this.nameInput.waitFor({ state: 'visible' });
    // Wait for form data to load
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.saveButton).toBeVisible();
  }

  async getName(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  async getEmail(): Promise<string> {
    await this.emailInput.waitFor({ state: 'visible' });
    return await this.emailInput.inputValue();
  }

  async getTimezone(): Promise<string> {
    return await this.timezoneSelect.inputValue();
  }

  async getBio(): Promise<string> {
    return await this.bioInput.inputValue();
  }

  async updateName(name: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  async updateBio(bio: string) {
    await this.bioInput.clear();
    await this.bioInput.fill(bio);
  }

  async selectTimezone(timezone: string) {
    await this.timezoneSelect.selectOption({ label: timezone });
  }

  async saveChanges() {
    await this.saveButton.click();
  }

  async updateProfile(options: { name?: string; bio?: string; timezone?: string }) {
    if (options.name !== undefined) {
      await this.updateName(options.name);
    }
    if (options.bio !== undefined) {
      await this.updateBio(options.bio);
    }
    if (options.timezone !== undefined) {
      await this.selectTimezone(options.timezone);
    }
    await this.saveChanges();
  }

  async expectEmailDisabled() {
    await expect(this.emailInput).toBeDisabled();
  }

  async signOut() {
    await this.signOutButton.click();
    await this.page.waitForURL('**/login**');
  }
}
