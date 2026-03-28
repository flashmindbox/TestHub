import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

test.describe('Admin Content Moderation @studytab @api @admin', () => {
  test.use({ storageState: '.auth/admin.json' });

  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;

  // Shared state for the test sequence
  let deckId: string;
  let reportId: string;
  let secondReportId: string;

  test.beforeAll(async ({ request, projectConfig }) => {
    // Create a deck to report against (using user auth)
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const deckData = TestDataFactory.deck();
    const createResponse = await userCtx.post(`${projectConfig.apiUrl}/decks`, {
      data: { name: deckData.name, description: deckData.description },
    });
    const created = await createResponse.json();
    deckId = created.data.id;

    await userCtx.dispose();
  });

  test.afterAll(async ({ request, projectConfig }) => {
    // Clean up the test deck
    if (deckId) {
      const userCtx = await request.newContext({
        storageState: '.auth/user.json',
      });
      await userCtx.delete(`${projectConfig.apiUrl}/decks/${deckId}`);
      await userCtx.dispose();
    }
  });

  test('POST /reports creates a report (user auth)', async ({ request, projectConfig }) => {
    // Use user auth for reporting (user-facing endpoint)
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/reports`, {
      data: {
        targetType: 'deck',
        targetId: deckId,
        reason: 'inappropriate',
        description: 'Test report - automated testing',
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id');
    reportId = body.data.id;

    await userCtx.dispose();
  });

  test('GET /admin/reports lists reports with the newly created one', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/reports`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const reports = Array.isArray(body.data) ? body.data : body.data?.reports;
    expect(Array.isArray(reports)).toBeTruthy();

    // The report we created should be in the list
    if (reportId) {
      const found = reports.find((r: { id: string }) => r.id === reportId);
      expect(found).toBeTruthy();
    }
  });

  test('GET /admin/reports/:id returns report detail with target content', async ({ request, projectConfig }) => {
    expect(reportId).toBeTruthy();

    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/reports/${reportId}`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id', reportId);
    expect(body.data).toHaveProperty('targetType');
    expect(body.data).toHaveProperty('targetId');
  });

  test('PUT /admin/reports/:id/resolve resolves the report', async ({ request, projectConfig }) => {
    expect(reportId).toBeTruthy();

    const response = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/reports/${reportId}/resolve`,
      {
        data: {
          resolution: 'no_action',
          notes: 'Test resolution - automated testing',
        },
      },
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
  });

  test('PUT /admin/reports/:id/dismiss works on a second report', async ({ request, projectConfig }) => {
    // Create a second report (user auth)
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const createResponse = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/reports`, {
      data: {
        targetType: 'deck',
        targetId: deckId,
        reason: 'spam',
        description: 'Second test report - automated testing',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createBody = await createResponse.json();
    secondReportId = createBody.data.id;

    await userCtx.dispose();

    // Dismiss the second report (admin auth)
    const dismissResponse = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/reports/${secondReportId}/dismiss`,
      {
        data: {
          notes: 'Dismissed - automated testing',
        },
      },
    );

    expect(dismissResponse.ok()).toBeTruthy();

    const body = await dismissResponse.json();
    expect(body).toHaveProperty('success', true);
  });
});
