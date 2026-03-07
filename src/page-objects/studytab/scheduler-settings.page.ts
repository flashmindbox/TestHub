import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export type SchedulerAlgorithm = 'FSRS' | 'SM-2';

export type StudyModeName = 'balanced' | 'intensive' | 'relaxed' | 'language';

export type DailyLimitPreset = 'light' | 'moderate' | 'heavy';

export interface DeckOverride {
  deckName: string;
  preset?: string;
}

/**
 * Page object for Scheduler Settings section within Settings page.
 *
 * Design System v2 (March 2026) redesigned this page:
 * - Algorithm/retention/limits are now controlled via Study Mode cards
 * - Direct algorithm buttons, retention slider, and daily limit inputs removed
 * - Advanced settings and per-deck overrides are embedded (not collapsible)
 * - Schedule Preview shows current algorithm + retention info
 */
export class SchedulerSettingsPage extends BasePage {
  // Main Settings Navigation
  readonly settingsHeading: Locator;
  readonly schedulerTab: Locator;

  // Scheduler Settings Header
  readonly schedulerSettingsHeading: Locator;
  readonly howItWorksButton: Locator;

  // Study Mode Selector
  readonly studyModeHeading: Locator;
  readonly balancedModeButton: Locator;
  readonly intensiveModeButton: Locator;
  readonly relaxedModeButton: Locator;
  readonly languageModeButton: Locator;
  readonly createCustomModeButton: Locator;

  // Schedule Preview
  readonly schedulePreviewHeading: Locator;
  readonly schedulePreviewAlgorithmInfo: Locator;

  // Per-Deck Overrides (embedded in right column)
  readonly perDeckOverridesHeading: Locator;
  readonly perDeckOverridesDescription: Locator;

  // Advanced Options (embedded, full width)
  readonly advancedOptionsHeading: Locator;
  readonly leechHandlingHeading: Locator;
  readonly leechThresholdInput: Locator;
  readonly leechActionSelect: Locator;
  readonly showIntervalToggle: Locator;
  readonly dayStartHourSelect: Locator;

