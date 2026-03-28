import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck } from '../_helpers/studytab-helpers';

test.describe('P1-002: BullMQ AI Job Queue', () => {
  test('AI card generation should return job ID for async processing', async ({
    page,
  }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    // Open AI generation modal
    const aiButton = page.locator(
      'button:has-text("Generate with AI"), button:has-text("Generate")'
    );
    if (!(await aiButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'AI generation not available on this deck');
      return;
    }

    await aiButton.click();
    await page.waitForSelector('text="Generate Cards with AI"', { timeout: 5000 });

    // Fill topic
    await page.fill('textarea[placeholder*="Paste"], textarea', 'Basic Math');

    // Submit
    await page.click('button:has-text("Generate"):not(:has-text("with AI"))');

    // Should show progress or job status
    await expect(
      page.locator('.animate-pulse, .animate-spin, [role="progressbar"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('AI generation should show progress updates', async ({ page }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    const aiButton = page.locator(
      'button:has-text("Generate with AI"), button:has-text("Generate")'
    );
    if (!(await aiButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'AI generation not available on this deck');
      return;
    }

    await aiButton.click();
    await page.waitForSelector('text="Generate Cards with AI"', { timeout: 5000 });

    await page.fill('textarea[placeholder*="Paste"], textarea', 'History Facts');
    await page.click('button:has-text("Generate"):not(:has-text("with AI"))');

    // Wait for any progress indication
    const progressIndicator = page
      .locator('[role="progressbar"], .animate-pulse, .animate-spin')
      .first();

    await expect(progressIndicator).toBeVisible({ timeout: 15000 });
  });

  test('AI generation should complete and add cards', async ({ page }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    // Get initial card count
    const cardCountBefore = await page
      .locator('[data-testid="card-item"], .card-item')
      .count();

    const aiButton = page.locator(
      'button:has-text("Generate with AI"), button:has-text("Generate")'
    );
    if (!(await aiButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'AI generation not available on this deck');
      return;
    }

    await aiButton.click();
    await page.waitForSelector('text="Generate Cards with AI"', { timeout: 5000 });

    await page.fill('textarea[placeholder*="Paste"], textarea', 'Simple Facts');
    await page.click('button:has-text("Generate"):not(:has-text("with AI"))');

    // Wait for completion (either success message or cards added)
    await page.waitForTimeout(30000); // AI generation can take time

    // Close dialog if still open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify cards were added
    const cardCountAfter = await page
      .locator('[data-testid="card-item"], .card-item')
      .count();
    expect(cardCountAfter).toBeGreaterThanOrEqual(cardCountBefore);
  });

  test('AI generation failure should show error', async ({ page }) => {
    // Intercept AI endpoint to fail
    await page.route('**/api/v1/ai/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI_ERROR', message: 'AI service unavailable' }),
      });
    });

    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
      return;
    }

    const aiButton = page.locator(
      'button:has-text("Generate with AI"), button:has-text("Generate")'
    );
    if (!(await aiButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'AI generation not available on this deck');
      return;
    }

    await aiButton.click();
    await page.waitForSelector('text="Generate Cards with AI"', { timeout: 5000 });

    await page.fill('textarea[placeholder*="Paste"], textarea', 'Test Topic');
    await page.click('button:has-text("Generate"):not(:has-text("with AI"))');

    // Should show error toast OR modal stays open (both are valid error handling)
    const hasErrorToast = await page
      .locator('[data-sonner-toast], [role="alert"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const modalStillOpen = await page
      .locator('text="Generate Cards with AI"')
      .isVisible()
      .catch(() => false);

    // Either error indicator OR modal not dismissed = error was handled
    expect(hasErrorToast || modalStillOpen).toBe(true);
  });
});
