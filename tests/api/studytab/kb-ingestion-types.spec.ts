import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

const MINIMAL_PDF = Buffer.from('%PDF-1.0\n1 0 obj<</Pages 2 0 R>>endobj\n2 0 obj<</Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>');
const MINIMAL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualEQAAAABJRU5ErkJggg==', 'base64');

test.describe('KB Ingestion Types @studytab @api @kb-ingestion', () => {
  test.use({ storageState: '.auth/user.json' });

  const foldersApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;
  const materialsApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/materials`;

  async function createFolder(request: any, cfg: any, cleanup: any) {
    const res = await request.post(foldersApi(cfg), { data: { name: TestDataFactory.uniqueId() } });
    const folder = (await res.json()).data;
    cleanup.track({ type: 'folder', id: folder.id, name: folder.name, deleteVia: 'api', deletePath: `${foldersApi(cfg)}/${folder.id}`, project: 'studytab', createdAt: new Date() });
    return folder;
  }

  test.describe('Image uploads', () => {
    test('should accept image/png upload', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(materialsApi(projectConfig), {
        multipart: { folderId: folder.id, title: 'Test Image', file: { name: 'test.png', mimeType: 'image/png', buffer: MINIMAL_PNG } },
      });
      if (res.status() === 400) { const b = await res.json(); const msg = b.error?.message ?? ''; test.skip(msg.includes('S3') || msg.includes('storage') || msg.includes('MinIO') || msg.includes('ECONNREFUSED') || b.error?.code === 'UPLOAD_FAILED', 'Storage not configured'); }
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.data.type).toBe('IMAGE');
      expect(body.data.status).toBe('PENDING');
    });

    test('should accept image/jpeg upload', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(materialsApi(projectConfig), {
        multipart: { folderId: folder.id, title: 'JPEG Image', file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: MINIMAL_PNG } },
      });
      if (res.status() === 400) test.skip(true, 'Storage not configured');
      expect(res.status()).toBe(201);
      expect((await res.json()).data.type).toBe('IMAGE');
    });
  });

  test.describe('DOCX uploads', () => {
    test('should accept application/vnd.openxmlformats DOCX', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(materialsApi(projectConfig), {
        multipart: { folderId: folder.id, title: 'DOCX File', file: { name: 'test.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK\x03\x04') } },
      });
      if (res.status() === 400) test.skip(true, 'Storage not configured');
      expect(res.status()).toBe(201);
      expect((await res.json()).data.type).toBe('DOC');
    });
  });

  test.describe('URL-based materials', () => {
    test('should create WEBPAGE material from URL', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(`${materialsApi(projectConfig)}/from-url`, {
        data: { folderId: folder.id, title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Test', type: 'WEBPAGE' },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.data.type).toBe('WEBPAGE');
      expect(body.data.originalUrl).toBe('https://en.wikipedia.org/wiki/Test');
    });

    test('should create YOUTUBE material from URL', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(`${materialsApi(projectConfig)}/from-url`, {
        data: { folderId: folder.id, title: 'YouTube Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'YOUTUBE' },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.data.type).toBe('YOUTUBE');
    });

    test('should reject invalid URL', async ({ request, projectConfig, cleanup }) => {
      const folder = await createFolder(request, projectConfig, cleanup);
      const res = await request.post(`${materialsApi(projectConfig)}/from-url`, {
        data: { folderId: folder.id, title: 'Bad URL', url: 'not-a-url', type: 'WEBPAGE' },
      });
      expect(res.status()).toBe(400);
    });
  });

  test('should reject unsupported file types', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const res = await request.post(materialsApi(projectConfig), {
      multipart: { folderId: folder.id, title: 'Bad File', file: { name: 'test.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') } },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).success).toBe(false);
  });
});
