/**
 * Card API Contract Tests
 *
 * Validates that Card API responses match expected Zod schemas.
 * These tests ensure API contracts are maintained across changes.
 *
 * @tags @studytab @api @contracts @cards
 */

import { test, expect } from '../../../../src/fixtures';
import { TestDataFactory } from '../../../../src/utils';
import { seedTestDeck, cleanupSeedData } from '../../../../src/utils/seed-helpers';
import {
  expectContractValid,
  createContractValidator,
} from '../../../../src/utils/contract-validator';
import {
  CardSchema,
  ApiResponseSchema,
} from '../../../../src/contracts/studytab';
import { z } from 'zod';

// Response wrapper schemas for card endpoints
const CardResponseSchema = ApiResponseSchema(CardSchema);
const CardListResponseSchema = ApiResponseSchema(z.array(CardSchema));
const DeleteResponseSchema = ApiResponseSchema(z.object({}).passthrough());

test.describe('Card API Contract Tests @studytab @api @contracts', () => {
  // Use authenticated API context
  test.use({ storageState: '.auth/user.json' });

  // Create validator for tracking stats
  const validator = createContractValidator();

  test.afterAll(() => {
    const stats = validator.getStats();
    console.log(`Card contract validation stats: ${stats.passed}/${stats.total} passed (${stats.passRate.toFixed(1)}%)`);
  });

  test('POST /api/v1/decks/:id/cards returns valid CardResponse', async ({ request, projectConfig, cleanup }) => {
    // First create a deck
    const deckData = TestDataFactory.deck();
    const deckResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const deckBody = await deckResponse.json();
    const deckId = deckBody.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Create a card in the deck
    const cardData = TestDataFactory.card();
    const response = await request.post(`${projectConfig.apiUrl}/decks/${deckId}/cards`, {
      data: {
        front: cardData.front,
        back: cardData.back,
        type: 'basic',
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, CardResponseSchema, validator);

    // Validate response structure
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data!.id).toBeDefined();
    expect(data.data!.front).toBe(cardData.front);
    expect(data.data!.back).toBe(cardData.back);
  });

  test('GET /api/v1/decks/:id/cards returns valid CardListResponse', async ({ request, projectConfig }) => {
    // Seed a deck with cards
    const seedResult = await seedTestDeck(request, projectConfig.apiUrl);

    try {
      // Get cards for the deck
      const response = await request.get(`${projectConfig.apiUrl}/decks/${seedResult.deck.id}/cards`);

      expect(response.ok()).toBeTruthy();

      const data = await expectContractValid(response, CardListResponseSchema, validator);

      // Validate response structure
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      // Should have cards from seeding
      if (data.data && data.data.length > 0) {
        const firstCard = data.data[0];
        expect(firstCard).toHaveProperty('id');
        expect(firstCard).toHaveProperty('front');
        expect(firstCard).toHaveProperty('back');
      }
    } finally {
      await cleanupSeedData(seedResult.seeder);
    }
  });

  test('PUT /api/v1/cards/:id returns valid CardResponse', async ({ request, projectConfig, cleanup }) => {
    // Create a deck
    const deckData = TestDataFactory.deck();
    const deckResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const deckBody = await deckResponse.json();
    const deckId = deckBody.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Create a card
    const cardData = TestDataFactory.card();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks/${deckId}/cards`, {
      data: {
        front: cardData.front,
        back: cardData.back,
      },
    });
    const cardBody = await createResponse.json();
    const cardId = cardBody.data.id;

    // Update the card
    const updatedFront = 'Updated question content';
    const updatedBack = 'Updated answer content';
    const response = await request.put(`${projectConfig.apiUrl}/cards/${cardId}`, {
      data: {
        front: updatedFront,
        back: updatedBack,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, CardResponseSchema, validator);

    // Validate response
    expect(data.success).toBe(true);
    expect(data.data!.front).toBe(updatedFront);
    expect(data.data!.back).toBe(updatedBack);
  });

  test('DELETE /api/v1/cards/:id returns valid response', async ({ request, projectConfig, cleanup }) => {
    // Create a deck
    const deckData = TestDataFactory.deck();
    const deckResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const deckBody = await deckResponse.json();
    const deckId = deckBody.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Create a card
    const cardData = TestDataFactory.card();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks/${deckId}/cards`, {
      data: {
        front: cardData.front,
        back: cardData.back,
      },
    });
    const cardBody = await createResponse.json();
    const cardId = cardBody.data.id;

    // Delete the card
    const response = await request.delete(`${projectConfig.apiUrl}/cards/${cardId}`);

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, DeleteResponseSchema, validator);
    expect(data.success).toBe(true);
  });

  test('POST /api/v1/decks/:id/cards validates required fields', async ({ request, projectConfig, cleanup }) => {
    // Create a deck
    const deckData = TestDataFactory.deck();
    const deckResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const deckBody = await deckResponse.json();
    const deckId = deckBody.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Try to create card without required fields
    const response = await request.post(`${projectConfig.apiUrl}/decks/${deckId}/cards`, {
      data: {
        front: 'Only front, no back',
      },
    });

    expect(response.ok()).toBeFalsy();

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('card response contains correct field types', async ({ request, projectConfig, cleanup }) => {
    // Create a deck
    const deckData = TestDataFactory.deck();
    const deckResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const deckBody = await deckResponse.json();
    const deckId = deckBody.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Create a card with all fields
    const cardData = TestDataFactory.card();
    const response = await request.post(`${projectConfig.apiUrl}/decks/${deckId}/cards`, {
      data: {
        front: cardData.front,
        back: cardData.back,
        type: 'basic',
      },
    });

    const body = await response.json();
    const card = body.data;

    // Validate field types
    expect(typeof card.id).toBe('string');
    expect(typeof card.front).toBe('string');
    expect(typeof card.back).toBe('string');

    // Optional fields
    if (card.type !== undefined) {
      expect(typeof card.type).toBe('string');
    }
    if (card.deckId !== undefined) {
      expect(typeof card.deckId).toBe('string');
    }
  });

  test('GET /api/v1/cards/:id with invalid ID returns error', async ({ request, projectConfig }) => {
    const invalidId = 'non-existent-card-id-12345';
    const response = await request.get(`${projectConfig.apiUrl}/cards/${invalidId}`);

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
