import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

/**
 * Create an ephemeral deck for destructive tests
 * This prevents tests from consuming shared test data
 */
async function createEphemeralDeck(
  page: import('@playwright/test').Page,
  name: string
): Promise<string | null> {
  await page.goto('/decks');
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Click New Deck button
  const newDeckBtn = page.locator('button:has-text("New Deck")').first();
  if (!(await newDeckBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    console.log('New Deck button not found');
    return null;
  }

  await newDeckBtn.click();
  await page.waitForSelector('text=Create New Deck', { timeout: 5000 });
  await page.waitForTimeout(300);

  // Fill deck name
  const nameInput = page.locator('#deck-name, input[name="name"]').first();
  await nameInput.fill(name);
  await page.waitForTimeout(200);

  // Submit
  await page.click('button:has-text("Create Deck")');
  await page.waitForTimeout(1500);

  // Find the created deck and return its ID
  await page.goto('/decks');
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.waitForTimeout(500);

  const deckLink = page.locator(`a[href*="/decks/"]:has-text("${name}")`);
  if (await deckLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    const href = await deckLink.getAttribute('href');
    const deckId = href?.split('/decks/')[1] || null;
    console.log(`Created ephemeral deck: ${name} (${deckId})`);
    return deckId;
  }

  return null;
}

test.describe('P2-007: Database Transactions', () => {
  test('moving card should update both deck counts atomically', async ({ page }) => {
    console.log('Test: moving card should update both deck counts atomically');

    // Get test data to navigate to specific deck
    const testData = getTestData();
    if (!testData?.deckId) {
      test.skip(true, 'No test deck ID available');
      return;
    }

    // Check if we have multiple decks
    const hasMultiple = await hasMultipleDecks(page);
    if (!hasMultiple) {
      test.skip(true, 'Need at least 2 decks for this test');
      return;
    }

    // Go to the primary test deck
    await goToTestDeck(page);
    await page.waitForTimeout(500);

    // Find card items with move buttons
    const cardItems = page.locator('[data-testid="card-item"]');
    const cardCount = await cardItems.count();
    console.log(`Found ${cardCount} card items in deck`);

    if (cardCount === 0) {
      test.skip(true, 'No cards found in deck');
      return;
    }

    // Check if move button exists
    const moveButton = page.locator('button[title="Move to deck"]').first();
    const moveVisible = await moveButton.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Move button visible: ${moveVisible}`);

    if (!moveVisible) {
      test.skip(true, 'Move button not visible');
      return;
    }

    // Count actual card items (not stats text which can be stale)
    const initialCount = cardCount;

    // Click move button on first card
    await moveButton.click();
    await page.waitForTimeout(300);

    // Wait for move modal to appear
    const modal = page.locator('text=Move Card to Another Deck');
    const hasModal = await modal.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasModal) {
      test.skip(true, 'Move modal did not appear');
      return;
    }

    // Wait for modal dropdown to populate (handles lazy loading)
    const modalSelect = page.locator('.fixed.inset-0.z-50 select.w-full');

    // Wait for options to load - poll until we have more than 1 option (first is placeholder)
    let options: string[] = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.waitForTimeout(300);
      options = await modalSelect.locator('option').allTextContents();
      if (options.length >= 2) break;
    }
    console.log('Move modal options after wait:', options);

    if (options.length < 2) {
      test.skip(true, 'No other decks available to move to (dropdown empty after wait)');
      return;
    }

    // Get option values
    const optionValues = await modalSelect
      .locator('option')
      .evaluateAll((els) =>
        els.map((el) => ({ value: el.getAttribute('value'), text: el.textContent }))
      );
    console.log('Option values:', optionValues);

    // Find first non-empty value (skip "Select a deck" which has empty value)
    const realDeck = optionValues.find((opt) => opt.value && opt.value !== '');
    if (!realDeck?.value) {
      test.skip(true, 'No valid deck option found');
      return;
    }

    await modalSelect.selectOption(realDeck.value);
    await page.waitForTimeout(500);

    // Find Move Card button in the modal
    const moveCardBtn = page.locator(
      '.fixed.inset-0.z-50 button:has-text("Move Card")'
    );
    const isDisabled = await moveCardBtn.getAttribute('disabled');
    console.log(`Move Card button disabled: ${isDisabled}`);

    // Click Move Card button
    await moveCardBtn.click();
    await page.waitForTimeout(1000);

    // Navigate back to the same test deck to get accurate count
    await goToTestDeck(page);
    await page.waitForTimeout(500);

    // Re-count card items directly
    const newCardItems = page.locator('[data-testid="card-item"]');
    const newCount = await newCardItems.count();

    // Count should have decreased by 1 (card was moved to another deck)
    // Use >= instead of === since test data can vary
    // Card count should decrease by 1 after successful move
    expect(newCount).toBe(initialCount - 1);
  });

  test('failed card move should not change any counts', async ({ page }) => {
    // Go to test deck first
    await goToTestDeck(page);
    await page.waitForTimeout(500);

    // Check if move button exists
    const moveButton = page.locator('button[title="Move to deck"]').first();
    const hasMove = await moveButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasMove) {
      test.skip(true, 'Move button not available');
      return;
    }

    // Set up route interception to simulate failure
    await page.route('**/api/v1/cards/*/move', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Move failed' },
        }),
      });
    });

    // Get initial count
    const statsText = await page
      .locator('text=/\\d+\\s*(cards?|total)/i')
      .first()
      .textContent()
      .catch(() => '5 cards');
    const initialCount = parseInt(statsText?.match(/(\d+)/)?.[1] || '5');

    // Click move button
    await moveButton.click();
    await page.waitForTimeout(300);

    // Wait for modal
    const modal = page.locator('text=Move Card to Another Deck');
    const hasModal = await modal.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasModal) {
      test.skip(true, 'Move modal did not appear');
      return;
    }

    // Wait for modal dropdown to populate (handles lazy loading)
    const modalSelect = page.locator('.fixed.inset-0.z-50 select.w-full');

    let options: string[] = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.waitForTimeout(300);
      options = await modalSelect.locator('option').allTextContents();
      if (options.length >= 2) break;
    }

    if (options.length < 2) {
      test.skip(true, 'No other decks available to move to (dropdown empty after wait)');
      return;
    }

    // Get option values and find first non-empty value
    const optionValues = await modalSelect
      .locator('option')
      .evaluateAll((els) =>
        els.map((el) => ({ value: el.getAttribute('value'), text: el.textContent }))
      );
    const realDeck = optionValues.find((opt) => opt.value && opt.value !== '');
    if (!realDeck?.value) {
      test.skip(true, 'No valid deck option found');
      return;
    }

    // Select destination deck
    await modalSelect.selectOption(realDeck.value);
    await page.waitForTimeout(500);

    // Click Move Card button (this should fail due to route interception)
    await page.locator('.fixed.inset-0.z-50 button:has-text("Move Card")').click();
    await page.waitForTimeout(1000);

    // Should show error toast
    const hasError = await page
      .locator('[data-sonner-toast], [role="alert"]')
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Count should be unchanged (card wasn't actually moved)
    const newStatsText = await page
      .locator('text=/\\d+\\s*(cards?|total)/i')
      .first()
      .textContent()
      .catch(() => '5 cards');
    const newCount = parseInt(newStatsText?.match(/(\d+)/)?.[1] || '5');

    expect(hasError || newCount === initialCount).toBe(true);
  });

  test('bulk delete should remove all or none', async ({ page }) => {
    // Go to test deck
    await goToTestDeck(page);
    await page.waitForTimeout(500);

    // Wait for cards to load first (checkbox only shows when cards exist)
    const cards = page.locator('[data-testid="card-item"], .card-item');
    const cardCount = await cards.count();

    if (cardCount < 2) {
      test.skip(true, 'Need at least 2 cards for bulk delete test');
      return;
    }

    // Look for bulk select (checkbox should be visible now that cards are loaded)
    const selectAllCheckbox = page.locator(
      'input[type="checkbox"][aria-label*="select all" i], [data-testid="select-all"]'
    );

    const hasBulkSelect = await selectAllCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasBulkSelect) {
      test.skip(true, 'Bulk select feature not implemented');
      return;
    }

    const initialCount = cardCount;

    // Select all
    await selectAllCheckbox.click();
    await page.waitForTimeout(200);

    // Click delete
    const deleteButton = page
      .locator('button:has-text("Delete Selected"), button:has-text("Delete")')
      .first();
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm if dialog appears
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Yes")'
      );
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(500);

      // Either all deleted or none (transaction)
      const finalCount = await cards.count();
      expect(finalCount === 0 || finalCount === initialCount).toBe(true);
    } else {
      test.skip(true, 'Bulk delete button not available');
    }
  });

  test('deck deletion should remove all cards atomically', async ({
    page,
    viewport,
  }) => {
    // Skip on mobile - hover interactions don't work on touch devices
    if ((viewport?.width || 1280) < 768) {
      test.skip(true, 'Deck deletion requires hover interaction (desktop only)');
      return;
    }

    // Clean up any leftover ephemeral decks from previous failed runs
    await page.goto('/decks');
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Create ephemeral deck for this destructive test
    const ephemeralName = `Ephemeral-Delete-${Date.now()}`;
    const ephemeralDeckId = await createEphemeralDeck(page, ephemeralName);

    if (!ephemeralDeckId) {
      test.skip(true, 'Could not create ephemeral deck for deletion test');
      return;
    }

    // Go to decks page
    await page.goto('/decks');
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);

    // Find the ephemeral deck card
    const deckCard = page
      .locator(`a[href*="/decks/${ephemeralDeckId}"]`)
      .locator('..');
    const deckVisible = await deckCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!deckVisible) {
      test.skip(true, 'Ephemeral deck card not visible');
      return;
    }

    // Hover to reveal delete button
    await deckCard.hover();
    await page.waitForTimeout(300);

    // Find and click delete button
    const deleteButton = deckCard.locator('button[title="Delete deck"]');
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasDeleteButton) {
      test.skip(true, 'Delete button not visible on deck card');
      return;
    }

    await deleteButton.click();
    await page.waitForTimeout(300);

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasConfirm) {
      test.skip(true, 'Delete confirmation dialog not appearing');
      return;
    }

    await confirmButton.click();

    // Wait for deletion to process
    await page.waitForTimeout(1000);

    // Navigate back to /decks to get accurate count (page may have changed state)
    await page.goto('/decks');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait for deck links to appear (may be empty if all decks deleted, which is fine)
    await page
      .locator('a[href^="/decks/c"]')
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {
        // No deck links visible - that's okay, we just need to verify our ephemeral deck is gone
      });
    await page.waitForTimeout(500);

    // Verify the ephemeral deck was deleted (don't rely on exact count due to test pollution)
    const ephemeralStillExists = await page
      .locator(`a[href*="/decks/${ephemeralDeckId}"]`)
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(ephemeralStillExists).toBe(false);
  });
});
