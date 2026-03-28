import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

test.describe('Folder SRS API @studytab @api @folder-srs', () => {
  test.use({ storageState: '.auth/user.json' });

  const api = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;

  async function createFolder(request: any, cfg: { apiUrl: string }, cleanup: any) {
    const name = `${TestDataFactory.uniqueId()}-SRS-Test`;
    const res = await request.post(api(cfg), { data: { name } });
    const body = await res.json();
    cleanup.track({
      type: 'folder', id: body.data.id, name,
      deleteVia: 'api', deletePath: `${api(cfg)}/${body.data.id}`,
      project: 'studytab', createdAt: new Date(),
    });
    return body.data;
  }

  test('GET /folders should include srsState and mastery', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    const res = await request.get(api(projectConfig));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const found = body.data.find((f: any) => f.id === folder.id);
    expect(found).toBeDefined();
    expect(found).toHaveProperty('mastery');
    expect(found).toHaveProperty('srsState');
    expect(found.srsState).toBeNull(); // No SRS state yet
    expect(found.mastery).toBe(0);
  });

  test('POST /folders/:id/schedule should create SRS state', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request.post(`${api(projectConfig)}/${folder.id}/schedule`, {
      data: { dueDate },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify SRS state was created
    const listRes = await request.get(api(projectConfig));
    const list = await listRes.json();
    const updated = list.data.find((f: any) => f.id === folder.id);
    expect(updated.srsState).not.toBeNull();
    expect(updated.srsState.state).toBeDefined();
  });

  test('POST /folders/:id/review should submit rating and update mastery', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Schedule first to create SRS state
    const dueDate = new Date().toISOString();
    await request.post(`${api(projectConfig)}/${folder.id}/schedule`, {
      data: { dueDate },
    });
    await new Promise((r) => setTimeout(r, 300));

    // Submit review with GOOD rating
    const res = await request.post(`${api(projectConfig)}/${folder.id}/review`, {
      data: { rating: 2, duration: 10 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('nextDue');
    expect(body.data).toHaveProperty('interval');
    expect(body.data).toHaveProperty('mastery');
    expect(body.data.mastery).toBeGreaterThan(0);
  });

  test('POST /folders/:id/review should auto-create SRS state if missing', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Review directly without scheduling first
    const res = await request.post(`${api(projectConfig)}/${folder.id}/review`, {
      data: { rating: 2 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.mastery).toBeGreaterThan(0);
  });

  test('GET /folders/due should return due folders', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Schedule as due now
    await request.post(`${api(projectConfig)}/${folder.id}/schedule`, {
      data: { dueDate: new Date().toISOString() },
    });
    await new Promise((r) => setTimeout(r, 300));

    const res = await request.get(`${api(projectConfig)}/due`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.folders).toBeDefined();
    const found = body.data.folders.find((f: any) => f.id === folder.id);
    expect(found).toBeDefined();
  });

  test('GET /folders/due should not return future-due folders', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Schedule 7 days in the future
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await request.post(`${api(projectConfig)}/${folder.id}/schedule`, {
      data: { dueDate: futureDate },
    });
    await new Promise((r) => setTimeout(r, 300));

    const res = await request.get(`${api(projectConfig)}/due`);
    const body = await res.json();
    const found = body.data.folders.find((f: any) => f.id === folder.id);
    expect(found).toBeUndefined();
  });

  test('POST /folders/:id/postpone should push due date forward', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Schedule as due now
    await request.post(`${api(projectConfig)}/${folder.id}/schedule`, {
      data: { dueDate: new Date().toISOString() },
    });
    await new Promise((r) => setTimeout(r, 300));

    // Postpone 5 days
    const res = await request.post(`${api(projectConfig)}/${folder.id}/postpone`, {
      data: { days: 5 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('due');

    // Should no longer be in due list
    const dueRes = await request.get(`${api(projectConfig)}/due`);
    const dueBody = await dueRes.json();
    const found = dueBody.data.folders.find((f: any) => f.id === folder.id);
    expect(found).toBeUndefined();
  });

  test('POST /folders/:id/reset should reset SRS state', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Create SRS state and review
    await request.post(`${api(projectConfig)}/${folder.id}/review`, {
      data: { rating: 2 },
    });
    await new Promise((r) => setTimeout(r, 300));

    // Reset
    const res = await request.post(`${api(projectConfig)}/${folder.id}/reset`, {});
    expect(res.ok()).toBeTruthy();

    // Verify mastery is back to 0
    const listRes = await request.get(api(projectConfig));
    const list = await listRes.json();
    const updated = list.data.find((f: any) => f.id === folder.id);
    expect(updated.mastery).toBe(0);
    expect(updated.srsState.state).toBe('NEW');
  });

  test('GET /folders/:id/intervals should return preview for each rating', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Create SRS state first
    await request.post(`${api(projectConfig)}/${folder.id}/schedule`, {
      data: { dueDate: new Date().toISOString() },
    });
    await new Promise((r) => setTimeout(r, 300));

    const res = await request.get(`${api(projectConfig)}/${folder.id}/intervals`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.intervals).toHaveProperty('again');
    expect(body.data.intervals).toHaveProperty('hard');
    expect(body.data.intervals).toHaveProperty('good');
    expect(body.data.intervals).toHaveProperty('easy');
  });

  test('GET /folders/forecast should return forecast object', async ({ request, projectConfig }) => {
    const res = await request.get(`${api(projectConfig)}/forecast`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.forecast).toBeDefined();
    // Forecast is a Record<string, number> keyed by date
    expect(typeof body.data.forecast).toBe('object');
  });

  test('review ratings should produce different intervals', async ({ request, projectConfig, cleanup }) => {
    // Create two folders, rate one AGAIN and one EASY
    const folder1 = await createFolder(request, projectConfig, cleanup);
    const folder2 = await createFolder(request, projectConfig, cleanup);

    const res1 = await request.post(`${api(projectConfig)}/${folder1.id}/review`, {
      data: { rating: 0 }, // AGAIN
    });
    const body1 = await res1.json();

    await new Promise((r) => setTimeout(r, 300));

    const res2 = await request.post(`${api(projectConfig)}/${folder2.id}/review`, {
      data: { rating: 3 }, // EASY
    });
    const body2 = await res2.json();

    // EASY should have a longer interval than AGAIN
    expect(body2.data.interval).toBeGreaterThan(body1.data.interval);
  });

  test('/topics should not exist as API route', async ({ request, projectConfig }) => {
    const res = await request.get(`${projectConfig.apiUrl}/api/v1/topics`);
    // Should not return a successful response since topics route was removed
    expect(res.ok()).toBeFalsy();
  });
});
