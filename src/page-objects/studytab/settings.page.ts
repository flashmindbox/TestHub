import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class SettingsPage extends BasePage {
  readonly heading: Locator;
  readonly preferencesHeading: Locator;

  // Study Preferences
  readonly studyPreferencesHeading: Locator;
  readonly dailyGoalSlider: Locator;
  readonly dailyGoalValue: Locator;

  // Timezone
  readonly timezoneHeading: Locator;
  readonly timezoneSelect: Locator;
  readonly timezoneDescription: Locator;

  // Appearance
  readonly appearanceHeading: Locator;
  readonly lightThemeButton: Locator;
  readonly darkThemeButton: Locator;
  readonly animationsToggle: Locator;
  readonly animationsLabel: Locator;

  // Sounds
  readonly soundsHeading: Locator;
  readonly soundEffectsToggle: Locator;
  readonly soundEffectsLabel: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.heading = page.getByRole('heading', { name: 'Settings', level: 1 });
    this.preferencesHeading = page.getByRole('heading', { name: 'Preferences', level: 1 });

    // Study Preferences
    this.studyPreferencesHeading = page.getByRole('heading', { name: 'Study Preferences' });
    this.dailyGoalSlider = page.getByRole('slider');
    this.dailyGoalValue = page.getByText(/Daily Goal:/).locator('..').locator('span, div').filter({ hasText: /\d+ cards/ });

    // Timezone
    this.timezoneHeading = page.getByRole('heading', { name: 'Timezone' });
    this.timezoneSelect = page.getByRole('combobox', { name: 'Your Timezone' });
    this.timezoneDescription = page.getByText(/Controls when your daily study streak resets/);

    // Appearance
    this.appearanceHeading = page.getByRole('heading', { name: 'Appearance' });
    this.lightThemeButton = page.getByRole('button', { name: 'Light' });
    this.darkThemeButton = page.getByRole('button', { name: 'Dark' });
    this.animationsToggle = page.getByText('Animations').locator('..').locator('..').getByRole('button');
    this.animationsLabel = page.getByText('Animations').first();

    // Sounds
    this.soundsHeading = page.getByRole('heading', { name: 'Sounds' });
    this.soundEffectsToggle = page.getByText('Sound Effects').locator('..').locator('..').getByRole('button');
    this.soundEffectsLabel = page.getByText('Sound Effects').first();
  }

  async goto() {
    await super.goto('/settings');
    await this.preferencesHeading.waitFor({ state: 'visible' });
  }

  async expectLoaded() {
    await expect(this.preferencesHeading).toBeVisible();
    await expect(this.studyPreferencesHeading).toBeVisible();
    await expect(this.timezoneHeading).toBeVisible();
    await expect(this.appearanceHeading).toBeVisible();
    await expect(this.soundsHeading).toBeVisible();
  }

  async getDailyGoal(): Promise<number> {
    const value = await this.dailyGoalSlider.getAttribute('aria-valuenow');
    return parseInt(value || '20', 10);
  }

  async setDailyGoal(value: number) {
    await this.dailyGoalSlider.fill(String(value));
  }

  async getSelectedTimezone(): Promise<string> {
    return await this.timezoneSelect.inputValue();
  }

  async selectTimezone(timezone: string) {
    await this.timezoneSelect.selectOption({ label: timezone });
  }

  async selectLightTheme() {
    await this.lightThemeButton.click();
  }

  async selectDarkTheme() {
    await this.darkThemeButton.click();
  }

  async isLightThemeSelected(): Promise<boolean> {
    const classes = await this.lightThemeButton.getAttribute('class') || '';
    return classes.includes('active') || classes.includes('selected') || classes.includes('bg-');
  }

  async toggleAnimations() {
    await this.animationsToggle.click();
  }

  async toggleSoundEffects() {
    await this.soundEffectsToggle.click();
  }
}
