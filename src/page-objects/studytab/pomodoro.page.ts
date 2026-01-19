import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class PomodoroPage extends BasePage {
  // Timer display
  readonly timerDisplay: Locator;
  readonly sessionType: Locator;

  // Control buttons
  readonly resetButton: Locator;
  readonly startButton: Locator;
  readonly pauseButton: Locator;
  readonly skipButton: Locator;
  readonly settingsButton: Locator;

  // Settings panel
  readonly settingsPanel: Locator;
  readonly settingsHeading: Locator;
  readonly workDurationInput: Locator;
  readonly shortBreakInput: Locator;
  readonly longBreakInput: Locator;
  readonly sessionsUntilLongBreak: Locator;
  readonly soundEnabledSwitch: Locator;
  readonly soundTypeSelect: Locator;
  readonly testSoundButton: Locator;
  readonly autoStartBreaksSwitch: Locator;
  readonly autoStartWorkSwitch: Locator;
  readonly settingsCancelButton: Locator;
  readonly settingsSaveButton: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);

    // Timer display - the time and session type are siblings under the timer container
    // Use heading to anchor to the Pomodoro Timer section
    const pomodoroSection = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Pomodoro Timer' }) });
    this.timerDisplay = pomodoroSection.getByText(/^\d{2}:\d{2}$/);
    this.sessionType = pomodoroSection.getByText(/^(Focus|Short Break|Long Break)$/);

    // Control buttons
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.startButton = page.getByRole('button', { name: 'Start' });
    this.pauseButton = page.getByRole('button', { name: 'Pause' });
    this.skipButton = page.getByRole('button', { name: 'Skip' });
    this.settingsButton = page.getByRole('button', { name: 'Settings' });

    // Settings panel
    this.settingsPanel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Pomodoro Settings' }) });
    this.settingsHeading = page.getByRole('heading', { name: 'Pomodoro Settings' });
    this.workDurationInput = page.getByRole('spinbutton', { name: 'Work (minutes)' });
    this.shortBreakInput = page.getByRole('spinbutton', { name: 'Short Break (min)' });
    this.longBreakInput = page.getByRole('spinbutton', { name: 'Long Break (min)' });
    this.sessionsUntilLongBreak = page.getByRole('spinbutton', { name: 'Until Long Break' });
    this.soundEnabledSwitch = page.getByText('Sound Enabled').locator('..').getByRole('switch');
    this.soundTypeSelect = page.getByRole('combobox', { name: 'Sound Type' });
    this.testSoundButton = page.getByRole('button', { name: 'Test Sound' });
    this.autoStartBreaksSwitch = page.getByText('Auto-start Breaks').locator('..').getByRole('switch');
    this.autoStartWorkSwitch = page.getByText('Auto-start Work Sessions').locator('..').getByRole('switch');
    this.settingsCancelButton = page.getByRole('button', { name: 'Cancel' });
    this.settingsSaveButton = page.getByRole('button', { name: 'Save' });
  }

  async goto() {
    await super.goto('/study');
    await this.timerDisplay.waitFor({ state: 'visible' });
  }

  async expectLoaded() {
    await expect(this.timerDisplay).toBeVisible();
    await expect(this.sessionType).toBeVisible();
    await expect(this.startButton).toBeVisible();
  }

  async getTimeRemaining(): Promise<string> {
    return (await this.timerDisplay.textContent()) || '00:00';
  }

  async getTimeInSeconds(): Promise<number> {
    const time = await this.getTimeRemaining();
    const parts = time.split(':');
    if (parts.length === 2) {
      const [minutes, seconds] = parts.map(Number);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  async getSessionType(): Promise<string> {
    return (await this.sessionType.textContent()) || '';
  }

  async start() {
    await this.startButton.click();
    // Wait for pause button to appear (indicates timer started)
    await this.pauseButton.waitFor({ state: 'visible', timeout: 2000 });
  }

  async pause() {
    await this.pauseButton.click();
    // Wait for start button to appear (indicates timer paused)
    await this.startButton.waitFor({ state: 'visible', timeout: 2000 });
  }

  async reset() {
    await this.resetButton.click();
  }

  async skip() {
    await this.skipButton.click();
  }

  async isRunning(): Promise<boolean> {
    return await this.pauseButton.isVisible();
  }

  async isPaused(): Promise<boolean> {
    const startVisible = await this.startButton.isVisible();
    const time = await this.getTimeInSeconds();
    // Paused if start button is visible and time is less than full duration
    return startVisible && time < 25 * 60;
  }

  async waitForTimerChange(initialTime: string, timeout: number = 5000) {
    await expect(async () => {
      const current = await this.getTimeRemaining();
      expect(current).not.toBe(initialTime);
    }).toPass({ timeout });
  }

  async openSettings() {
    await this.settingsButton.click();
    await this.settingsHeading.waitFor({ state: 'visible' });
  }

  async closeSettings() {
    await this.settingsCancelButton.click();
    await this.settingsHeading.waitFor({ state: 'hidden' });
  }

  async saveSettings() {
    await this.settingsSaveButton.click();
    // Wait for panel to close or timeout after 3 seconds
    try {
      await this.settingsHeading.waitFor({ state: 'hidden', timeout: 3000 });
    } catch {
      // If panel didn't close after Save, press Escape to close it
      // (Cancel button would undo the save)
      await this.page.keyboard.press('Escape');
      try {
        await this.settingsHeading.waitFor({ state: 'hidden', timeout: 2000 });
      } catch {
        // If Escape doesn't work, click backdrop to close
        await this.page.locator('div.fixed.inset-0.z-50').click({ position: { x: 10, y: 10 } });
        await this.settingsHeading.waitFor({ state: 'hidden', timeout: 2000 });
      }
    }
  }

  async setWorkDuration(minutes: number) {
    await this.workDurationInput.clear();
    await this.workDurationInput.fill(String(minutes));
  }

  async setShortBreakDuration(minutes: number) {
    await this.shortBreakInput.clear();
    await this.shortBreakInput.fill(String(minutes));
  }

  async setLongBreakDuration(minutes: number) {
    await this.longBreakInput.clear();
    await this.longBreakInput.fill(String(minutes));
  }

  async setSessionsUntilLongBreak(sessions: number) {
    await this.sessionsUntilLongBreak.clear();
    await this.sessionsUntilLongBreak.fill(String(sessions));
  }

  async toggleSoundEnabled() {
    await this.soundEnabledSwitch.click();
  }

  async selectSoundType(type: 'Bell' | 'Chime' | 'Digital' | 'None') {
    // Select values are lowercase in the app
    await this.soundTypeSelect.selectOption(type.toLowerCase());
  }

  async toggleAutoStartBreaks() {
    await this.autoStartBreaksSwitch.click();
  }

  async toggleAutoStartWork() {
    await this.autoStartWorkSwitch.click();
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }
}
