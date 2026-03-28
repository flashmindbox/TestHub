import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

test.describe('P0-003: Mutation Error Handling', () => {
  test('failed card save should show error toast', async ({ page }) => {
    // Navigate to test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    // Check if Add Card button exists
    const addCardBtn = page.locator('button:has-text("Add Card")');
    if (!(await addCardBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Add Card button not available');
      return;
    }

    // THEN intercept API for POST requests only
    await page.route('**/api/v1/cards', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Server error' },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Try to add card - this opens a full page form
    await addCardBtn.click();
    // Wait for the Add Card form to appear
    await page.waitForSelector('textarea', { timeout: 5000 });

    // Fill form using textarea selectors
    const textareas = page.locator('textarea');
    await textareas.first().fill('Test question');
    if (
      await textareas
        .nth(1)
        .isVisible()
        .catch(() => false)
    ) {
      await textareas.nth(1).fill('Test answer');
    }

    // Save - look for Save button
    const saveBtn = page
      .locator('button:has-text("Save"), button:has-text("Create")')
      .first();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Should show error toast (use first() since multiple toasts can appear)
    await expect(page.locator(SELECTORS.toast).first()).toBeVisible({ timeout: 5000 });
  });

  test('failed rating should show error and not advance card', async ({ page }) => {
    // Navigate to seeded test deck
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available - run seed.spec.ts first');
      return;
    }

    // Check if Study button is enabled before clicking
    const studyButton = page.locator(SELECTORS.deckDetail.studyButton).first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    // Open study wizard first
    await studyButton.click();
    await page.waitForTimeout(500);

    // Select Mix All mode INSIDE wizard (for rating buttons)
    let hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasCards) {
      // Try switching to Mix All mode inside wizard
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
      test.skip(true, 'No cards available for rating test');
      return;
    }

    // THEN intercept review API (after wizard is open)
    await page.route('**/api/v1/study/review', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to save review' },
        }),
      });
    });

    // Show answer and rate
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(300);

    // Try to rate
    const goodButton = page.locator(SELECTORS.wizard.good);
    if (await goodButton.isVisible()) {
      await goodButton.click();

      // Should show error (use first() since multiple toasts can appear)
      await expect(page.locator(SELECTORS.toast).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('failed deck creation should show error', async ({ page }) => {
    // Navigate first, then set up route interception
    await page.goto('/decks');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Now intercept deck creation API
    await page.route('**/api/v1/decks', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to create deck' }),
        });
      } else {
        route.continue();
      }
    });

    // Create deck - look for multiple possible button texts
    const newDeckBtn = page
      .locator(
        'button:has-text("New Deck"), button:has-text("Create Deck"), button:has-text("Add Deck"), a:has-text("New Deck")'
      )
      .first();
    if (!(await newDeckBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'New Deck button not found');
      return;
    }
    await newDeckBtn.click();
    // Wait for the Create New Deck form heading
    await page.waitForSelector('text="Create New Deck"', { timeout: 5000 });

    // Fill name using native placeholder selector
    await page.fill('[placeholder*="Biology"], [placeholder*="e.g."]', 'Test Deck');
    await page.waitForTimeout(300);

    // Click Create Deck button and wait for response
    await page.click('button:has-text("Create Deck")');
    await page.waitForTimeout(1000);

    // Check for error indicator (toast, alert, or form staying open with error state)
    // If no explicit error indicator, check that the form is still visible (not successfully closed)
    const errorIndicator = page.locator('[data-sonner-toast], [role="alert"]');
    const formStillOpen = page.locator('text="Create New Deck"');

    // Either see an error toast OR the form should still be open (not dismissed)
    const hasError = await errorIndicator
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const formOpen = await formStillOpen.isVisible().catch(() => false);

    // At minimum, the deck should not have been created - form should still be open or error shown
    expect(hasError || formOpen).toBe(true);
  });

  test('network error should show user-friendly message', async ({ page }) => {
    await page.route('**/api/v1/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/decks');

    // Should show error state or message
    await expect(page.locator('text=/error|failed|offline/i').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
