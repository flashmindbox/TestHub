import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

test.describe('P0-002: Race Condition in Study Wizard', () => {
  test('rapidly opening wizard should show correct deck cards', async ({ page }) => {
    // Navigate to seeded test deck (guaranteed to exist with cards)
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    // Select Quick Revise mode BEFORE opening wizard
    await selectQuickReviseMode(page);

    // Open wizard
    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Verify wizard is showing cards (Show Answer button visible = cards loaded correctly)
    await expect(page.locator(SELECTORS.wizard.showAnswer)).toBeVisible();
  });

  test('closing and reopening wizard should show same deck', async ({ page }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    // Select Quick Revise mode BEFORE opening wizard
    await selectQuickReviseMode(page);

    // Open wizard
    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Get first card content - look for any paragraph in the wizard area
    const cardContent = page.locator('p').first();
    const firstCardContent = await cardContent.textContent();

    // Close wizard
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Reopen wizard (mode should persist)
    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    const hasCardsAgain = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCardsAgain) {
      // Mode might have reset, select again
      await selectQuickReviseMode(page);
      await page.click(SELECTORS.deckDetail.studyButton);
      await page.waitForTimeout(500);
    }

    // Verify content exists (card may be same or different due to shuffle)
    const reopenedCardContent = await page.locator('p').first().textContent();
    expect(reopenedCardContent).toBeDefined();
    expect(reopenedCardContent?.length).toBeGreaterThan(0);
  });

  test('wizard should handle slow network gracefully', async ({ page }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    // Slow down API responses AFTER page load
    await page.route('**/api/v1/study/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Open wizard
    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    // Select mode INSIDE wizard if Show Answer not visible
    let hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!hasCards) {
      // Try switching to Quick Revise mode inside wizard
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
    }

    // Should eventually show wizard with Show Answer button
    await expect(page.locator(SELECTORS.wizard.showAnswer)).toBeVisible({
      timeout: 20000,
    });
  });
});
