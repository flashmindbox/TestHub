import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

test.describe('Knowledge Base Documents API @studytab @api @kb-documents', () => {
  test.use({ storageState: '.auth/user.json' });

  const foldersApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;
  const docsApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/documents`;
  const materialsApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/materials`;

  async function createFolder(request: any, cfg: any, cleanup: any) {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(foldersApi(cfg), { data: { name } });
    const folder = (await res.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name,
      deleteVia: 'api', deletePath: `${foldersApi(cfg)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });
    return folder;
  }

  async function createDoc(request: any, cfg: any, cleanup: any, folderId: string, title?: string) {
    const docTitle = title ?? `${TestDataFactory.uniqueId()}-Doc`;
    const res = await request.post(docsApi(cfg), {
      data: { title: docTitle, folderId, content: 'Test content' },
    });
    const doc = (await res.json()).data;
    cleanup.track({
      type: 'document', id: doc.id, name: docTitle,
      deleteVia: 'api', deletePath: `${docsApi(cfg)}/${doc.id}`,
      project: 'studytab', createdAt: new Date(),
    });
    return doc;
  }

  test('should create a user-authored document', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    const res = await request.post(docsApi(projectConfig), {
      data: { title: 'Study Notes', folderId: folder.id, content: 'Biology chapter 1' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isUserCreated).toBe(true);
    expect(body.data.filename).toBe('Study Notes');

    cleanup.track({
      type: 'document', id: body.data.id, name: 'Study Notes',
      deleteVia: 'api', deletePath: `${docsApi(projectConfig)}/${body.data.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    // Verify Material was auto-created in the folder
    const materialsRes = await request.get(`${materialsApi(projectConfig)}?folderId=${folder.id}`);
    const materials = (await materialsRes.json()).data;
    expect(materials.some((m: any) => m.title === 'Study Notes')).toBeTruthy();
  });

  test('should get a document by id', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const doc = await createDoc(request, projectConfig, cleanup, folder.id);

    const res = await request.get(`${docsApi(projectConfig)}/${doc.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.id).toBe(doc.id);
    expect(body.data.filename).toBe(doc.filename);
    expect(body.data).toHaveProperty('_count');
  });

  test('should update document content', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const doc = await createDoc(request, projectConfig, cleanup, folder.id);

    const blockContent = [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }];
    const res = await request.patch(`${docsApi(projectConfig)}/${doc.id}`, {
      data: { blockContent, content: 'Updated markdown' },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.blockContent).toBeTruthy();
  });

  test('should update document title', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const doc = await createDoc(request, projectConfig, cleanup, folder.id);

    const res = await request.patch(`${docsApi(projectConfig)}/${doc.id}`, {
      data: { title: 'New Title' },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.filename).toBe('New Title');
  });

  test('should search documents by title', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const uniqueA = TestDataFactory.uniqueId();
    const uniqueB = TestDataFactory.uniqueId();
    await createDoc(request, projectConfig, cleanup, folder.id, `Searchable-${uniqueA}`);
    await createDoc(request, projectConfig, cleanup, folder.id, `Other-${uniqueB}`);

    const res = await request.get(`${docsApi(projectConfig)}/search?q=Searchable-${uniqueA}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((d: any) => d.title.includes(uniqueA))).toBeTruthy();
    expect(body.data.some((d: any) => d.title.includes(uniqueB))).toBeFalsy();
  });

  test('should sync wiki-links on update', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const docA = await createDoc(request, projectConfig, cleanup, folder.id, 'Link Source');
    const docB = await createDoc(request, projectConfig, cleanup, folder.id, 'Link Target');

    // Link A → B
    const linkRes = await request.patch(`${docsApi(projectConfig)}/${docA.id}`, {
      data: { linkedDocIds: [docB.id] },
    });
    expect(linkRes.ok()).toBeTruthy();

    // Verify backlink on B
    const backlinksRes = await request.get(`${docsApi(projectConfig)}/${docB.id}/backlinks`);
    const backlinks = (await backlinksRes.json()).data;
    expect(backlinks.some((bl: any) => bl.id === docA.id)).toBeTruthy();
  });

  test('should remove wiki-links when updated', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const docA = await createDoc(request, projectConfig, cleanup, folder.id, 'Unlink Source');
    const docB = await createDoc(request, projectConfig, cleanup, folder.id, 'Unlink Target');

    // Link then unlink
    await request.patch(`${docsApi(projectConfig)}/${docA.id}`, {
      data: { linkedDocIds: [docB.id] },
    });
    await request.patch(`${docsApi(projectConfig)}/${docA.id}`, {
      data: { linkedDocIds: [] },
    });

    const backlinksRes = await request.get(`${docsApi(projectConfig)}/${docB.id}/backlinks`);
    const backlinks = (await backlinksRes.json()).data;
    expect(backlinks.length).toBe(0);
  });

  test('should return empty backlinks for unlinked document', async ({ request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    const doc = await createDoc(request, projectConfig, cleanup, folder.id);

    const res = await request.get(`${docsApi(projectConfig)}/${doc.id}/backlinks`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});
