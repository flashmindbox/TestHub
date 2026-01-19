import { APIRequestContext } from '@playwright/test';
import { createApiClient, ApiClient } from './api-client';

/**
 * Test data prefix for easy identification and cleanup
 */
const TEST_PREFIX = 'test-';

/**
 * Types for API responses
 */
export interface DeckResponse {
  id: string;
  name: string;
  description?: string;
  cardCount?: number;
}

export interface CardResponse {
  id: string;
  deckId: string;
  front: string;
  back: string;
  type?: string;
}

export interface CreateDeckInput {
  name: string;
  description?: string;
}

export interface CreateCardInput {
  front: string;
  back: string;
  type?: 'basic' | 'cloze' | 'mcq';
}

export interface CreatedDeck {
  id: string;
  name: string;
}

export interface CreatedCard {
  id: string;
}

export interface DeckWithCardsResult {
  deck: CreatedDeck;
  cards: CreatedCard[];
}

/**
 * API Seeder for creating test data via API calls
 *
 * Uses the StudyTab API to create decks and cards for testing.
 * All created resources use a "test-" prefix for easy identification.
 */
export class ApiSeeder {
  private client: ApiClient;
  private createdDeckIds: string[] = [];
  private createdCardIds: string[] = [];

  constructor(request: APIRequestContext, apiUrl: string) {
    this.client = createApiClient(request, { baseUrl: apiUrl });
  }

  /**
   * Generate a unique test name with prefix
   */
  private generateTestName(baseName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${TEST_PREFIX}${baseName}-${timestamp}-${random}`;
  }

  /**
   * Create a deck via API
   */
  async createDeck(data: CreateDeckInput): Promise<CreatedDeck> {
    const name = data.name.startsWith(TEST_PREFIX)
      ? data.name
      : this.generateTestName(data.name);

    const response = await this.client.post<DeckResponse>('/v1/decks', {
      name,
      description: data.description || `Test deck created at ${new Date().toISOString()}`,
    });

    this.createdDeckIds.push(response.id);

    return {
      id: response.id,
      name: response.name,
    };
  }

  /**
   * Create a card in a deck via API
   */
  async createCard(deckId: string, data: CreateCardInput): Promise<CreatedCard> {
    const response = await this.client.post<CardResponse>('/v1/cards', {
      deckId,
      front: data.front,
      back: data.back,
      type: data.type || 'basic',
    });

    this.createdCardIds.push(response.id);

    return {
      id: response.id,
    };
  }

  /**
   * Create a deck with multiple cards
   */
  async createDeckWithCards(
    deckData: CreateDeckInput,
    cards: CreateCardInput[]
  ): Promise<DeckWithCardsResult> {
    // Create the deck first
    const deck = await this.createDeck(deckData);

    // Create all cards sequentially
    const createdCards: CreatedCard[] = [];
    for (const cardData of cards) {
      const card = await this.createCard(deck.id, cardData);
      createdCards.push(card);
    }

    return {
      deck,
      cards: createdCards,
    };
  }

  /**
   * Delete a specific deck by ID
   */
  async deleteDeck(deckId: string): Promise<void> {
    try {
      await this.client.delete(`/v1/decks/${deckId}`);
      this.createdDeckIds = this.createdDeckIds.filter(id => id !== deckId);
    } catch (error) {
      console.warn(`[ApiSeeder] Failed to delete deck ${deckId}:`, error);
    }
  }

  /**
   * Delete a specific card by ID
   */
  async deleteCard(cardId: string): Promise<void> {
    try {
      await this.client.delete(`/v1/cards/${cardId}`);
      this.createdCardIds = this.createdCardIds.filter(id => id !== cardId);
    } catch (error) {
      console.warn(`[ApiSeeder] Failed to delete card ${cardId}:`, error);
    }
  }

  /**
   * Delete all test data created by this seeder instance
   */
  async cleanupCreatedData(): Promise<void> {
    console.log(`[ApiSeeder] Cleaning up ${this.createdDeckIds.length} decks and ${this.createdCardIds.length} cards...`);

    // Delete decks (which should cascade delete cards)
    for (const deckId of [...this.createdDeckIds]) {
      await this.deleteDeck(deckId);
    }

    // Clear tracking arrays
    this.createdDeckIds = [];
    this.createdCardIds = [];

    console.log('[ApiSeeder] Cleanup completed');
  }

  /**
   * Delete all test data matching a prefix
   * Note: This requires API support for listing/filtering resources
   */
  async deleteTestData(prefix: string = TEST_PREFIX): Promise<void> {
    try {
      // Get all decks and filter by prefix
      const decks = await this.client.get<DeckResponse[]>('/v1/decks');

      if (Array.isArray(decks)) {
        const testDecks = decks.filter(deck => deck.name.startsWith(prefix));
        console.log(`[ApiSeeder] Found ${testDecks.length} test decks to delete`);

        for (const deck of testDecks) {
          await this.deleteDeck(deck.id);
        }
      }
    } catch (error) {
      console.warn('[ApiSeeder] Failed to delete test data:', error);
    }
  }

  /**
   * Get list of created deck IDs (for manual cleanup)
   */
  getCreatedDeckIds(): string[] {
    return [...this.createdDeckIds];
  }

  /**
   * Get list of created card IDs (for manual cleanup)
   */
  getCreatedCardIds(): string[] {
    return [...this.createdCardIds];
  }
}

/**
 * Create an ApiSeeder instance
 */
export function createApiSeeder(request: APIRequestContext, apiUrl: string): ApiSeeder {
  return new ApiSeeder(request, apiUrl);
}
