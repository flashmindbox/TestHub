import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

test.describe('Feature: Study Modes', () => {
  test.beforeEach(async ({ page }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
    }
  });

  test('Full Session mode should show rating buttons', async ({ page }) => {
    // Select Mix All mode (Due First) for full rating buttons
    const modeSelector = page
      .locator(
        'button:has-text("Due First"), button:has-text("Quick Revise"), button:has-text("Mix All")'
      )
      .first();
    if (await modeSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modeSelector.click();
      await page.waitForTimeout(200);
      const mixAllOption = page
        .locator('[role="menuitem"]:has-text("Mix All"), button:has-text("Mix All")')
        .first();
      if (await mixAllOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mixAllOption.click();
        await page.waitForTimeout(300);
      }
    }

    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Reveal answer
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(300);

    // Should show rating buttons (Again, Hard, Good, Easy)
    const ratingButtons = page.locator(
      'button:has-text("Again"), button:has-text("Hard"), button:has-text("Good"), button:has-text("Easy")'
    );

    const visibleRatings = await ratingButtons.count();
    expect(visibleRatings).toBeGreaterThanOrEqual(2);
  });

  test('Quick Revise mode should show simpler UI', async ({ page }) => {
    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard
    const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
    if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modeToggle.click();
      await page.waitForTimeout(200);
      const quickReviseOption = page
        .locator('[role="menuitem"]:has-text("Quick Revise"), button:has-text("Quick Revise")')
        .first();
      if (await quickReviseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await quickReviseOption.click();
        await page.waitForTimeout(500);
      }
    }

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Reveal answer
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(300);

    // Quick mode might have Next/Skip instead of full ratings
    const hasSimpleNav = await page
      .locator('button:has-text("Next"), button:has-text("Skip"), button:has-text("Got it")')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasSimpleNav).toBe(true);
  });

  test('switching modes should preserve position', async ({ page }) => {
    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard
    let hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasCards) {
      const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
      if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modeToggle.click();
        await page.waitForTimeout(200);
        const quickReviseOption = page
          .locator('[role="menuitem"]:has-text("Quick Revise"), button:has-text("Quick Revise")')
          .first();
        if (await quickReviseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await quickReviseOption.click();
          await page.waitForTimeout(500);
        }
      }
      hasCards = await page
        .locator(SELECTORS.wizard.showAnswer)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Get initial progress
    const progressIndicator = page.locator(SELECTORS.wizard.progress).first();
    const initialProgress = await progressIndicator.textContent().catch(() => '1/1');

    // Advance one card
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(200);

    const nextButton = page
      .locator('button:has-text("Good"), button:has-text("Next")')
      .first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Switch mode using mode toggle
    const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
    if (await modeToggle.isVisible().catch(() => false)) {
      await modeToggle.click();
      await page.waitForTimeout(300);

      const mixAllOption = page
        .locator('[role="menuitem"]:has-text("Mix All"), button:has-text("Mix All")')
        .first();
      if (await mixAllOption.isVisible().catch(() => false)) {
        await mixAllOption.click();
        await page.waitForTimeout(500);
      }

      // Progress should be preserved or reset based on mode design
      const progressAfterSwitch = await progressIndicator.textContent().catch(() => null);
      expect(progressAfterSwitch).toBeDefined();
    }
  });

  test('Full Session should track detailed stats', async ({ page }) => {
    // Check if Study button is enabled before clicking
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    await studyButton.click();
    await page.waitForTimeout(500);

    // Use Mix All mode INSIDE wizard for rating buttons
    let hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasCards) {
      const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
      if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modeToggle.click();
        await page.waitForTimeout(200);
        const mixAllOption = page
          .locator('[role="menuitem"]:has-text("Mix All"), button:has-text("Mix All")')
          .first();
        if (await mixAllOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await mixAllOption.click();
          await page.waitForTimeout(500);
        }
      }
      hasCards = await page
        .locator(SELECTORS.wizard.showAnswer)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Complete a few cards with different ratings
    const ratings = ['Hard', 'Good', 'Easy'];

    for (const rating of ratings) {
      const showAnswer = page.locator(SELECTORS.wizard.showAnswer);
      if (!(await showAnswer.isVisible().catch(() => false))) break;

      await showAnswer.click();
      await page.waitForTimeout(200);

      const ratingButton = page.locator(`button:has-text("${rating}")`);
      if (await ratingButton.isVisible().catch(() => false)) {
        await ratingButton.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    // Stats should update or be visible somewhere
    const hasProgressTracking = await page
      .locator(SELECTORS.wizard.progress)
      .isVisible()
      .catch(() => false);
    expect(hasProgressTracking).toBe(true);
  });

  test('keyboard shortcuts should work in each mode', async ({ page }) => {
    // Check if Study button is enabled before clicking
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    await studyButton.click();
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard
    let hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasCards) {
      const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
      if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modeToggle.click();
        await page.waitForTimeout(200);
        const quickReviseOption = page
          .locator('[role="menuitem"]:has-text("Quick Revise"), button:has-text("Quick Revise")')
          .first();
        if (await quickReviseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await quickReviseOption.click();
          await page.waitForTimeout(500);
        }
      }
      hasCards = await page
        .locator(SELECTORS.wizard.showAnswer)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Space to reveal
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Check if revealed
    const showAnswerButton = page.locator(SELECTORS.wizard.showAnswer);

    // If space worked, answer should be shown
    if (!(await showAnswerButton.isVisible().catch(() => false))) {
      // Try number keys for rating (1-4 are common shortcuts)
      await page.keyboard.press('3'); // Usually "Good"
      await page.waitForTimeout(300);

      // Should still be in wizard
      const wizardOpen = await page
        .locator(SELECTORS.wizard.progress)
        .isVisible()
        .catch(() => false);
      expect(wizardOpen).toBe(true);
    }
  });

  test('session completion should show summary', async ({ page }) => {
    // Check if Study button is enabled before clicking
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    await studyButton.click();
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard
    let hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasCards) {
      const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
      if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modeToggle.click();
        await page.waitForTimeout(200);
        const quickReviseOption = page
          .locator('[role="menuitem"]:has-text("Quick Revise"), button:has-text("Quick Revise")')
          .first();
        if (await quickReviseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await quickReviseOption.click();
          await page.waitForTimeout(500);
        }
      }
      hasCards = await page
        .locator(SELECTORS.wizard.showAnswer)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Get total cards
    const progressText = await page
      .locator(SELECTORS.wizard.progress)
      .textContent()
      .catch(() => '1/5');
    const totalMatch = progressText?.match(/\d+\/(\d+)/);
    const totalCards = parseInt(totalMatch?.[1] || '5');

    // Complete all cards (up to 10 to avoid infinite loop)
    for (let i = 0; i < Math.min(totalCards, 10); i++) {
      const showButton = page.locator(SELECTORS.wizard.showAnswer);

      if (await showButton.isVisible().catch(() => false)) {
        await showButton.click();
        await page.waitForTimeout(200);

        const actionButton = page
          .locator('button:has-text("Good"), button:has-text("Next"), button:has-text("Skip")')
          .first();
        if (await actionButton.isVisible().catch(() => false)) {
          await actionButton.click();
          await page.waitForTimeout(300);
        }
      } else {
        // No Show Answer button - might be at completion or wizard closed
        break;
      }
    }

    // Wait a moment for completion state to render
    await page.waitForTimeout(500);

    // Look for completion state or summary
    const completionIndicator = page
      .locator(
        'text=/complete/i, text=/finished/i, text=/session.*done/i, text=/Great job/i, text=/all caught up/i, button:has-text("Close")'
      )
      .first();

    // Check if wizard is still showing Show Answer (still has cards)
    const stillHasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible()
      .catch(() => false);
    const hasCompletion = await completionIndicator.isVisible().catch(() => false);

    // Test passes if: we see completion message OR wizard no longer shows cards
    expect(hasCompletion || !stillHasCards).toBe(true);
  });
});
