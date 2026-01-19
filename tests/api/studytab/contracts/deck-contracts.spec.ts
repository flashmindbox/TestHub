/**
 * Deck API Contract Tests
 *
 * Validates that Deck API responses match expected Zod schemas.
 * These tests ensure API contracts are maintained across changes.
 *
 * @tags @studytab @api @contracts @decks
 */

import { test, expect } from '../../../../src/fixtures';
import { TestDataFactory } from '../../../../src/utils';
import {
  expectContractValid,
  createContractValidator,
} from '../../../../src/utils/contract-validator';
import {
  DeckSchema,
  DeckSummarySchema,
  ApiResponseSchema,
  ApiErrorResponseSchema,
  HealthResponseSchema,
} from '../../../../src/contracts/studytab';
import { z } from 'zod';

// Response wrapper schemas for deck endpoints
const DeckListResponseSchema = ApiResponseSchema(z.array(DeckSchema));
const DeckResponseSchema = ApiResponseSchema(DeckSchema);
const DeckDetailResponseSchema = ApiResponseSchema(
  DeckSchema.extend({
    cards: z.array(z.object({
      id: z.string(),
      front: z.string(),
      back: z.string(),
      type: z.string().optional(),
    })).optional(),
  })
);
const DeleteResponseSchema = ApiResponseSchema(z.object({}).passthrough());

test.describe('Deck API Contract Tests @studytab @api @contracts', () => {
  // Use authenticated API context
  test.use({ storageState: '.auth/user.json' });

  // Create validator for tracking stats
  const validator = createContractValidator();

  test.afterAll(() => {
    const stats = validator.getStats();
    console.log(`Contract validation stats: ${stats.passed}/${stats.total} passed (${stats.passRate.toFixed(1)}%)`);
  });

  test('GET /api/v1/decks returns valid DeckListResponse', async ({ request, projectConfig }) => {
    const response = await request.get(`${projectConfig.apiUrl}/decks`);

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, DeckListResponseSchema, validator);

    // Additional structural checks
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // If there are decks, validate each one has required fields
    if (data.data && data.data.length > 0) {
      const firstDeck = data.data[0];
      expect(firstDeck).toHaveProperty('id');
      expect(firstDeck).toHaveProperty('name');
    }
  });

  test('POST /api/v1/decks returns valid DeckResponse', async ({ request, projectConfig, cleanup }) => {
    const deckData = TestDataFactory.deck();

    const response = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: {
        name: deckData.name,
        description: deckData.description,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, DeckResponseSchema, validator);

    // Validate response structure
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data!.id).toBeDefined();
    expect(data.data!.name).toBe(deckData.name);

    // Track for cleanup
    cleanup.track({
      type: 'deck',
      id: data.data!.id,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${data.data!.id}`,
      project: 'studytab',
      createdAt: new Date(),
    });
  });

  test('GET /api/v1/decks/:id returns valid DeckDetailResponse', async ({ request, projectConfig, cleanup }) => {
    // Create a deck first
    const deckData = TestDataFactory.deck();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name, description: deckData.description },
    });
    const created = await createResponse.json();
    const deckId = created.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Get the deck
    const response = await request.get(`${projectConfig.apiUrl}/decks/${deckId}`);

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, DeckDetailResponseSchema, validator);

    // Validate response
    expect(data.success).toBe(true);
    expect(data.data!.id).toBe(deckId);
    expect(data.data!.name).toBe(deckData.name);
  });

  test('PUT /api/v1/decks/:id returns valid DeckResponse', async ({ request, projectConfig, cleanup }) => {
    // Create a deck first
    const deckData = TestDataFactory.deck();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const created = await createResponse.json();
    const deckId = created.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Update the deck
    const newName = `Updated ${deckData.name}`;
    const response = await request.put(`${projectConfig.apiUrl}/decks/${deckId}`, {
      data: { name: newName },
    });

    expect(response.ok()).toBeTruthy();

    const data = await expectContractValid(response, DeckResponseSchema, validator);

    // Validate response
    expect(data.success).toBe(true);
    expect(data.data!.name).toBe(newName);
  });

  test('DELETE /api/v1/decks/:id returns valid response', async ({ request, projectConfig }) => {
    // Create a deck to delete
    const deckData = TestDataFactory.deck();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const created = await createResponse.json();
    const deckId = created.data.id;

    // Delete it
    const response = await request.delete(`${projectConfig.apiUrl}/decks/${deckId}`);

    expect(response.ok()).toBeTruthy();

    // Delete responses may vary - validate it's a valid API response
    const data = await expectContractValid(response, DeleteResponseSchema, validator);
    expect(data.success).toBe(true);
  });

  test('GET /api/v1/decks/:id with invalid ID returns valid ApiError', async ({ request, projectConfig }) => {
    const invalidId = 'non-existent-deck-id-12345';
    const response = await request.get(`${projectConfig.apiUrl}/decks/${invalidId}`);

    expect(response.status()).toBe(404);

    // Validate error response structure
    const body = await response.json();

    // API should return a structured error
    expect(body.success).toBe(false);

    // The error may have an error object or just success: false
    if (body.error) {
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    }
  });

  test('POST /api/v1/decks with invalid data returns error response', async ({ request, projectConfig }) => {
    // Missing required 'name' field
    const response = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: {
        description: 'No name provided',
      },
    });

    expect(response.ok()).toBeFalsy();

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('deck list response contains correct field types', async ({ request, projectConfig, cleanup }) => {
    // Create a deck with known data
    const deckData = TestDataFactory.deck();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: {
        name: deckData.name,
        description: deckData.description,
      },
    });
    const created = await createResponse.json();
    const deckId = created.data.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${deckId}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    // Get deck list
    const response = await request.get(`${projectConfig.apiUrl}/decks`);
    const data = await response.json();

    // Find our deck in the list
    const ourDeck = data.data.find((d: { id: string }) => d.id === deckId);
    expect(ourDeck).toBeDefined();

    // Validate field types
    expect(typeof ourDeck.id).toBe('string');
    expect(typeof ourDeck.name).toBe('string');
    if (ourDeck.description !== null && ourDeck.description !== undefined) {
      expect(typeof ourDeck.description).toBe('string');
    }
    if (ourDeck.cardCount !== undefined) {
      expect(typeof ourDeck.cardCount).toBe('number');
    }
  });
});
