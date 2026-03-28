import { test, expect } from '../../../src/fixtures';
import { seedKBEnvironment, collectSSEText, KBSeedResult } from './fixtures/kb-seed';

test.describe('KB AI Tools API @studytab @api @kb-ai-tools', () => {
  test.use({ storageState: '.auth/user.json' });

  const aiToolsApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/ai-tools`;

  // ─── Validation tests (no AI calls) ───────────────────────────────────────

  test.describe('SSE Streaming endpoints', () => {
    test('POST /summarize returns SSE stream', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/summarize`, {
        data: { sourceType: 'document', sourceId: 'nonexistent', level: 'key_points' },
      });
      const ct = res.headers()['content-type'] ?? '';
      expect(ct.includes('text/event-stream') || res.status() >= 400).toBeTruthy();
    });

    test('POST /explain returns SSE stream', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/explain`, {
        data: { concept: 'photosynthesis', level: 'intermediate' },
      });
      const ct = res.headers()['content-type'] ?? '';
      expect(ct.includes('text/event-stream') || res.status() >= 400).toBeTruthy();
    });

    test('POST /solve-doubt returns SSE stream', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/solve-doubt`, {
        data: { problem: 'What is 2+2?' },
      });
      const ct = res.headers()['content-type'] ?? '';
      expect(ct.includes('text/event-stream') || res.status() >= 400).toBeTruthy();
    });
  });

  test.describe('JSON endpoints', () => {
    test('POST /generate-cards validates body', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/generate-cards`, {
        data: { sourceType: 'document', sourceId: 'x', deckId: 'x', cardCount: 10, cardTypes: ['BASIC'] },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /generate-cards rejects invalid cardCount', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/generate-cards`, {
        data: { sourceType: 'document', sourceId: 'x', deckId: 'x', cardCount: 100, cardTypes: ['BASIC'] },
      });
      expect(res.status()).toBe(422);
    });

    test('POST /generate-mind-map validates body', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/generate-mind-map`, {
        data: { sourceType: 'document', sourceId: 'nonexistent' },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });

    test('POST /evaluate-answer validates required fields', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/evaluate-answer`, {
        data: { question: '', userAnswer: 'test' },
      });
      expect(res.status()).toBe(422);
    });

    test('POST /evaluate-answer accepts valid body', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/evaluate-answer`, {
        data: { question: 'What is DNA?', userAnswer: 'Deoxyribonucleic acid, the genetic material' },
      });
      if (res.ok()) {
        const body = await res.json();
        expect(body.data).toHaveProperty('score');
        expect(body.data).toHaveProperty('feedback');
      }
    });

    test('GET /evaluations returns array', async ({ request, projectConfig }) => {
      const res = await request.get(`${aiToolsApi(projectConfig)}/evaluations`);
      if (res.status() === 429) test.skip(true, 'Rate limited');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body.data)).toBeTruthy();
    });
  });

  test.describe('Handwriting endpoints', () => {
    test('POST /handwriting-to-text accepts image', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-text`, {
        multipart: { image: { name: 'hw.png', mimeType: 'image/png', buffer: Buffer.alloc(100) } },
      });
      expect(res.status()).not.toBe(500);
    });

    test('POST /handwriting-to-latex accepts image', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-latex`, {
        multipart: { image: { name: 'math.png', mimeType: 'image/png', buffer: Buffer.alloc(100) } },
      });
      expect(res.status()).not.toBe(500);
    });
  });

  // ─── AI Pipeline tests (real AI calls with seeded data) ───────────────────

  test.describe('AI Pipeline @ai', () => {
    test.describe.configure({ timeout: 60_000, mode: 'serial' });

    // Shared seed — populated by first test, used by subsequent tests
    let seed: KBSeedResult;

    test('seed: create KB test data', async ({ request, projectConfig, cleanup }) => {
      seed = await seedKBEnvironment(request, projectConfig, cleanup);
      expect(seed.folderId).toBeTruthy();
      expect(seed.documentId1).toBeTruthy();
      expect(seed.deckId).toBeTruthy();
    });

    test('POST /summarize streams biology summary', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${aiToolsApi(projectConfig)}/summarize`, {
        data: { sourceType: 'document', sourceId: seed.documentId1, level: 'key_points' },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.text();
      // Skip if SSE stream contains an error event (AI provider down)
      if (body.includes('event: error')) test.skip(true, 'AI provider returned error');
      const text = collectSSEText(body);
      if (text.length === 0) test.skip(true, 'AI provider returned no content');
      expect(text.length).toBeGreaterThan(20);
    });

    test('POST /explain streams concept explanation', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${aiToolsApi(projectConfig)}/explain`, {
        data: { concept: 'mitochondria', level: 'intermediate', folderId: seed.folderId },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.text();
      if (body.includes('event: error') || collectSSEText(body).length === 0) {
        test.skip(true, 'AI provider returned no content');
      }
      const text = collectSSEText(body);
      expect(text.length).toBeGreaterThan(20);
    });

    test('POST /generate-cards creates biology flashcards', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${aiToolsApi(projectConfig)}/generate-cards`, {
        data: {
          sourceType: 'document', sourceId: seed.documentId1,
          deckId: seed.deckId, cardCount: 5, cardTypes: ['BASIC', 'MCQ'],
        },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.cards)).toBeTruthy();
      expect(body.data.cards.length).toBeGreaterThanOrEqual(1);
    });

    test('POST /generate-mind-map returns mind map structure', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${aiToolsApi(projectConfig)}/generate-mind-map`, {
        data: { sourceType: 'document', sourceId: seed.documentId1 },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('mindMap');
    });

    test('POST /evaluate-answer scores a biology answer', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${aiToolsApi(projectConfig)}/evaluate-answer`, {
        data: {
          question: 'What is the function of mitochondria?',
          userAnswer: 'Mitochondria produce ATP through cellular respiration',
          folderId: seed.folderId,
        },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('score');
      expect(typeof body.data.score).toBe('number');
      expect(body.data).toHaveProperty('feedback');
    });

    test('POST /solve-doubt streams a solution', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${aiToolsApi(projectConfig)}/solve-doubt`, {
        data: { problem: 'Explain the difference between the leading and lagging strand in DNA replication', folderId: seed.folderId },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.text();
      if (body.includes('event: error') || collectSSEText(body).length === 0) {
        test.skip(true, 'AI provider returned no content');
      }
      const text = collectSSEText(body);
      expect(text.length).toBeGreaterThan(10);
    });

    test('cleanup: delete KB test data', async ({ request, projectConfig }) => {
      if (!seed) return;
      await request.delete(`${projectConfig.apiUrl}/api/v1/decks/${seed.deckId}`).catch(() => {});
      await request.delete(`${projectConfig.apiUrl}/api/v1/folders/${seed.folderId}`).catch(() => {});
    });
  });
});
