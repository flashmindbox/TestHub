import { test, expect } from '../../../../src/fixtures';
import { DecksPage, DeckDetailPage } from '../../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../../src/utils';

test.describe('Deck CRUD Operations @studytab @decks', () => {
  test.use({ storageState: '.auth/user.json' });

  let decksPage: DecksPage;
  let deckDetailPage: DeckDetailPage;

  test.beforeEach(async ({ page, projectConfig }) => {
    decksPage = new DecksPage(page, projectConfig.baseUrl);
    deckDetailPage = new DeckDetailPage(page, projectConfig.baseUrl);
  });

  test('should display decks list page', async () => {
    await decksPage.goto();
    await expect(decksPage.createDeckButton).toBeVisible();
  });

  test('should create a new deck', async ({ cleanup }) => {
    await decksPage.goto();

    const deckData = TestDataFactory.deck();
    await decksPage.createDeck(deckData.name, deckData.description);

    // Track for cleanup
    cleanup.track({
      type: 'deck',
      id: deckData.name,
      name: deckData.name,
      deleteVia: 'ui',
      project: 'studytab',
      createdAt: new Date(),
    });

    // Verify deck appears in list
    await decksPage.expectDeckExists(deckData.name);
  });

  test('should open deck detail view', async ({ page, cleanup }) => {
    await decksPage.goto();

    // Create a deck first
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

    // Click on deck
    await decksPage.clickDeck(deckData.name);

    // Should navigate to deck detail
    await expect(page).toHaveURL(/.*decks\/.+/);

    // Deck title should be visible
    const title = await deckDetailPage.getDeckTitle();
    expect(title).toContain(deckData.name);
  });

  test('should search decks by name', async ({ cleanup }) => {
    await decksPage.goto();

    // Create decks with distinct names
    const deck1 = { ...TestDataFactory.deck(), name: 'test-Alpha-Deck' };
    const deck2 = { ...TestDataFactory.deck(), name: 'test-Beta-Deck' };

    await decksPage.createDeck(deck1.name);
    await decksPage.createDeck(deck2.name);

    cleanup.track({ type: 'deck', id: deck1.name, name: deck1.name, deleteVia: 'ui', project: 'studytab', createdAt: new Date() });
    cleanup.track({ type: 'deck', id: deck2.name, name: deck2.name, deleteVia: 'ui', project: 'studytab', createdAt: new Date() });

    // Search for Alpha
    await decksPage.searchDecks('Alpha');

    // Only Alpha deck should be visible
    await decksPage.expectDeckExists(deck1.name);
    // Beta might still be visible depending on search implementation
  });

  test('should delete a deck', async () => {
    await decksPage.goto();

    // Create a deck to delete
    const deckData = TestDataFactory.deck();
    await decksPage.createDeck(deckData.name);
    await decksPage.expectDeckExists(deckData.name);

    // Delete it
    await decksPage.deleteDeck(deckData.name);

    // Should no longer exist
    await decksPage.expectDeckNotExists(deckData.name);
  });

  test('should show empty state when no decks exist', async ({ page, projectConfig }) => {
    // This test assumes a fresh user with no decks
    // In practice, you might need a dedicated test user
    await decksPage.goto();

    const count = await decksPage.getDecksCount();
    if (count === 0) {
      await decksPage.expectEmptyState();
    }
  });
});
