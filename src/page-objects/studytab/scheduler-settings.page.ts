import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export type SchedulerAlgorithm = 'FSRS' | 'SM-2';

export type RetentionPreset = 'relaxed' | 'balanced' | 'intense' | 'exam';

export type DailyLimitPreset = 'light' | 'moderate' | 'heavy';

export interface DeckOverride {
  deckName: string;
  algorithm?: SchedulerAlgorithm;
  retention?: number;
}

/**
 * Page object for Scheduler Settings section within Settings page.
 * Handles FSRS and SM-2 algorithm configuration, retention settings,
 * presets, daily limits, and per-deck overrides.
 */
export class SchedulerSettingsPage extends BasePage {
  // Main Settings Navigation
  readonly settingsHeading: Locator;
  readonly schedulerTab: Locator;
  readonly schedulerSection: Locator;

  // Algorithm Selection
  readonly algorithmHeading: Locator;
  readonly fsrsButton: Locator;
  readonly sm2Button: Locator;
  readonly currentAlgorithmBadge: Locator;
  readonly algorithmDescription: Locator;

  // Confirmation Modal
  readonly confirmationModal: Locator;
  readonly confirmationTitle: Locator;
  readonly confirmationMessage: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  // Retention Settings (FSRS)
  readonly retentionHeading: Locator;
  readonly retentionSlider: Locator;
  readonly retentionValue: Locator;
  readonly retentionDescription: Locator;

  // Retention Presets
  readonly presetsHeading: Locator;
  readonly relaxedPreset: Locator;
  readonly balancedPreset: Locator;
  readonly intensePreset: Locator;
  readonly examPreset: Locator;

  // Daily Limits
  readonly dailyLimitsHeading: Locator;
  readonly newCardsLimitInput: Locator;
  readonly reviewCardsLimitInput: Locator;

  // Daily Limit Quick Set Buttons
  readonly lightLimitButton: Locator;
  readonly moderateLimitButton: Locator;
  readonly heavyLimitButton: Locator;

  // Collapsible Sections
  readonly advancedSettingsToggle: Locator;
  readonly advancedSettingsPanel: Locator;
  readonly perDeckOverridesToggle: Locator;
  readonly perDeckOverridesPanel: Locator;

  // Per-Deck Overrides
  readonly deckOverridesHeading: Locator;
  readonly addOverrideButton: Locator;
  readonly overridesList: Locator;
  readonly deckSelectDropdown: Locator;
  readonly overrideAlgorithmSelect: Locator;
  readonly overrideRetentionSlider: Locator;
  readonly deleteOverrideButton: Locator;
  readonly saveOverrideButton: Locator;

  // SM-2 Specific Settings
  readonly learningStepsInput: Locator;
  readonly graduatingIntervalInput: Locator;
  readonly easyBonusInput: Locator;
  readonly startingEaseSlider: Locator;

  // FSRS Advanced Settings
  readonly stabilityInput: Locator;
  readonly difficultyInput: Locator;

