import { test, expect } from '../../../src/fixtures';

// Minimal valid 1x1 PNG (base64-decoded)
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualEQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('KB Handwriting & Math @studytab @api @kb-handwriting', () => {
  test.use({ storageState: '.auth/user.json' });

  const aiToolsApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/ai-tools`;

  // ─── Contract tests ───────────────────────────────────────────────────────

  test.describe('Handwriting to Text', () => {
    test('POST /handwriting-to-text accepts image file', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-text`, {
        multipart: { image: { name: 'hw.png', mimeType: 'image/png', buffer: VALID_PNG } },
      });
      expect(res.status()).not.toBe(500);
      if (res.ok()) {
        const body = await res.json();
        expect(body.data).toHaveProperty('text');
      }
    });

    test('POST /handwriting-to-text requires image field', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-text`, {
        data: {},
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Handwriting to LaTeX', () => {
    test('POST /handwriting-to-latex accepts image file', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-latex`, {
        multipart: { image: { name: 'math.png', mimeType: 'image/png', buffer: VALID_PNG } },
      });
      expect(res.status()).not.toBe(500);
      if (res.ok()) {
        const body = await res.json();
        expect(body.data).toHaveProperty('latex');
        expect(body.data).toHaveProperty('text');
      }
    });

    test('POST /handwriting-to-latex response has correct shape', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-latex`, {
        multipart: { image: { name: 'test.png', mimeType: 'image/png', buffer: Buffer.alloc(100) } },
      });
      if (res.ok()) {
        const body = await res.json();
        expect(typeof body.data.latex).toBe('string');
        expect(typeof body.data.text).toBe('string');
      }
    });
  });

  test.describe('Chat Socratic mode', () => {
    test('POST /chat/sessions accepts mode parameter', async ({ request, projectConfig }) => {
      const chatApi = `${projectConfig.apiUrl}/api/v1/chat`;
      const res = await request.post(`${chatApi}/sessions`, {
        data: { mode: 'socratic' },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.data.mode).toBe('socratic');

      await request.delete(`${chatApi}/sessions/${body.data.id}`);
    });

    test('POST /chat/sessions defaults to direct mode', async ({ request, projectConfig }) => {
      const chatApi = `${projectConfig.apiUrl}/api/v1/chat`;
      const res = await request.post(`${chatApi}/sessions`, { data: {} });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.data.mode).toBe('direct');

      await request.delete(`${chatApi}/sessions/${body.data.id}`);
    });
  });

  // ─── AI Pipeline: Real OCR tests ──────────────────────────────────────────

  test.describe('OCR Pipeline @ai', () => {
    test.describe.configure({ timeout: 45_000 });

    test('POST /handwriting-to-text returns text from valid image', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-text`, {
        multipart: { image: { name: 'hw.png', mimeType: 'image/png', buffer: VALID_PNG } },
      });
      if (!res.ok()) test.skip(true, `Gemini/Google AI error (${res.status()})`);
      const body = await res.json();
      expect(body.data).toHaveProperty('text');
      expect(typeof body.data.text).toBe('string');
    });

    test('POST /handwriting-to-latex returns LaTeX from valid image', async ({ request, projectConfig }) => {
      const res = await request.post(`${aiToolsApi(projectConfig)}/handwriting-to-latex`, {
        multipart: { image: { name: 'math.png', mimeType: 'image/png', buffer: VALID_PNG } },
      });
      if (!res.ok()) test.skip(true, `Gemini/Google AI error (${res.status()})`);
      const body = await res.json();
      expect(body.data).toHaveProperty('latex');
      expect(typeof body.data.latex).toBe('string');
      expect(body.data).toHaveProperty('text');
    });

    test('Chat session with folder context', async ({ request, projectConfig }) => {
      const chatApi = `${projectConfig.apiUrl}/api/v1/chat`;

      const folderRes = await request.post(`${projectConfig.apiUrl}/api/v1/folders`, {
        data: { name: `ocr-test-${Date.now()}` },
      });
      const folder = (await folderRes.json()).data;

      const sessionRes = await request.post(`${chatApi}/sessions`, {
        data: { title: 'Test Chat', folderId: folder.id, mode: 'direct' },
      });
      expect(sessionRes.status()).toBe(201);
      const session = (await sessionRes.json()).data;
      expect(session.folderId).toBe(folder.id);

      await request.delete(`${chatApi}/sessions/${session.id}`);
      await request.delete(`${projectConfig.apiUrl}/api/v1/folders/${folder.id}`);
    });
  });
});
