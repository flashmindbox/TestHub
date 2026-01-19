import { test, expect } from '../../../../src/fixtures';
import { DecksPage, DeckDetailPage } from '../../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../../src/utils';

test.describe('Card Management @studytab @decks @cards', () => {
  test.use({ storageState: '.auth/user.json' });

  let decksPage: DecksPage;
  let deckDetailPage: DeckDetailPage;
  let testDeckName: string;

  test.beforeEach(async ({ page, projectConfig, cleanup }) => {
    decksPage = new DecksPage(page, projectConfig.baseUrl);
    deckDetailPage = new DeckDetailPage(page, projectConfig.baseUrl);

    // Create a test deck for card operations
    await decksPage.goto();
    testDeckName = TestDataFactory.deck().name;
    await decksPage.createDeck(testDeckName);

    cleanup.track({
      type: 'deck',
      id: testDeckName,
      name: testDeckName,
      deleteVia: 'ui',
      project: 'studytab',
      createdAt: new Date(),
    });

    // Navigate to deck detail
    await decksPage.clickDeck(testDeckName);
  });

  test('should display deck detail with add card button', async () => {
    await expect(deckDetailPage.deckTitle).toBeVisible();
    await expect(deckDetailPage.addCardButton).toBeVisible();
  });

  test('should add a basic flashcard', async () => {
    const cardData = TestDataFactory.card();
    const initialCount = await deckDetailPage.getCardsCount();

    await deckDetailPage.addBasicCard(cardData.front, cardData.back);

    // Card count should increase
    const newCount = await deckDetailPage.getCardsCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should add multiple cards', async () => {
    const cards = TestDataFactory.many(TestDataFactory.card, 3);
    const initialCount = await deckDetailPage.getCardsCount();

    for (const card of cards) {
      await deckDetailPage.addBasicCard(card.front, card.back);
    }

    const newCount = await deckDetailPage.getCardsCount();
    expect(newCount).toBe(initialCount + 3);
  });

  test('should edit an existing card', async ({ page }) => {
    // First add a card
    const originalCard = TestDataFactory.card();
    await deckDetailPage.addBasicCard(originalCard.front, originalCard.back);

    // Edit it
    const updatedFront = 'Updated Front Content';
    const updatedBack = 'Updated Back Content';
    await deckDetailPage.editCard(0, updatedFront, updatedBack);

    // Verify update (check if card content changed)
    const cardItem = deckDetailPage.cardItems.first();
    await expect(cardItem).toContainText(updatedFront);
  });

  test('should delete a card', async () => {
    // Add a card
    const cardData = TestDataFactory.card();
    await deckDetailPage.addBasicCard(cardData.front, cardData.back);

    const countAfterAdd = await deckDetailPage.getCardsCount();
    expect(countAfterAdd).toBeGreaterThan(0);

    // Delete it
    await deckDetailPage.deleteCard(0);

    const countAfterDelete = await deckDetailPage.getCardsCount();
    expect(countAfterDelete).toBe(countAfterAdd - 1);
  });

  test('should navigate back to decks list', async ({ page, projectConfig }) => {
    await deckDetailPage.goBack();
    await expect(page).toHaveURL(/.*decks$/);
  });

  test('should start study from deck detail', async ({ page }) => {
    // Add some cards first
    const cards = TestDataFactory.many(TestDataFactory.card, 3);
    for (const card of cards) {
      await deckDetailPage.addBasicCard(card.front, card.back);
    }

    // Start study
    await deckDetailPage.startStudy();
    await expect(page).toHaveURL(/.*study.*/);
  });
});