  // Interval Preview
  readonly intervalPreviewSection: Locator;
  readonly againIntervalPreview: Locator;
  readonly hardIntervalPreview: Locator;
  readonly goodIntervalPreview: Locator;
  readonly easyIntervalPreview: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);

    // Main Settings Navigation - use main area heading (not banner)
    this.settingsHeading = page.getByRole('main').getByRole('heading', { name: 'Settings', level: 1 });
    this.schedulerTab = page.getByRole('button', { name: 'Scheduler' });
    this.schedulerSection = page.locator('[data-testid="scheduler-settings"], .scheduler-settings, section').filter({ hasText: /Scheduler|Algorithm/ });

    // Algorithm Selection - card/button style selectors
    this.algorithmHeading = page.getByRole('heading', { name: /Scheduling Algorithm/i });
    this.fsrsButton = page.getByRole('button', { name: /FSRS\s+Modern, AI-optimized/i });
    this.sm2Button = page.getByRole('button', { name: /SM-2\s+Classic Anki algorithm/i });
    this.currentAlgorithmBadge = page.locator('[data-testid="current-algorithm"], .algorithm-badge, .current-algorithm');
    this.algorithmDescription = page.getByText(/FSRS uses machine learning|SM-2 is the traditional/);

    // Confirmation Modal
    this.confirmationModal = page.getByRole('dialog').or(page.locator('[data-testid="confirmation-modal"], .modal, .dialog'));
    this.confirmationTitle = this.confirmationModal.getByRole('heading');
    this.confirmationMessage = this.confirmationModal.locator('.modal-body, .dialog-content, p');
    this.confirmButton = this.confirmationModal.getByRole('button', { name: /Confirm|Yes|Switch|Change/i });
    this.cancelButton = this.confirmationModal.getByRole('button', { name: /Cancel|No|Keep/i });

    // Retention Settings
    this.retentionHeading = page.getByRole('heading', { name: /FSRS Settings/i });
    this.retentionSlider = page.getByRole('slider', { name: /Desired Retention/i });
    this.retentionValue = page.locator('text=/\\d+%/').first();
    this.retentionDescription = page.getByText(/fewer reviews.*more reviews/i);

    // Retention Presets - Match by accessible name which includes full text
    this.presetsHeading = page.getByRole('heading', { name: /Quick Presets/i });
    this.relaxedPreset = page.getByRole('button', { name: /Relaxed.*80%/i });
    this.balancedPreset = page.getByRole('button', { name: /Balanced.*90%/i });
    this.intensePreset = page.getByRole('button', { name: /Intense.*95%/i });
    this.examPreset = page.getByRole('button', { name: /Exam.*Prep.*97%/i });

    // Daily Limits
    this.dailyLimitsHeading = page.getByRole('heading', { name: /Daily Limits/i });
    this.newCardsLimitInput = page.getByRole('spinbutton', { name: /New Cards \/ Day/i });
    this.reviewCardsLimitInput = page.getByRole('spinbutton', { name: /Reviews \/ Day/i });

    // Daily Limit Quick Set Buttons
    this.lightLimitButton = page.getByRole('button', { name: 'Light' });
    this.moderateLimitButton = page.getByRole('button', { name: 'Moderate' });
    this.heavyLimitButton = page.getByRole('button', { name: 'Heavy' });

    // Collapsible Sections
    this.advancedSettingsToggle = page.getByRole('button', { name: /Advanced Settings/i });
    this.advancedSettingsPanel = page.locator('[data-testid="advanced-settings"], .advanced-settings');
    this.perDeckOverridesToggle = page.getByRole('button', { name: /Per-Deck Overrides/i });
    this.perDeckOverridesPanel = page.locator('[data-testid="per-deck-overrides"], .per-deck-overrides');

    // Per-Deck Overrides
    this.deckOverridesHeading = page.getByRole('heading', { name: /Deck Overrides?|Per-Deck/i });
    this.addOverrideButton = page.getByRole('button', { name: /Add Override|Add Deck/i });
    this.overridesList = page.locator('[data-testid="overrides-list"], .overrides-list, .deck-overrides');
    this.deckSelectDropdown = page.getByRole('combobox', { name: /Select Deck|Deck/i });
    this.overrideAlgorithmSelect = page.locator('[data-testid="override-algorithm"], .override-algorithm select');
    this.overrideRetentionSlider = page.locator('[data-testid="override-retention"], .override-retention input[type="range"]');
    this.deleteOverrideButton = page.getByRole('button', { name: /Delete|Remove/i });
    this.saveOverrideButton = page.getByRole('button', { name: /Save/i });

    // SM-2 Specific Settings
    this.learningStepsInput = page.getByRole('textbox', { name: /Learning Steps/i });
    this.graduatingIntervalInput = page.getByRole('spinbutton', { name: /Graduating Interval/i });
    this.easyBonusInput = page.getByRole('spinbutton', { name: /Easy Bonus/i });
    this.startingEaseSlider = page.getByRole('slider', { name: /Starting Ease/i });

    // FSRS Advanced Settings
    this.stabilityInput = page.getByRole('spinbutton', { name: /Stability/i });
    this.difficultyInput = page.getByRole('spinbutton', { name: /Difficulty/i });

    // Interval Preview
    this.intervalPreviewSection = page.locator('[data-testid="interval-preview"], .interval-preview');
    this.againIntervalPreview = page.locator('[data-testid="again-interval"], .again-interval');
    this.hardIntervalPreview = page.locator('[data-testid="hard-interval"], .hard-interval');
    this.goodIntervalPreview = page.locator('[data-testid="good-interval"], .good-interval');
    this.easyIntervalPreview = page.locator('[data-testid="easy-interval"], .easy-interval');
  }

  /**
   * Navigate to Settings page and click on Scheduler tab
   */
  async goto() {
    await super.goto('/settings');
    // Wait for settings page to load (heading visible)
    await this.settingsHeading.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Navigate directly to scheduler settings section
   * Includes retry logic for intermittent API failures
   */
  async gotoSchedulerSettings() {
    await this.goto();

    // Ensure Scheduler tab is clicked and wait for content
    await this.schedulerTab.waitFor({ state: 'visible', timeout: 5000 });
    await this.schedulerTab.click();

    // Wait for scheduler content to load
    const algorithmHeading = this.page.getByRole('heading', { name: /Scheduling Algorithm/i });
    const schedulerSettingsHeading = this.page.getByRole('heading', { name: /Scheduler Settings/i });

    try {
      // Wait for either scheduler-specific heading
      await Promise.race([
        algorithmHeading.waitFor({ state: 'visible', timeout: 10000 }),
        schedulerSettingsHeading.waitFor({ state: 'visible', timeout: 10000 })
      ]);
    } catch {
      // Check for error state
      const errorHeading = this.page.getByRole('heading', { name: /Failed to load settings/i });
      if (await errorHeading.isVisible().catch(() => false)) {
        // Retry by refreshing
        await this.page.reload();
        await this.settingsHeading.waitFor({ state: 'visible', timeout: 15000 });
        await this.schedulerTab.click();
        await algorithmHeading.waitFor({ state: 'visible', timeout: 10000 });
      } else {
        // Click scheduler tab again in case it didn't register
        await this.schedulerTab.click();
        await algorithmHeading.waitFor({ state: 'visible', timeout: 10000 });
      }
    }
  }

  /**
   * Check if scheduler tab is visible in settings
   */
  async isSchedulerTabVisible(): Promise<boolean> {
    return await this.schedulerTab.isVisible();
  }

  /**
   * Get currently selected algorithm by checking which button is selected
   * Selection is indicated by border-primary bg-primary/5 CSS classes
   */
  async getSelectedAlgorithm(): Promise<SchedulerAlgorithm> {
    // Check if FSRS button has selected state (border-primary class)
    const fsrsClass = await this.fsrsButton.getAttribute('class') || '';
    const fsrsSelected = fsrsClass.includes('border-primary') && fsrsClass.includes('bg-primary');

    if (fsrsSelected) {
      return 'FSRS';
    }

    // Check if SM-2 button has selected state
    const sm2Class = await this.sm2Button.getAttribute('class') || '';
    const sm2Selected = sm2Class.includes('border-primary') && sm2Class.includes('bg-primary');

    if (sm2Selected) {
      return 'SM-2';
    }

    // Fallback: check which settings section is visible
    const fsrsSettingsVisible = await this.page.getByRole('heading', { name: /FSRS Settings/i }).isVisible();
    return fsrsSettingsVisible ? 'FSRS' : 'SM-2';
  }

  /**
   * Check if FSRS is selected
   */
  async isFSRSSelected(): Promise<boolean> {
    return (await this.getSelectedAlgorithm()) === 'FSRS';
  }

  /**
   * Check if SM-2 is selected
   */
  async isSM2Selected(): Promise<boolean> {
    return (await this.getSelectedAlgorithm()) === 'SM-2';
  }

  /**
   * Select FSRS algorithm
   */
  async selectFSRS() {
    await this.fsrsButton.click();
  }

  /**
   * Select SM-2 algorithm
   */
  async selectSM2() {
    await this.sm2Button.click();
  }

  /**
   * Select scheduling algorithm
   */
  async selectAlgorithm(algorithm: SchedulerAlgorithm) {
    if (algorithm === 'FSRS') {
      await this.selectFSRS();
    } else {
      await this.selectSM2();
    }
  }

  /**
   * Switch algorithm and handle confirmation modal if shown
   */
  async switchAlgorithm(algorithm: SchedulerAlgorithm, confirm: boolean = true) {
    const currentAlgorithm = await this.getSelectedAlgorithm();
    if (currentAlgorithm === algorithm) return;

    await this.selectAlgorithm(algorithm);

    // Wait for potential confirmation modal
    await this.page.waitForTimeout(500);
    if (await this.confirmationModal.isVisible()) {
      if (confirm) {
        await this.confirmButton.click();
      } else {
        await this.cancelButton.click();
      }
      await this.confirmationModal.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Check if confirmation modal is displayed
   */
  async isConfirmationModalVisible(): Promise<boolean> {
    return await this.confirmationModal.isVisible();
  }

  /**
   * Get current retention value (0-100 percentage)
   * Note: The slider internally uses decimals (0.7-0.97), we convert to percentage
   */
  async getRetentionValue(): Promise<number> {
    if (await this.retentionSlider.isVisible()) {
      // The slider uses decimal values like 0.9 for 90%
      const value = await this.retentionSlider.inputValue();
      const decimal = parseFloat(value || '0.9');
      return Math.round(decimal * 100);
    }
    if (await this.retentionValue.isVisible()) {
      const text = await this.getText(this.retentionValue);
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 90;
    }
    return 90; // Default retention
  }

  /**
   * Set retention value using slider (accepts 0-100 percentage)
   * Note: Converts percentage to decimal for the slider (e.g., 90 -> 0.9)
   */
  async setRetention(value: number) {
    await expect(this.retentionSlider).toBeVisible();
    // Convert percentage to decimal (e.g., 85 -> 0.85)
    const decimalValue = value / 100;
    await this.retentionSlider.fill(String(decimalValue));
    await this.page.waitForTimeout(200);
  }

  /**
   * Apply a retention preset
   */
  async applyRetentionPreset(preset: RetentionPreset) {
    const presetButton = {
      relaxed: this.relaxedPreset,
      balanced: this.balancedPreset,
      intense: this.intensePreset,
      exam: this.examPreset,
    }[preset];

    // Ensure button is visible and scroll to it
    await presetButton.scrollIntoViewIfNeeded();
    await expect(presetButton).toBeVisible();

    // Click with force to handle any overlapping elements
    await presetButton.click({ force: true });

    // Wait for the slider value to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Get expected retention for a preset
   */
  getPresetRetention(preset: RetentionPreset): number {
    const presetValues = {
      relaxed: 80,
      balanced: 90,
      intense: 95,
      exam: 97,
    };
    return presetValues[preset];
  }

  /**
   * Apply a daily limit preset
   */
  async applyDailyLimitPreset(preset: DailyLimitPreset) {
    const presetButton = {
      light: this.lightLimitButton,
      moderate: this.moderateLimitButton,
      heavy: this.heavyLimitButton,
    }[preset];

    await presetButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get new cards daily limit
   */
  async getNewCardsLimit(): Promise<number> {
    const value = await this.newCardsLimitInput.inputValue();
    return parseInt(value || '20', 10);
  }

  /**
   * Set new cards daily limit
   */
  async setNewCardsLimit(value: number) {
    await this.newCardsLimitInput.fill(String(value));
  }

  /**
   * Get review cards daily limit
   */
  async getReviewCardsLimit(): Promise<number> {
    const value = await this.reviewCardsLimitInput.inputValue();
    return parseInt(value || '100', 10);
  }

  /**
   * Set review cards daily limit
   */
  async setReviewCardsLimit(value: number) {
    await this.reviewCardsLimitInput.fill(String(value));
  }

  /**
   * Toggle advanced settings panel
   */
  async toggleAdvancedSettings() {
    await this.advancedSettingsToggle.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if advanced settings panel is expanded
   * Note: No aria-expanded attribute, so check for content visibility
   */
  async isAdvancedSettingsExpanded(): Promise<boolean> {
    // Check if content inside advanced settings is visible
    const leechHeading = this.page.getByRole('heading', { name: /Leech Handling/i });
    return await leechHeading.isVisible();
  }

  /**
   * Toggle per-deck overrides panel
   */
  async togglePerDeckOverrides() {
    await this.perDeckOverridesToggle.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if per-deck overrides panel is expanded
   * Note: No aria-expanded attribute, so check for content visibility
   */
  async isPerDeckOverridesExpanded(): Promise<boolean> {
    // Check if description paragraph inside per-deck overrides is visible
    const description = this.page.getByText(/Override global settings for specific decks/i);
    return await description.isVisible();
  }

  /**
   * Add a per-deck override
   */
  async addDeckOverride(override: DeckOverride) {
    // Ensure per-deck overrides section is expanded
    if (!(await this.isPerDeckOverridesExpanded())) {
      await this.togglePerDeckOverrides();
    }

    await this.addOverrideButton.click();
    await this.deckSelectDropdown.waitFor({ state: 'visible' });

    // Select deck
    await this.deckSelectDropdown.selectOption({ label: override.deckName });

    // Set algorithm if specified
    if (override.algorithm && await this.overrideAlgorithmSelect.isVisible()) {
      await this.overrideAlgorithmSelect.selectOption(override.algorithm);
    }

    // Set retention if specified
    if (override.retention && await this.overrideRetentionSlider.isVisible()) {
      await this.overrideRetentionSlider.fill(String(override.retention));
    }

    // Save the override
    if (await this.saveOverrideButton.isVisible()) {
      await this.saveOverrideButton.click();
    }
  }

  /**
   * Get list of deck overrides
   */
  async getDeckOverrides(): Promise<string[]> {
    // Ensure per-deck overrides section is expanded
    if (!(await this.isPerDeckOverridesExpanded())) {
      await this.togglePerDeckOverrides();
    }

    const overrideItems = this.overridesList.locator('[data-testid="override-item"], .override-item, li');
    const count = await overrideItems.count();
    const deckNames: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await overrideItems.nth(i).textContent();
      if (text) deckNames.push(text.trim());
    }

    return deckNames;
  }

  /**
   * Delete a deck override by deck name
   */
  async deleteDeckOverride(deckName: string) {
    // Ensure per-deck overrides section is expanded
    if (!(await this.isPerDeckOverridesExpanded())) {
      await this.togglePerDeckOverrides();
    }

    const overrideItem = this.overridesList.locator(`[data-testid="override-item"], .override-item, li`).filter({ hasText: deckName });
    await overrideItem.locator(this.deleteOverrideButton).click();

    // Handle confirmation if present
    await this.page.waitForTimeout(300);
    if (await this.confirmationModal.isVisible()) {
      await this.confirmButton.click();
    }
  }

  /**
   * Check if a deck has an override configured
   */
  async hasDeckOverride(deckName: string): Promise<boolean> {
    const overrides = await this.getDeckOverrides();
    return overrides.some(o => o.includes(deckName));
  }

  // ============================================================
  // SM-2 Specific Methods
  // ============================================================

  /**
   * Check if SM-2 settings are visible
   */
  async areSM2SettingsVisible(): Promise<boolean> {
    return await this.learningStepsInput.isVisible();
  }

  /**
   * Get learning steps value
   */
  async getLearningSteps(): Promise<string> {
    return await this.learningStepsInput.inputValue();
  }

  /**
   * Set learning steps (e.g., "1m 10m" for 1 minute, 10 minutes)
   */
  async setLearningSteps(value: string) {
    await this.learningStepsInput.fill(value);
  }

  /**
   * Get graduating interval (days)
   */
  async getGraduatingInterval(): Promise<number> {
    const value = await this.graduatingIntervalInput.inputValue();
    return parseInt(value || '1', 10);
  }

  /**
   * Set graduating interval (days)
   */
  async setGraduatingInterval(value: number) {
    await this.graduatingIntervalInput.fill(String(value));
  }

  /**
   * Get easy bonus multiplier
   */
  async getEasyBonus(): Promise<number> {
    const value = await this.easyBonusInput.inputValue();
    return parseFloat(value || '1.3');
  }

  /**
   * Set easy bonus multiplier
   */
  async setEasyBonus(value: number) {
    await this.easyBonusInput.fill(String(value));
  }

  /**
   * Get starting ease percentage
   */
  async getStartingEase(): Promise<number> {
    const value = await this.startingEaseSlider.getAttribute('aria-valuenow');
    return parseInt(value || '250', 10);
  }

  /**
   * Set starting ease percentage
   */
  async setStartingEase(value: number) {
    await this.startingEaseSlider.fill(String(value));
  }

  // ============================================================
  // Interval Preview Methods
  // ============================================================

  /**
   * Get interval preview values
   */
  async getIntervalPreviews(): Promise<{ again: string; hard: string; good: string; easy: string }> {
    return {
      again: await this.getText(this.againIntervalPreview),
      hard: await this.getText(this.hardIntervalPreview),
      good: await this.getText(this.goodIntervalPreview),
      easy: await this.getText(this.easyIntervalPreview),
    };
  }

  /**
   * Check if interval preview section is visible
   */
  async isIntervalPreviewVisible(): Promise<boolean> {
    return await this.intervalPreviewSection.isVisible();
  }

  // ============================================================
  // Validation and Assertion Methods
  // ============================================================

  /**
   * Check if FSRS is available (might be feature flagged)
   */
  async isFSRSAvailable(): Promise<boolean> {
    return await this.fsrsButton.isVisible();
  }

  /**
   * Expect scheduler settings to be loaded
   */
  async expectLoaded() {
    await expect(this.fsrsButton.or(this.sm2Button)).toBeVisible();
  }

  /**
   * Expect FSRS to be the default/selected algorithm
   */
  async expectFSRSSelected() {
    const algorithm = await this.getSelectedAlgorithm();
    expect(algorithm).toBe('FSRS');
  }

  /**
   * Expect SM-2 to be the selected algorithm
   */
  async expectSM2Selected() {
    const algorithm = await this.getSelectedAlgorithm();
    expect(algorithm).toBe('SM-2');
  }

  /**
   * Expect SM-2 settings to be visible
   */
  async expectSM2SettingsVisible() {
    await expect(this.learningStepsInput).toBeVisible();
    await expect(this.graduatingIntervalInput).toBeVisible();
    await expect(this.startingEaseSlider).toBeVisible();
  }

  /**
   * Expect FSRS settings to be visible (retention slider)
   */
  async expectFSRSSettingsVisible() {
    await expect(this.retentionSlider).toBeVisible();
  }
}
