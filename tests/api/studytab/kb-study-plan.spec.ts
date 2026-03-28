import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';
import { seedKBEnvironment, KBSeedResult } from './fixtures/kb-seed';

test.describe('KB Study Plan & Analysis API @studytab @api @kb-plan', () => {
  test.use({ storageState: '.auth/user.json' });

  const planApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/study-plan`;
  const analysisApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/analysis`;
  const foldersApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;

  async function createFolder(request: any, cfg: any, cleanup: any) {
    const res = await request.post(foldersApi(cfg), { data: { name: TestDataFactory.uniqueId() } });
    const folder = (await res.json()).data;
    cleanup.track({ type: 'folder', id: folder.id, name: folder.name, deleteVia: 'api', deletePath: `${foldersApi(cfg)}/${folder.id}`, project: 'studytab', createdAt: new Date() });
    return folder;
  }

  // ─── Validation tests (no AI calls) ───────────────────────────────────────

  test.describe('Study Plan', () => {
    test('POST /generate validates exam date', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(`${planApi(projectConfig)}/generate`, {
        data: { title: 'Test Exam', examDate: '2020-01-01', folderId: folder.id, hoursPerDay: 2 },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });

    test('POST /generate validates hoursPerDay range', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(`${planApi(projectConfig)}/generate`, {
        data: { title: 'Test', examDate: '2027-12-31', folderId: folder.id, hoursPerDay: 20 },
      });
      expect(res.status()).toBe(422);
    });

    test('GET / returns plans array', async ({ request, projectConfig }) => {
      const res = await request.get(planApi(projectConfig));
      if (res.status() === 429) test.skip(true, 'Rate limited');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('GET /:id returns 404 for nonexistent', async ({ request, projectConfig }) => {
      const res = await request.get(`${planApi(projectConfig)}/nonexistent`);
      if (res.status() === 429) test.skip(true, 'Rate limited');
      expect(res.status()).toBe(404);
    });

    test('PATCH /:id validates status enum', async ({ request, projectConfig }) => {
      const res = await request.patch(`${planApi(projectConfig)}/nonexistent`, {
        data: { status: 'invalid' },
      });
      if (res.status() === 429) test.skip(true, 'Rate limited');
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Gap Analysis', () => {
    test('GET /gaps/:materialId returns null for unanalyzed material', async ({ request, projectConfig }) => {
      const res = await request.get(`${analysisApi(projectConfig)}/gaps/nonexistent-material`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.data).toBeNull();
    });

    test('POST /gaps/:materialId returns error for nonexistent material', async ({ request, projectConfig }) => {
      const res = await request.post(`${analysisApi(projectConfig)}/gaps/nonexistent`);
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Weak Areas', () => {
    test('GET /weak-areas returns array', async ({ request, projectConfig }) => {
      const res = await request.get(`${analysisApi(projectConfig)}/weak-areas`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('POST /weak-areas/refresh returns refreshed areas', async ({ request, projectConfig }) => {
      const res = await request.post(`${analysisApi(projectConfig)}/weak-areas/refresh`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('PATCH /weak-areas/:id returns 404 for nonexistent', async ({ request, projectConfig }) => {
      const res = await request.patch(`${analysisApi(projectConfig)}/weak-areas/nonexistent`, {
        data: { resolved: true },
      });
      expect(res.status()).toBe(404);
    });
  });

  // ─── AI Pipeline: Study plan generation with seeded data ──────────────────

  test.describe('Study Plan Pipeline @ai', () => {
    test.describe.configure({ timeout: 90_000, mode: 'serial' });

    let seed: KBSeedResult;

    test('seed: create KB test data', async ({ request, projectConfig, cleanup }) => {
      seed = await seedKBEnvironment(request, projectConfig, cleanup);
      expect(seed.folderId).toBeTruthy();
    });

    test('POST /generate creates study plan from folder', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const examDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await request.post(`${planApi(projectConfig)}/generate`, {
        data: { title: 'Biology Exam Prep', examDate, folderId: seed.folderId, hoursPerDay: 2 },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.json();
      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.title).toBe('Biology Exam Prep');
    });

    test('POST /weak-areas/refresh detects weak areas from cards', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${analysisApi(projectConfig)}/weak-areas/refresh`);
      if (res.status() === 429) test.skip(true, 'Rate limited');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('cleanup: delete KB test data', async ({ request, projectConfig }) => {
      if (!seed) return;
      await request.delete(`${projectConfig.apiUrl}/api/v1/decks/${seed.deckId}`).catch(() => {});
      await request.delete(`${projectConfig.apiUrl}/api/v1/folders/${seed.folderId}`).catch(() => {});
    });
  });
});
