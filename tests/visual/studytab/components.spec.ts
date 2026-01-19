import { test, expect } from '../../../src/fixtures';
import { DecksPage } from '../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../src/utils';

test.describe('Visual Regression - Components @studytab @visual', () => {
  test.use({ storageState: '.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('navigation component', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav, header, [data-testid="navigation"]').first();
    await expect(nav).toHaveScreenshot('navigation.png', {
      animations: 'disabled',
    });
  });

  test('user menu dropdown', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[role="menu"], .dropdown-menu, .user-dropdown').first();
      await expect(dropdown).toHaveScreenshot('user-menu-dropdown.png', {
        animations: 'disabled',
      });
    }
  });

  test('create deck modal', async ({ page, projectConfig }) => {
    const decksPage = new DecksPage(page, projectConfig.baseUrl);
    await decksPage.goto();

    await decksPage.createDeckButton.click();
    await decksPage.modal.waitForOpen();

    await expect(decksPage.modal.modal).toHaveScreenshot('create-deck-modal.png', {
      animations: 'disabled',
    });

    await decksPage.modal.close();
  });

  test('deck card component', async ({ page, projectConfig, cleanup }) => {
    const decksPage = new DecksPage(page, projectConfig.baseUrl);
    await decksPage.goto();

    // Create a test deck if none exist
    const existingDecks = await decksPage.getDecksCount();
    if (existingDecks === 0) {
      const deckData = TestDataFactory.deck();
      await decksPage.createDeck(deckData.name);
      cleanup.track({
        type: 'deck',
        id: deckData.name,
        name: deckData.name,
        deleteVia: 'ui',
        project: 'studytab',
        createdAt: new Date(),
      });
    }

    const deckCard = decksPage.deckCards.first();
    if (await deckCard.isVisible()) {
      await expect(deckCard).toHaveScreenshot('deck-card.png', {
        animations: 'disabled',
      });
    }
  });

  test('empty state', async ({ page, projectConfig }) => {
    // This captures the empty state design
    await page.goto(`${projectConfig.baseUrl}/decks`);
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state').first();
    if (await emptyState.isVisible()) {
      await expect(emptyState).toHaveScreenshot('empty-state.png', {
        animations: 'disabled',
      });
    }
  });
});
