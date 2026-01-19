import { APIRequestContext } from '@playwright/test';
import { ApiSeeder, createApiSeeder, DeckWithCardsResult, CreatedDeck } from './api-seeder';

/**
 * Result from seeding operations
 */
export interface SeedResult {
  seeder: ApiSeeder;
  deck: CreatedDeck;
  cardIds: string[];
}

/**
 * Seed a standard test deck with 5 sample flashcards
 *
 * Creates a deck with basic Q&A cards suitable for general testing.
 */
export async function seedTestDeck(
  request: APIRequestContext,
  apiUrl: string
): Promise<SeedResult> {
  const seeder = createApiSeeder(request, apiUrl);

  const result = await seeder.createDeckWithCards(
    {
      name: 'sample-deck',
      description: 'Standard test deck with sample flashcards',
    },
    [
      { front: 'What is the capital of France?', back: 'Paris' },
      { front: 'What is 2 + 2?', back: '4' },
      { front: 'What color is the sky?', back: 'Blue' },
      { front: 'How many days in a week?', back: '7' },
      { front: 'What is H2O?', back: 'Water' },
    ]
  );

  return {
    seeder,
    deck: result.deck,
    cardIds: result.cards.map(c => c.id),
  };
}

/**
 * Seed an empty deck with no cards
 *
 * Useful for testing empty states and deck creation flows.
 */
export async function seedEmptyDeck(
  request: APIRequestContext,
  apiUrl: string
): Promise<SeedResult> {
  const seeder = createApiSeeder(request, apiUrl);

  const deck = await seeder.createDeck({
    name: 'empty-deck',
    description: 'Empty test deck with no cards',
  });

  return {
    seeder,
    deck,
    cardIds: [],
  };
}

/**
 * Seed a deck with cards ready for study
 *
 * Creates cards that are in "new" state and ready to be studied.
 * Good for testing study session flows.
 */
export async function seedStudyReadyDeck(
  request: APIRequestContext,
  apiUrl: string
): Promise<SeedResult> {
  const seeder = createApiSeeder(request, apiUrl);

  const result = await seeder.createDeckWithCards(
    {
      name: 'study-ready-deck',
      description: 'Deck with cards ready for study session',
    },
    [
      { front: 'Define photosynthesis', back: 'The process by which plants convert sunlight into energy' },
      { front: 'What is mitochondria?', back: 'The powerhouse of the cell' },
      { front: 'Name the largest planet', back: 'Jupiter' },
    ]
  );

  return {
    seeder,
    deck: result.deck,
    cardIds: result.cards.map(c => c.id),
  };
}

/**
 * Seed a large deck for performance testing
 *
 * Creates a deck with many cards for testing performance and pagination.
 */
export async function seedLargeDeck(
  request: APIRequestContext,
  apiUrl: string,
  cardCount: number = 50
): Promise<SeedResult> {
  const seeder = createApiSeeder(request, apiUrl);

  const cards = Array.from({ length: cardCount }, (_, i) => ({
    front: `Question ${i + 1}: What is the answer to question ${i + 1}?`,
    back: `Answer ${i + 1}`,
  }));

  const result = await seeder.createDeckWithCards(
    {
      name: 'large-deck',
      description: `Large test deck with ${cardCount} cards for performance testing`,
    },
    cards
  );

  return {
    seeder,
    deck: result.deck,
    cardIds: result.cards.map(c => c.id),
  };
}

/**
 * Seed multiple decks for testing deck list views
 */
export async function seedMultipleDecks(
  request: APIRequestContext,
  apiUrl: string,
  count: number = 3
): Promise<{ seeder: ApiSeeder; decks: CreatedDeck[] }> {
  const seeder = createApiSeeder(request, apiUrl);
  const decks: CreatedDeck[] = [];

  const deckConfigs = [
    { name: 'math-deck', description: 'Mathematics flashcards' },
    { name: 'science-deck', description: 'Science flashcards' },
    { name: 'history-deck', description: 'History flashcards' },
    { name: 'language-deck', description: 'Language learning flashcards' },
    { name: 'programming-deck', description: 'Programming concepts' },
  ];

  for (let i = 0; i < Math.min(count, deckConfigs.length); i++) {
    const deck = await seeder.createDeck(deckConfigs[i]);
    decks.push(deck);
  }

  return { seeder, decks };
}

/**
 * Cleanup helper - deletes all test data created by a seeder
 */
export async function cleanupSeedData(seeder: ApiSeeder): Promise<void> {
  await seeder.cleanupCreatedData();
}

/**
 * Cleanup helper - deletes all test data matching the test prefix
 */
export async function cleanupAllTestData(
  request: APIRequestContext,
  apiUrl: string
): Promise<void> {
  const seeder = createApiSeeder(request, apiUrl);
  await seeder.deleteTestData();
}
