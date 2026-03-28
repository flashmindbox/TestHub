import { test, expect } from '../../../src/fixtures';

test.describe('Admin Feature Flags @studytab @api @admin', () => {
  test.use({ storageState: '.auth/admin.json' });

  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;
  const flagKey = `test_flag_${Date.now()}`;
  let flagId: string;

  test.afterAll(async ({ request, projectConfig }) => {
    // Clean up the feature flag if it still exists
    if (flagId) {
      await request.delete(`${apiBase(projectConfig.apiUrl)}/admin/features/${flagId}`);
    }
  });

  test('POST /admin/features creates a feature flag', async ({ request, projectConfig }) => {
    const response = await request.post(`${apiBase(projectConfig.apiUrl)}/admin/features`, {
      data: {
        key: flagKey,
        name: 'Test Feature Flag',
        description: 'Automated test flag',
        enabled: false,
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('key', flagKey);
    expect(body.data.enabled).toBe(false);

    flagId = body.data.id;
  });

  test('GET /admin/features lists the created flag', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/features`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const flags = Array.isArray(body.data) ? body.data : body.data?.features;
    expect(Array.isArray(flags)).toBeTruthy();

    // Our flag should be in the list
    const found = flags.find((f: { key: string }) => f.key === flagKey);
    expect(found).toBeTruthy();
  });

  test('PUT /admin/features/:id toggles the flag', async ({ request, projectConfig }) => {
    expect(flagId).toBeTruthy();

    const response = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/features/${flagId}`,
      { data: { enabled: true } },
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data.enabled).toBe(true);
  });

  test('GET /features/check/:key returns enabled status', async ({ request, projectConfig }) => {
    const response = await request.get(
      `${apiBase(projectConfig.apiUrl)}/features/check/${flagKey}`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('enabled', true);
  });

  test('DELETE /admin/features/:id deletes the flag', async ({ request, projectConfig }) => {
    expect(flagId).toBeTruthy();

    const response = await request.delete(
      `${apiBase(projectConfig.apiUrl)}/admin/features/${flagId}`,
    );

    expect(response.ok()).toBeTruthy();

    // Verify it's gone
    const checkResponse = await request.get(
      `${apiBase(projectConfig.apiUrl)}/admin/features/${flagId}`,
    );
    expect(checkResponse.status()).toBe(404);

    // Clear so afterAll doesn't try to delete again
    flagId = '';
  });
});
