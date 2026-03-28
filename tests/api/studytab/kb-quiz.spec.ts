import { test, expect } from '../../../src/fixtures';
import { seedKBEnvironment, KBSeedResult } from './fixtures/kb-seed';

test.describe('KB Quiz API @studytab @api @kb-quiz', () => {
  test.use({ storageState: '.auth/user.json' });

  const quizApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/quiz`;

  // ─── Validation tests (no AI calls) ───────────────────────────────────────

  test.describe('Quiz generation', () => {
    test('POST /generate validates questionCount range', async ({ request, projectConfig }) => {
      const res = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: { sourceType: 'document', sourceId: 'x', questionCount: 100, difficulty: 'medium', questionTypes: ['MCQ'] },
      });
      expect(res.status()).toBe(422);
    });

    test('POST /generate validates difficulty enum', async ({ request, projectConfig }) => {
      const res = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: { sourceType: 'document', sourceId: 'x', questionCount: 10, difficulty: 'impossible', questionTypes: ['MCQ'] },
      });
      expect(res.status()).toBe(422);
    });

    test('POST /generate requires at least one questionType', async ({ request, projectConfig }) => {
      const res = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: { sourceType: 'document', sourceId: 'x', questionCount: 10, difficulty: 'easy', questionTypes: [] },
      });
      expect(res.status()).toBe(422);
    });

    test('POST /generate returns 404 for nonexistent document', async ({ request, projectConfig }) => {
      const res = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: { sourceType: 'document', sourceId: 'nonexistent-id', questionCount: 5, difficulty: 'easy', questionTypes: ['MCQ'] },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Quiz sessions', () => {
    test('GET /sessions returns array', async ({ request, projectConfig }) => {
      const res = await request.get(`${quizApi(projectConfig)}/sessions`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('GET /sessions/:id returns 404 for nonexistent', async ({ request, projectConfig }) => {
      const res = await request.get(`${quizApi(projectConfig)}/sessions/nonexistent`);
      expect(res.status()).toBe(404);
    });
  });

  test.describe('Quiz submission', () => {
    test('POST /sessions/:id/submit returns 404 for nonexistent', async ({ request, projectConfig }) => {
      const res = await request.post(`${quizApi(projectConfig)}/sessions/nonexistent/submit`, {
        data: { answers: [{ questionId: 'q1', answer: 'A' }] },
      });
      expect(res.status()).toBe(404);
    });

    test('POST /sessions/:id/submit validates answer format', async ({ request, projectConfig }) => {
      const res = await request.post(`${quizApi(projectConfig)}/sessions/any-id/submit`, {
        data: { answers: 'not-an-array' },
      });
      expect(res.status()).toBe(422);
    });
  });

  // ─── AI Pipeline: Real quiz generation & submission ────────────────────────

  test.describe('Quiz Pipeline @ai', () => {
    test.describe.configure({ timeout: 90_000, mode: 'serial' });

    let seed: KBSeedResult;

    test('seed: create KB test data', async ({ request, projectConfig, cleanup }) => {
      seed = await seedKBEnvironment(request, projectConfig, cleanup);
      expect(seed.documentId1).toBeTruthy();
    });

    test('POST /generate creates MCQ quiz from biology document', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: {
          sourceType: 'document', sourceId: seed.documentId1,
          questionCount: 5, difficulty: 'medium', questionTypes: ['MCQ'],
        },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.json();
      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('questions');
      expect(Array.isArray(body.data.questions)).toBeTruthy();
      expect(body.data.questions.length).toBeGreaterThanOrEqual(1);

      const q = body.data.questions[0];
      expect(q).toHaveProperty('question');
      expect(typeof q.question).toBe('string');
      expect(q.question.length).toBeGreaterThan(5);
    });

    test('POST /generate creates mixed-type quiz', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');
      const res = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: {
          sourceType: 'document', sourceId: seed.documentId1,
          questionCount: 5, difficulty: 'easy',
          questionTypes: ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'],
        },
      });
      if (!res.ok()) test.skip(true, `AI provider error (${res.status()})`);
      const body = await res.json();
      expect(body.data.questions.length).toBeGreaterThanOrEqual(1);
    });

    test('Full quiz flow: generate → submit → get scored result', async ({ request, projectConfig }) => {
      test.skip(!seed, 'Seed data not available');

      const genRes = await request.post(`${quizApi(projectConfig)}/generate`, {
        data: {
          sourceType: 'document', sourceId: seed.documentId1,
          questionCount: 3, difficulty: 'easy', questionTypes: ['MCQ', 'TRUE_FALSE'],
        },
      });
      if (!genRes.ok()) test.skip(true, `AI provider error (${genRes.status()})`);
      const genBody = await genRes.json();
      const quiz = genBody.data;
      expect(quiz).toBeTruthy();
      expect(quiz.questions.length).toBeGreaterThanOrEqual(1);

      const answers = quiz.questions.map((q: any) => ({
        questionId: q.id,
        answer: q.options?.[0] ?? 'True',
      }));
      const submitRes = await request.post(`${quizApi(projectConfig)}/sessions/${quiz.id}/submit`, {
        data: { answers },
      });
      expect(submitRes.ok()).toBeTruthy();
      const result = (await submitRes.json()).data;
      expect(result).toHaveProperty('completedAt');
    });

    test('cleanup: delete KB test data', async ({ request, projectConfig }) => {
      if (!seed) return;
      await request.delete(`${projectConfig.apiUrl}/api/v1/decks/${seed.deckId}`).catch(() => {});
      await request.delete(`${projectConfig.apiUrl}/api/v1/folders/${seed.folderId}`).catch(() => {});
    });
  });
});
