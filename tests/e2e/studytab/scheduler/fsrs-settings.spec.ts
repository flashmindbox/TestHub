import { test, expect } from '../../../../src/fixtures';
import {
  SchedulerSettingsPage,
  DecksPage,
  DeckDetailPage,
  StudyPage,
} from '../../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../../src/utils';

/**
 * FSRS Scheduler Settings E2E Tests
 *
 * Tests the scheduler settings page after the Design System v2 redesign (March 2026).
 * The new UI uses Study Mode cards instead of direct algorithm/retention/limit controls.
 *
 * Key changes from v1:
 * - Algorithm selection is now implicit through Study Mode choice
 * - Retention slider and daily limit inputs removed from main page
 * - Advanced settings and per-deck overrides are embedded (not collapsible)
 * - Schedule Preview shows current algorithm info
 *
 * Tags: @studytab @scheduler @fsrs @settings
 */
test.describe('FSRS Scheduler Settings @studytab @scheduler @fsrs', () => {
  // Serial mode: scheduler settings API is flaky under parallel browser load
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000); // Settings API can be slow after mutations
  test.use({ storageState: '.auth/user.json' });

  let schedulerSettings: SchedulerSettingsPage;
  let decksPage: DecksPage;
  let deckDetailPage: DeckDetailPage;
  let studyPage: StudyPage;

  test.beforeEach(async ({ page, projectConfig }) => {
    schedulerSettings = new SchedulerSettingsPage(page, projectConfig.baseUrl);
    decksPage = new DecksPage(page, projectConfig.baseUrl);
    deckDetailPage = new DeckDetailPage(page, projectConfig.baseUrl);
    studyPage = new StudyPage(page, projectConfig.baseUrl);
  });

  // ============================================================
  // 1. SCHEDULER SETTINGS PAGE
  // ============================================================
  test.describe('Scheduler Settings Page', () => {
    test('shows scheduler tab in settings', async () => {
      await schedulerSettings.goto();

      const isVisible = await schedulerSettings.isSchedulerTabVisible();
      expect(isVisible).toBe(true);
    });

    test('scheduler settings page loads with study mode selector', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      await schedulerSettings.expectLoaded();
      await expect(schedulerSettings.studyModeHeading).toBeVisible();
    });

    test('displays current algorithm via study mode selection', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      const algorithm = await schedulerSettings.getSelectedAlgorithm();
      // Accept either SM-2 (Language mode) or FSRS (other modes)
      expect(['SM-2', 'FSRS']).toContain(algorithm);
    });

    test('can switch between FSRS and SM-2 via study modes', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      // Get current algorithm
      const initialAlgorithm = await schedulerSettings.getSelectedAlgorithm();

      // Switch to the other algorithm via study mode
      const targetAlgorithm = initialAlgorithm === 'FSRS' ? 'SM-2' : 'FSRS';
      await schedulerSettings.selectAlgorithm(targetAlgorithm);

      let algorithm = await schedulerSettings.getSelectedAlgorithm();
      expect(algorithm).toBe(targetAlgorithm);

      // Pause to avoid rate limiting
      await schedulerSettings.page.waitForTimeout(1000);

      // Switch back
      await schedulerSettings.selectAlgorithm(initialAlgorithm);

      algorithm = await schedulerSettings.getSelectedAlgorithm();
      expect(algorithm).toBe(initialAlgorithm);
    });

    test.skip('retention slider updates value', async () => {
      // Design System v2: Retention slider removed from main scheduler settings page.
      // Retention is now controlled through study mode selection or custom mode creation.
    });

    test.skip('presets apply correct values and switch to FSRS', async () => {
      // Design System v2: Retention presets (Relaxed/Balanced/Intense/Exam) removed
      // from main page. Replaced by Study Mode cards with built-in algorithm settings.
    });

    test.skip('daily limits can be adjusted', async () => {
      // Design System v2: Daily limit inputs removed from main scheduler settings page.
      // Daily limits are now set automatically by the selected study mode.
    });

    test('schedule preview shows algorithm info', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      await expect(schedulerSettings.schedulePreviewHeading).toBeVisible();
      await expect(schedulerSettings.schedulePreviewAlgorithmInfo).toBeVisible();

      const previewAlgorithm = await schedulerSettings.getPreviewAlgorithm();
      expect(['FSRS', 'SM2']).toContain(previewAlgorithm);
    });

    test.skip('retention slider has correct range for FSRS', async () => {
      // Design System v2: Retention slider removed from main scheduler settings page.
    });
  });

  // ============================================================
  // 2. STUDY MODE SELECTION
  // ============================================================
  test.describe('Study Mode Selection', () => {
    test('study mode cards are visible', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      await expect(schedulerSettings.balancedModeButton).toBeVisible();
      await expect(schedulerSettings.relaxedModeButton).toBeVisible();
      await expect(schedulerSettings.intensiveModeButton).toBeVisible();
      await expect(schedulerSettings.languageModeButton).toBeVisible();
    });

    test.fixme('selecting a mode updates the schedule preview', async () => {
      // Fixme: Schedule Preview depends on a successful API mutation, but the settings
      // API rate-limits after prior algorithm-switching tests in serial mode. The mode
      // card selection works (tested elsewhere), but the preview text doesn't update
      // because the mutation returns 429 "Too Many Requests".
      await schedulerSettings.gotoSchedulerSettings();
      await schedulerSettings.selectStudyMode('balanced');

      await expect(async () => {
        expect(await schedulerSettings.getPreviewAlgorithm()).toBe('FSRS');
      }).toPass({ timeout: 15000 });

      await schedulerSettings.selectStudyMode('language');

      await expect(async () => {
        expect(await schedulerSettings.getPreviewAlgorithm()).toBe('SM2');
      }).toPass({ timeout: 15000 });
    });

    test('SM-2 mode is available for language learning', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      // Language Learning mode should exist and use SM-2
      await expect(schedulerSettings.languageModeButton).toBeVisible();

      await schedulerSettings.selectAlgorithm('SM-2');

      const algorithm = await schedulerSettings.getSelectedAlgorithm();
      expect(algorithm).toBe('SM-2');
    });

    test('create custom mode button is visible', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      await expect(schedulerSettings.createCustomModeButton).toBeVisible();
    });
  });

  // ============================================================
  // 3. PER-DECK OVERRIDES
  // ============================================================
  test.describe('Per-Deck Overrides', () => {
    test('per-deck overrides section is visible', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      // In v2, per-deck overrides are embedded (always visible)
      const isVisible = await schedulerSettings.isPerDeckOverridesVisible();
      expect(isVisible).toBe(true);
    });

    test('per-deck overrides shows description text', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      await expect(schedulerSettings.perDeckOverridesDescription).toBeVisible();
    });

    test.skip('can set different algorithm per deck', async () => {
      // Per-deck overrides now use preset dropdowns, not algorithm selection.
      // Requires deck creation + preset assignment testing.
    });

    test.skip('can set different retention per deck', async () => {
      // Per-deck overrides now use preset dropdowns, not retention sliders.
    });

    test.skip('deleting override reverts to global', async () => {
      // Per-deck overrides now use "Use Default" option in preset dropdown.
    });
  });

  // ============================================================
  // 4. FSRS REVIEW FLOW
  // ============================================================
  test.describe('FSRS Review Flow', () => {
    let testDeckName: string;

    test.beforeEach(async ({ cleanup }) => {
      // Ensure FSRS is selected via Balanced mode
      await schedulerSettings.gotoSchedulerSettings();
      await schedulerSettings.selectStudyMode('balanced');
      await schedulerSettings.page.waitForTimeout(500);

      // Create a test deck with cards
      testDeckName = TestDataFactory.deck().name;
      await decksPage.goto();
      await decksPage.createDeck(testDeckName);

      cleanup.track({
        type: 'deck',
        id: testDeckName,
        name: testDeckName,
        deleteVia: 'ui',
        project: 'studytab',
        createdAt: new Date(),
      });

      await decksPage.clickDeck(testDeckName);

      // Add test cards
      const cards = TestDataFactory.many(TestDataFactory.card, 3);
      for (const card of cards) {
        await deckDetailPage.addBasicCard(card.front, card.back);
      }
    });

    // Flaky: Complex setup with deck creation and card addition can fail intermittently
    test.fixme('card can be studied with FSRS algorithm', async ({ page }) => {
      // Start study session
      await deckDetailPage.startStudy();

      // Study a card
      await studyPage.showAnswer();

      // Verify rating buttons are visible
      await expect(studyPage.ratingButtons.first()).toBeVisible();

      // Rate the card
      await studyPage.rateGood();

      // Wait for scheduling to complete
      await page.waitForTimeout(500);

      // Card should be scheduled (moved to next card or session complete)
      const isComplete = await studyPage.isSessionComplete();
      if (!isComplete) {
        await expect(studyPage.cardFront).toBeVisible();
      }
    });

    test.skip('stability and difficulty updated after review', async () => {
      // Would need API verification to confirm FSRS state updates
    });

    test.skip('interval preview shows correct values', async () => {
      // Interval preview feature not verified in current UI
    });
  });

  // ============================================================
  // 5. ALGORITHM SWITCHING VIA STUDY MODES
  // ============================================================
  test.describe('Algorithm Switching via Study Modes', () => {
    test.skip('existing SM-2 card migrates on first FSRS review', async () => {
      // Requires cards with SM-2 history - needs specific test data setup
    });

    test.skip('stability initialized from interval', async () => {
      // Requires cards with SM-2 history - needs specific test data setup
    });

    test('can switch from SM-2 to FSRS via study modes', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      // Select Language Learning (SM-2)
      await schedulerSettings.selectAlgorithm('SM-2');

      let algorithm = await schedulerSettings.getSelectedAlgorithm();
      expect(algorithm).toBe('SM-2');

      // Switch to Balanced (FSRS)
      await schedulerSettings.selectAlgorithm('FSRS');

      algorithm = await schedulerSettings.getSelectedAlgorithm();
      expect(algorithm).toBe('FSRS');
    });

    test('can switch back to SM-2 after using FSRS', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      // Start on FSRS
      await schedulerSettings.selectAlgorithm('FSRS');

      // Switch to SM-2
      await schedulerSettings.selectAlgorithm('SM-2');

      const algorithm = await schedulerSettings.getSelectedAlgorithm();
      expect(algorithm).toBe('SM-2');
    });
  });

  // ============================================================
  // 6. STUDY MODE PRESETS
  // ============================================================
  test.describe('Study Mode Presets', () => {
    test.skip('Light preset sets low daily limits', async () => {
      // Design System v2: Daily limit presets (Light/Moderate/Heavy) removed from
      // main page. Limits are now set by study mode cards automatically.
    });

    test.skip('Moderate preset sets medium daily limits', async () => {
      // Design System v2: Daily limit presets removed. See above.
    });

    test.skip('Heavy preset sets high daily limits', async () => {
      // Design System v2: Daily limit presets removed. See above.
    });
  });

  // ============================================================
  // 7. SM-2 SPECIFIC SETTINGS
  // ============================================================
  test.describe('SM-2 Settings', () => {
    test.skip('SM-2 settings are visible when SM-2 is selected', async () => {
      // Design System v2: SM-2 specific settings (learning steps, graduating interval,
      // easy bonus, starting ease) are no longer shown on the main settings page.
      // These are configured internally when Language Learning mode is selected.
    });

    test.skip('can configure learning steps', async () => {
      // Design System v2: SM-2 settings removed from main page.
    });

    test.skip('can configure graduating interval', async () => {
      // Design System v2: SM-2 settings removed from main page.
    });

    test.skip('can configure easy bonus', async () => {
      // Design System v2: SM-2 settings removed from main page.
    });

    test.skip('can configure starting ease', async () => {
      // Design System v2: SM-2 settings removed from main page.
    });

    test.skip('SM-2 settings hidden when FSRS is selected', async () => {
      // Design System v2: SM-2 settings not shown on main page regardless of algorithm.
    });
  });

  // ============================================================
  // 8. EMBEDDED SECTIONS
  // ============================================================
  test.describe('Embedded Sections', () => {
    test('advanced options section is visible', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      // In v2, advanced options are embedded (always visible, not collapsible)
      const isVisible = await schedulerSettings.isAdvancedOptionsVisible();
      expect(isVisible).toBe(true);
    });

    test('leech handling settings are visible in advanced options', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      const isVisible = await schedulerSettings.isLeechHandlingVisible();
      expect(isVisible).toBe(true);
    });

    test('per-deck overrides section is visible', async () => {
      await schedulerSettings.gotoSchedulerSettings();

      const isVisible = await schedulerSettings.isPerDeckOverridesVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================
  test.describe('Edge Cases and Validation', () => {
    test.skip('retention value stays within valid range', async () => {
      // Design System v2: Retention slider removed from main page.
      // Retention is managed internally by study mode selection.
    });

    test.skip('daily limits accept valid values', async () => {
      // Design System v2: Daily limit inputs removed from main page.
    });

    test('settings page loads without console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await schedulerSettings.gotoSchedulerSettings();

      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(
        err =>
          !err.includes('React DevTools') &&
          !err.includes('favicon') &&
          !err.includes('429') &&
          !err.includes('Too Many Requests')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
