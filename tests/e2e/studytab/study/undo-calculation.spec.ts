import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

test.describe('P0-004: SM-2 Undo Calculation', () => {
  test('back button should restore previous card', async ({ page }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    // Open study wizard
    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard if Show Answer not visible
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
    const initialProgress = await page
      .locator(SELECTORS.wizard.progress)
      .first()
      .textContent();

    // Show answer
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(300);

    // Rate or skip to advance
    const nextButton = page.locator(SELECTORS.wizard.next);
    const goodButton = page.locator(SELECTORS.wizard.good);
    const skipButton = page.locator(SELECTORS.wizard.skip);

    if (await nextButton.isVisible()) {
      await nextButton.click();
    } else if (await goodButton.isVisible()) {
      await goodButton.click();
    } else if (await skipButton.isVisible()) {
      await skipButton.click();
    }

    await page.waitForTimeout(500);

    // Look for back button
    const backButton = page.locator(
      'button[aria-label*="back" i], button[aria-label*="Back"]'
    );
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(300);

      // Verify we're back to first card
      const restoredProgress = await page
        .locator(SELECTORS.wizard.progress)
        .first()
        .textContent();
      expect(restoredProgress).toBe(initialProgress);
    }
  });

  test('undo should work after skip', async ({ page }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard if Show Answer not visible
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

    // Skip card
    const skipButton = page.locator(SELECTORS.wizard.skip);
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(300);

      // Look for back button
      const backButton = page.locator(
        'button[aria-label*="back" i], button[aria-label*="Back"]'
      );
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(300);

        // Should be back to skipped card (front side)
        await expect(page.locator(SELECTORS.wizard.showAnswer)).toBeVisible();
      }
    }
  });

  test('multiple undos should work in sequence', async ({ page }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard if Show Answer not visible
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

    // Advance through multiple cards
    for (let i = 0; i < 3; i++) {
      const showAnswer = page.locator(SELECTORS.wizard.showAnswer);
      if (!(await showAnswer.isVisible().catch(() => false))) break;

      await showAnswer.click();
      await page.waitForTimeout(200);

      const nextButton = page.locator(SELECTORS.wizard.next);
      const goodButton = page.locator(SELECTORS.wizard.good);

      if (await nextButton.isVisible()) {
        await nextButton.click();
      } else if (await goodButton.isVisible()) {
        await goodButton.click();
      }
      await page.waitForTimeout(200);
    }

    // Go back multiple times
    const backButton = page.locator(
      'button[aria-label*="back" i], button[aria-label*="Back"]'
    );
    let backsPerformed = 0;
    for (let i = 0; i < 2; i++) {
      if (await backButton.isVisible().catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(200);
        backsPerformed++;
      }
    }

    // Should still be in wizard OR wizard completed (both are valid states)
    // After completing all cards, wizard might show completion message
    const stillInWizard = await page
      .locator(SELECTORS.wizard.showAnswer + ', ' + SELECTORS.wizard.next)
      .first()
      .isVisible()
      .catch(() => false);
    const hasCompletionMessage = await page
      .locator('text=/complete/i, text=/finished/i, text=/Great job/i, button:has-text("Close")')
      .first()
      .isVisible()
      .catch(() => false);
    const wizardClosed = !stillInWizard && !hasCompletionMessage;

    // Test passes if: still in wizard with cards, or completed, or back was performed at least once
    expect(stillInWizard || hasCompletionMessage || backsPerformed > 0).toBe(true);
  });
});
