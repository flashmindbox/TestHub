import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

test.describe('Decks API Endpoints @studytab @api @decks', () => {
  // Use authenticated API context
  test.use({ storageState: '.auth/user.json' });

  test('should list user decks', async ({ request, projectConfig }) => {
    const response = await request.get(`${projectConfig.apiUrl}/decks`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('should create a new deck', async ({ request, projectConfig, cleanup }) => {
    const deckData = TestDataFactory.deck();

    const response = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: {
        name: deckData.name,
        description: deckData.description,
        isPublic: false,
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.name).toBe(deckData.name);

    // Track for cleanup
    cleanup.track({
      type: 'deck',
      id: body.data.id,
      name: deckData.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/decks/${body.data.id}`,
      project: 'studytab',
      createdAt: new Date(),
    });
  });

  test('should get deck by ID', async ({ request, projectConfig, cleanup }) => {
    // First create a deck
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

    // Get the deck
    const response = await request.get(`${projectConfig.apiUrl}/decks/${deckId}`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data.id).toBe(deckId);
    expect(body.data.name).toBe(deckData.name);
  });

  test('should update a deck', async ({ request, projectConfig, cleanup }) => {
    // Create a deck
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

    // Update it
    const newName = 'Updated Deck Name';
    const updateResponse = await request.put(`${projectConfig.apiUrl}/decks/${deckId}`, {
      data: { name: newName },
    });

    expect(updateResponse.ok()).toBeTruthy();

    const body = await updateResponse.json();
    expect(body.data.name).toBe(newName);
  });

  test('should delete a deck', async ({ request, projectConfig }) => {
    // Create a deck to delete
    const deckData = TestDataFactory.deck();
    const createResponse = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name },
    });
    const created = await createResponse.json();
    const deckId = created.data.id;

    // Delete it
    const deleteResponse = await request.delete(`${projectConfig.apiUrl}/decks/${deckId}`);

    expect(deleteResponse.ok()).toBeTruthy();

    // Verify it's gone
    const getResponse = await request.get(`${projectConfig.apiUrl}/decks/${deckId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('should return 404 for non-existent deck', async ({ request, projectConfig }) => {
    const response = await request.get(`${projectConfig.apiUrl}/decks/non-existent-id-12345`);

    expect(response.status()).toBe(404);
  });

  test('should validate deck name is required', async ({ request, projectConfig }) => {
    const response = await request.post(`${projectConfig.apiUrl}/decks`, {
      data: {
        description: 'No name provided',
      },
    });

    expect(response.ok()).toBeFalsy();
  });
});
