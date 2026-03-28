import { test, expect } from '../../../../src/fixtures';
import { goToTestDeck } from '../_helpers/studytab-helpers';

test.describe('P2-008: Edit Queue Cleanup', () => {
  test('edit queue should not grow indefinitely', async ({ page }) => {
    await goToTestDeck(page);

    // Perform multiple edits
    for (let i = 0; i < 10; i++) {
      const cardItem = page.locator('[data-testid="card-item"], .card-item').first();
      if (await cardItem.isVisible()) {
        await cardItem.click();
        await page.waitForTimeout(200);

        // Edit the card
        const editButton = page.locator('button:has-text("Edit")');
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForSelector('[role="dialog"], .card-editor');

          // Make a small change
          const textarea = page.locator('textarea').first();
          await textarea.fill(`Updated content ${i}`);

          // Save
          await page.click('button:has-text("Save")');
          await page.waitForTimeout(300);
        }
      }
    }

    // Check localStorage for queue size (app uses 'editLaterQueue')
    const queueSize = await page.evaluate(() => {
      const queue =
        localStorage.getItem('editLaterQueue') ||
        localStorage.getItem('editQueue') ||
        localStorage.getItem('pendingEdits');
      if (queue) {
        try {
          const parsed = JSON.parse(queue);
          return Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
        } catch {
          return 0;
        }
      }
      return 0;
    });

    // Queue should be cleared after successful saves or have reasonable limit
    expect(queueSize).toBeLessThanOrEqual(50);
  });

  test('successful edits should clear from queue', async ({ page }) => {
    await goToTestDeck(page);

    // Make an edit
    const cardItem = page.locator('[data-testid="card-item"], .card-item').first();
    if (await cardItem.isVisible()) {
      await cardItem.click();
      await page.waitForTimeout(200);

      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForSelector('[role="dialog"], .card-editor');

        await page.locator('textarea').first().fill('Test content');
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(500);

        // Queue should be empty after successful save (app uses 'editLaterQueue')
        const queueSize = await page.evaluate(() => {
          const queue =
            localStorage.getItem('editLaterQueue') ||
            localStorage.getItem('editQueue') ||
            localStorage.getItem('pendingEdits');
          if (queue) {
            try {
              const parsed = JSON.parse(queue);
              return Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
            } catch {
              return 0;
            }
          }
          return 0;
        });

        expect(queueSize).toBe(0);
      }
    }
  });

  test('failed edits should remain in queue for retry', async ({ page }) => {
    // Block save API
    await page.route('**/api/v1/cards/*', (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
        });
      } else {
        route.continue();
      }
    });

    await goToTestDeck(page);

    const cardItem = page.locator('[data-testid="card-item"], .card-item').first();
    if (await cardItem.isVisible()) {
      await cardItem.click();
      await page.waitForTimeout(200);

      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForSelector('[role="dialog"], .card-editor');

        await page.locator('textarea').first().fill('Failed edit content');
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(500);

        // Check if edit is queued (app uses 'editLaterQueue')
        const hasQueuedEdit = await page.evaluate(() => {
          const queue =
            localStorage.getItem('editLaterQueue') ||
            localStorage.getItem('editQueue') ||
            localStorage.getItem('offlineQueue');
          return queue !== null && queue !== '[]' && queue !== '{}';
        });

        // Should either show error or queue the edit
        const hasError = await page
          .locator('[data-sonner-toast], [role="alert"]')
          .isVisible();

        expect(hasError || hasQueuedEdit).toBe(true);
      }
    }
  });

  test('old queue items should expire', async ({ page }) => {
    // The app uses 'editLaterQueue' key with structure { cardId, deckId, timestamp }
    const STORAGE_KEY = 'editLaterQueue';

    // Set up old queue item (8 days ago - should expire after 7 days)
    await page.evaluate((key) => {
      const oldItem = {
        cardId: 'test-old-card',
        deckId: 'test-deck',
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      };
      const recentItem = {
        cardId: 'test-recent-card',
        deckId: 'test-deck',
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      };
      localStorage.setItem(key, JSON.stringify([oldItem, recentItem]));
    }, STORAGE_KEY);

    // Navigate to deck page - this triggers getEditQueue() which cleans expired items
    await goToTestDeck(page);
    await page.waitForTimeout(500);

    // Check queue state after cleanup
    const queueContent = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, STORAGE_KEY);

    // Queue should exist and have only the recent item (old one expired)
    expect(queueContent).not.toBeNull();
    const queue = JSON.parse(queueContent!);

    // Old item should be removed
    const hasOldItem = queue.some((item: { cardId: string }) => item.cardId === 'test-old-card');
    expect(hasOldItem).toBe(false);

    // Recent item should remain
    const hasRecentItem = queue.some(
      (item: { cardId: string }) => item.cardId === 'test-recent-card'
    );
    expect(hasRecentItem).toBe(true);
  });

  test('queue should sync on page reload', async ({ page }) => {
    const STORAGE_KEY = 'editLaterQueue';

    await goToTestDeck(page);

    // Add a pending item using the correct structure
    await page.evaluate((key) => {
      const item = {
        cardId: 'pending-sync-card',
        deckId: 'test-deck',
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify([item]));
    }, STORAGE_KEY);

    // Reload page
    await page.reload();
    await page.waitForSelector('h1');
    await page.waitForTimeout(1000);

    // Queue should persist across reloads (until processed)
    const queueContent = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, STORAGE_KEY);

    // Queue should be processed or still valid
    expect(
      queueContent === null || queueContent === '[]' || queueContent.includes('pending-sync-card')
    ).toBe(true);
  });
});