  // Wizard dialog
  readonly wizardDialog: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);

    // Main Settings Navigation
    this.settingsHeading = page.getByRole('heading', { name: 'Settings', level: 1 });
    this.schedulerTab = page.getByRole('button', { name: 'Scheduler' });

    // Scheduler Settings Header (h2 in the scheduler tab content)
    this.schedulerSettingsHeading = page.getByRole('heading', { name: /Scheduler Settings/i });
    this.howItWorksButton = page.getByRole('link', { name: /How it works/i })
      .or(page.getByText(/How it works/i));

    // Study Mode Selector
    this.studyModeHeading = page.getByRole('heading', { name: /Study Mode/i });
    this.balancedModeButton = page.getByRole('button', { name: /Balanced/i }).filter({ hasText: /Best for most users/i });
    this.intensiveModeButton = page.getByRole('button', { name: /Intensive/i }).filter({ hasText: /Learn faster/i });
    this.relaxedModeButton = page.getByRole('button', { name: /Relaxed/i }).filter({ hasText: /Gentle pace/i });
    this.languageModeButton = page.getByRole('button', { name: /Language Learning/i }).filter({ hasText: /vocabulary/i });
    this.createCustomModeButton = page.getByRole('button', { name: /Create Custom Mode/i });

    // Schedule Preview
    this.schedulePreviewHeading = page.getByRole('heading', { name: /Schedule Preview/i });
    this.schedulePreviewAlgorithmInfo = page.getByText(/Algorithm:/i);

    // Per-Deck Overrides (embedded)
    this.perDeckOverridesHeading = page.getByRole('heading', { name: /Per-Deck Overrides/i });
    this.perDeckOverridesDescription = page.getByText(/Select a preset for each deck/i);

    // Advanced Options (embedded)
    this.advancedOptionsHeading = page.getByRole('heading', { name: /Advanced Options/i });
    this.leechHandlingHeading = page.getByText(/Leech Handling/i);
    this.leechThresholdInput = page.locator('#leech-threshold');
    this.leechActionSelect = page.locator('#leech-action');
    this.showIntervalToggle = page.getByRole('switch', { name: /Show Intervals on Buttons/i })
      .or(page.getByText(/Show Intervals on Buttons/i).locator('..').getByRole('switch'));
    this.dayStartHourSelect = page.locator('#day-start');

    // Wizard dialog (auto-opens for first-time users; uses custom overlay, not role="dialog")
    this.wizardDialog = page.locator('.fixed.inset-0.z-50');
  }

  /**
   * Navigate to Settings page
   */
  async goto() {
    await super.goto('/settings');
    await this.settingsHeading.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Navigate directly to scheduler settings section.
   * Includes retry logic for intermittent API failures under parallel execution.
   */
  async gotoSchedulerSettings(retries = 3) {
    // Pre-set localStorage so wizard doesn't auto-open on page load
    await this.page.addInitScript(() => {
      localStorage.setItem('studytab:scheduler-wizard-seen', 'true');
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await super.goto('/settings');
        await this.settingsHeading.waitFor({ state: 'visible', timeout: 8000 });

        // Dismiss wizard if it opened before we could prevent it
        await this.dismissWizardIfOpen();

        // Click Scheduler tab
        await this.schedulerTab.waitFor({ state: 'visible', timeout: 3000 });
        await this.schedulerTab.click();

        // Wait for scheduler content to load
        await this.schedulerSettingsHeading.waitFor({ state: 'visible', timeout: 8000 });

        // Dismiss wizard again in case it opened after tab switch
        await this.dismissWizardIfOpen();
        return;
      } catch {
        if (attempt < retries) {
          // Brief pause before retry
          await this.page.waitForTimeout(500);
        } else {
          throw new Error('Failed to load scheduler settings after retries');
        }
      }
    }
  }

  /**
   * Dismiss the schedule wizard dialog if it's open.
   * The wizard is a custom fixed overlay (not role="dialog") with aria-label="Close wizard" button.
   */
  async dismissWizardIfOpen() {
    const closeButton = this.page.getByLabel('Close wizard');
    try {
      await closeButton.waitFor({ state: 'visible', timeout: 2000 });
      await closeButton.click({ force: true });
      await closeButton.waitFor({ state: 'hidden', timeout: 3000 });
    } catch {
      // Wizard not visible, nothing to do
    }
  }

  /**
   * Check if scheduler tab is visible in settings
   */
  async isSchedulerTabVisible(): Promise<boolean> {
    return await this.schedulerTab.isVisible();
  }

  // ============================================================
  // Study Mode Methods
  // ============================================================

  /**
   * Get the study mode button by name
   */
  private getModeButton(mode: StudyModeName): Locator {
    const buttons: Record<StudyModeName, Locator> = {
      balanced: this.balancedModeButton,
      intensive: this.intensiveModeButton,
      relaxed: this.relaxedModeButton,
      language: this.languageModeButton,
    };
    return buttons[mode];
  }

  /**
   * Get currently selected study mode by checking which card has selected styling
   */
  async getSelectedStudyMode(): Promise<string> {
    const modes: StudyModeName[] = ['balanced', 'intensive', 'relaxed', 'language'];
    for (const mode of modes) {
      const button = this.getModeButton(mode);
      try {
        const className = await button.getAttribute('class') || '';
        if (className.includes('border-primary') && className.includes('bg-primary')) {
          return mode;
        }
      } catch {
        continue;
      }
    }
    return 'balanced'; // default
  }

  /**
   * Select a study mode by clicking its card
   */
  async selectStudyMode(mode: StudyModeName) {
    const button = this.getModeButton(mode);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  /**
   * Get currently selected algorithm inferred from study mode card state.
   * Language Learning mode uses SM-2, all others use FSRS.
   * Relies on mode card CSS state which updates synchronously via React state.
   */
  async getSelectedAlgorithm(): Promise<SchedulerAlgorithm> {
    const mode = await this.getSelectedStudyMode();
    return mode === 'language' ? 'SM-2' : 'FSRS';
  }

  /**
   * Select an algorithm by choosing an appropriate study mode.
   * SM-2 → Language Learning mode, FSRS → Balanced mode.
   * Waits for the Schedule Preview to reflect the change.
   */
  async selectAlgorithm(algorithm: SchedulerAlgorithm) {
    if (algorithm === 'SM-2') {
      await this.selectStudyMode('language');
    } else {
      await this.selectStudyMode('balanced');
    }
    // Wait for mode card selection to visually update (synchronous React state)
    await this.page.waitForTimeout(500);
  }

  // ============================================================
  // Per-Deck Overrides Methods
  // ============================================================

  /**
   * Check if per-deck overrides section is visible (always embedded in v2)
   */
  async isPerDeckOverridesVisible(): Promise<boolean> {
    return await this.perDeckOverridesHeading.isVisible();
  }

  // ============================================================
  // Advanced Options Methods
  // ============================================================

  /**
   * Check if advanced options section is visible (always embedded in v2)
   */
  async isAdvancedOptionsVisible(): Promise<boolean> {
    return await this.advancedOptionsHeading.isVisible();
  }

  /**
   * Check if Leech Handling section is visible within advanced options
   */
  async isLeechHandlingVisible(): Promise<boolean> {
    return await this.leechHandlingHeading.isVisible();
  }

  /**
   * Get leech threshold value
   */
  async getLeechThreshold(): Promise<number> {
    const value = await this.leechThresholdInput.inputValue();
    return parseInt(value || '8', 10);
  }

  /**
   * Set leech threshold value
   */
  async setLeechThreshold(value: number) {
    await this.leechThresholdInput.fill(String(value));
    await this.leechThresholdInput.blur();
  }

  // ============================================================
  // Schedule Preview Methods
  // ============================================================

  /**
   * Check if schedule preview is visible
   */
  async isSchedulePreviewVisible(): Promise<boolean> {
    return await this.schedulePreviewHeading.isVisible();
  }

  /**
   * Get algorithm shown in schedule preview (e.g., "FSRS" or "SM2")
   */
  async getPreviewAlgorithm(): Promise<string> {
    const text = await this.schedulePreviewAlgorithmInfo.textContent() || '';
    if (text.toUpperCase().includes('SM2')) return 'SM2';
    if (text.toUpperCase().includes('FSRS')) return 'FSRS';
    return '';
  }

  // ============================================================
  // Validation and Assertion Methods
  // ============================================================

  /**
   * Expect scheduler settings page to be loaded
   */
  async expectLoaded() {
    await expect(this.schedulerSettingsHeading).toBeVisible();
    await expect(this.studyModeHeading).toBeVisible();
  }

  /**
   * Expect a specific study mode to be selected
   */
  async expectModeSelected(mode: StudyModeName) {
    const button = this.getModeButton(mode);
    const className = await button.getAttribute('class') || '';
    expect(className).toContain('border-primary');
  }
}
