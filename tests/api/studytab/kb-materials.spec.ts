import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

// Minimal valid PDF buffer
const MINIMAL_PDF = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Pages 2 0 R>>endobj\n2 0 obj<</Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>'
);

test.describe('Knowledge Base Materials API @studytab @api @kb-materials', () => {
  test.use({ storageState: '.auth/user.json' });

  const foldersApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;
  const materialsApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/materials`;

  async function createTestFolder(request: any, projectConfig: any, cleanup: any) {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(foldersApi(projectConfig), { data: { name } });
    const folder = (await res.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });
    return folder;
  }

  // Upload tests — require DO Spaces credentials
  test.describe('Upload operations (requires storage)', () => {
    test('should upload a PDF material', async ({ request, projectConfig, cleanup }) => {
      const folder = await createTestFolder(request, projectConfig, cleanup);

      const response = await request.post(materialsApi(projectConfig), {
        multipart: {
          folderId: folder.id,
          title: 'Test PDF',
          file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: MINIMAL_PDF },
        },
      });

      // Storage may not be configured in test env
      if (response.status() === 400) {
        const body = await response.json();
        test.skip(body.error?.message?.includes('S3') || body.error?.message?.includes('credentials'),
          'Skipped: DO Spaces not configured');
      }

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('jobId');
      expect(body.data.status).toBe('PENDING');
      expect(body.data.type).toBe('PDF');

      cleanup.track({
        type: 'material', id: body.data.id, name: 'Test PDF',
        deleteVia: 'api', deletePath: `${materialsApi(projectConfig)}/${body.data.id}`,
        project: 'studytab', createdAt: new Date(),
      });
    });

    test('should list materials in a folder', async ({ request, projectConfig, cleanup }) => {
      const folder = await createTestFolder(request, projectConfig, cleanup);

      const uploadRes = await request.post(materialsApi(projectConfig), {
        multipart: {
          folderId: folder.id,
          title: 'Listed PDF',
          file: { name: 'listed.pdf', mimeType: 'application/pdf', buffer: MINIMAL_PDF },
        },
      });

      if (uploadRes.status() === 400) {
        test.skip(true, 'Skipped: DO Spaces not configured');
      }

      const material = (await uploadRes.json()).data;
      cleanup.track({
        type: 'material', id: material.id, name: 'Listed PDF',
        deleteVia: 'api', deletePath: `${materialsApi(projectConfig)}/${material.id}`,
        project: 'studytab', createdAt: new Date(),
      });

      const listRes = await request.get(`${materialsApi(projectConfig)}?folderId=${folder.id}`);
      expect(listRes.ok()).toBeTruthy();
      const body = await listRes.json();
      expect(body.success).toBe(true);
      expect(body.data.some((m: any) => m.id === material.id)).toBeTruthy();
    });

    test('should get material processing status', async ({ request, projectConfig, cleanup }) => {
      const folder = await createTestFolder(request, projectConfig, cleanup);

      const uploadRes = await request.post(materialsApi(projectConfig), {
        multipart: {
          folderId: folder.id,
          title: 'Status PDF',
          file: { name: 'status.pdf', mimeType: 'application/pdf', buffer: MINIMAL_PDF },
        },
      });

      if (uploadRes.status() === 400) {
        test.skip(true, 'Skipped: DO Spaces not configured');
      }

      const material = (await uploadRes.json()).data;
      cleanup.track({
        type: 'material', id: material.id, name: 'Status PDF',
        deleteVia: 'api', deletePath: `${materialsApi(projectConfig)}/${material.id}`,
        project: 'studytab', createdAt: new Date(),
      });

      const statusRes = await request.get(`${materialsApi(projectConfig)}/${material.id}/status`);
      expect(statusRes.ok()).toBeTruthy();
      const body = await statusRes.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('status');
    });

    test('should get material details', async ({ request, projectConfig, cleanup }) => {
      const folder = await createTestFolder(request, projectConfig, cleanup);

      const uploadRes = await request.post(materialsApi(projectConfig), {
        multipart: {
          folderId: folder.id,
          title: 'Detail PDF',
          file: { name: 'detail.pdf', mimeType: 'application/pdf', buffer: MINIMAL_PDF },
        },
      });

      if (uploadRes.status() === 400) {
        test.skip(true, 'Skipped: DO Spaces not configured');
      }

      const material = (await uploadRes.json()).data;
      cleanup.track({
        type: 'material', id: material.id, name: 'Detail PDF',
        deleteVia: 'api', deletePath: `${materialsApi(projectConfig)}/${material.id}`,
        project: 'studytab', createdAt: new Date(),
      });

      const detailRes = await request.get(`${materialsApi(projectConfig)}/${material.id}`);
      expect(detailRes.ok()).toBeTruthy();
      const body = await detailRes.json();
      expect(body.data.title).toBe('Detail PDF');
      expect(body.data.type).toBe('PDF');
      expect(body.data.folderId).toBe(folder.id);
    });

    test('should delete a material', async ({ request, projectConfig, cleanup }) => {
      const folder = await createTestFolder(request, projectConfig, cleanup);

      const uploadRes = await request.post(materialsApi(projectConfig), {
        multipart: {
          folderId: folder.id,
          title: 'Delete Me',
          file: { name: 'delete.pdf', mimeType: 'application/pdf', buffer: MINIMAL_PDF },
        },
      });

      if (uploadRes.status() === 400) {
        test.skip(true, 'Skipped: DO Spaces not configured');
      }

      const material = (await uploadRes.json()).data;

      const delRes = await request.delete(`${materialsApi(projectConfig)}/${material.id}`);
      expect(delRes.ok()).toBeTruthy();

      const getRes = await request.get(`${materialsApi(projectConfig)}/${material.id}`);
      expect(getRes.status()).toBe(404);
    });
  });

  // Validation tests — don't require storage
  test('should reject non-PDF uploads', async ({ request, projectConfig, cleanup }) => {
    const folder = await createTestFolder(request, projectConfig, cleanup);

    const response = await request.post(materialsApi(projectConfig), {
      multipart: {
        folderId: folder.id,
        title: 'Not a PDF',
        file: { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('hello world') },
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
