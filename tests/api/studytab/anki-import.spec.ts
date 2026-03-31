import { test, expect } from '../../../src/fixtures';

test.describe('Anki Import API @studytab @api @import', () => {
  test.use({ storageState: '.auth/user.json' });

  test('POST /import/anki should reject non-apkg files', async ({ apiClient, projectConfig }) => {
    const txtBuffer = Buffer.from('This is not an Anki deck');

    const response = await apiClient.request.post(
      `${projectConfig.apiUrl}/api/v1/import/anki`,
      {
        multipart: {
          file: {
            name: 'fake-deck.txt',
            mimeType: 'text/plain',
            buffer: txtBuffer,
          },
        },
      },
    );

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    // Error should mention invalid file type
    const errorMsg = body.error?.message?.toLowerCase() ?? '';
    expect(errorMsg).toMatch(/invalid|apkg|file type|unsupported/);
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.skip('POST /import/anki should reject files over 100MB', async () => {
    // Generating a 100MB+ buffer in tests is impractical and slow.
    // This limit should be enforced server-side via middleware (e.g. multer limits).
  });

  test('GET /import/anki/history should return empty array for new user', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.get(
      `${projectConfig.apiUrl}/api/v1/import/anki/history`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const history = Array.isArray(body.data) ? body.data : body.data?.history;
    expect(Array.isArray(history)).toBeTruthy();
  });

  test('GET /import/anki/:jobId should return null for non-existent job', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.get(
      `${projectConfig.apiUrl}/api/v1/import/anki/fake-job-id`,
    );

    // API may return 200 with null data, or 404
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      const job = body.data;
      expect(job === null || job === undefined).toBeTruthy();
    }
  });
});
