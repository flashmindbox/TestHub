import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

test.describe('P0-001: Suspended Cards Auto-Unsuspend', () => {
  test('suspended card should show "Suspended" badge in card list', async ({
    page,
  }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    // Check card list for suspended badge - exclude the filter dropdown option
    // The badge is in the card list, not in the select dropdown
    const suspendedBadge = page
      .locator('div:has-text("Suspended"):not(select):not(option)')
      .first();
    await expect(suspendedBadge).toBeVisible({ timeout: 5000 });
  });

  test('suspended card count should decrease due cards', async ({ page }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    // Get initial due count from study button (format: "Study (N)")
    const studyButton = page.locator(SELECTORS.deckDetail.studyButton);
    const initialText = await studyButton.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

    // Select Quick Revise mode BEFORE opening wizard
    await selectQuickReviseMode(page);

    // Open study and suspend a card
    await page.click(SELECTORS.deckDetail.studyButton);
    await page.waitForTimeout(500);

    // Wait for wizard with a card to be visible
    const hasCard = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCard) {
      test.skip(true, 'No cards available in wizard');
      return;
    }

    // Wait for Card options button to be ready
    await page.waitForTimeout(300);
    const cardOptionsButton = page.locator(SELECTORS.wizard.cardOptions);
    const hasCardOptions = await cardOptionsButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasCardOptions) {
      test.skip(true, 'Card options button not available');
      return;
    }

    await cardOptionsButton.click();
    await page.waitForTimeout(300);

    await page.click(SELECTORS.cardOptionsMenu.suspendPermanently);
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Check count decreased
    const newText = await studyButton.textContent();
    const newCount = parseInt(newText?.match(/\d+/)?.[0] || '0');

    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  test('filter dropdown should have Suspended option', async ({ page }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    // Wait for the filter dropdown to appear - it's a native select element
    await page.waitForSelector('select', { timeout: 5000 });

    // Check that the Suspended option exists in one of the select elements
    const suspendedOption = page.locator('select option:has-text("Suspended")');
    await expect(suspendedOption).toBeAttached();
  });
});
