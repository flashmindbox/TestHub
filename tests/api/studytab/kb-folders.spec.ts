import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

test.describe('Knowledge Base Folders API @studytab @api @kb-folders', () => {
  test.use({ storageState: '.auth/user.json' });

  const api = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;

  test('should create a folder', async ({ request, projectConfig, cleanup }) => {
    const name = `${TestDataFactory.uniqueId()}-Biology`;
    const response = await request.post(api(projectConfig), { data: { name } });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.name).toBe(name);

    cleanup.track({
      type: 'folder', id: body.data.id, name,
      deleteVia: 'api', deletePath: `${api(projectConfig)}/${body.data.id}`,
      project: 'studytab', createdAt: new Date(),
    });
  });

  test('should create a nested folder', async ({ request, projectConfig, cleanup }) => {
    const parentName = `${TestDataFactory.uniqueId()}-Parent`;
    const childName = `${TestDataFactory.uniqueId()}-Child`;

    const parentRes = await request.post(api(projectConfig), { data: { name: parentName } });
    const parent = (await parentRes.json()).data;

    cleanup.track({
      type: 'folder', id: parent.id, name: parentName,
      deleteVia: 'api', deletePath: `${api(projectConfig)}/${parent.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    const childRes = await request.post(api(projectConfig), {
      data: { name: childName, parentId: parent.id },
    });
    expect(childRes.status()).toBe(201);
    const child = (await childRes.json()).data;
    expect(child.parentId).toBe(parent.id);
  });

  test('should list all folders with material counts', async ({ request, projectConfig, cleanup }) => {
    const names = [TestDataFactory.uniqueId(), TestDataFactory.uniqueId()];
    for (const name of names) {
      const res = await request.post(api(projectConfig), { data: { name } });
      const folder = (await res.json()).data;
      cleanup.track({
        type: 'folder', id: folder.id, name,
        deleteVia: 'api', deletePath: `${api(projectConfig)}/${folder.id}`,
        project: 'studytab', createdAt: new Date(),
      });
    }

    const listRes = await request.get(api(projectConfig));
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBeTruthy();

    const testFolders = body.data.filter((f: any) => names.includes(f.name));
    expect(testFolders.length).toBe(2);
    for (const f of testFolders) {
      expect(f).toHaveProperty('_count');
      expect(f._count).toHaveProperty('materials');
    }
  });

  test('should update a folder', async ({ request, projectConfig, cleanup }) => {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(api(projectConfig), { data: { name } });
    const folder = (await res.json()).data;

    cleanup.track({
      type: 'folder', id: folder.id, name,
      deleteVia: 'api', deletePath: `${api(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    const updateRes = await request.patch(`${api(projectConfig)}/${folder.id}`, {
      data: { name: 'Physics', color: '#FF0000' },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updated = (await updateRes.json()).data;
    expect(updated.name).toBe('Physics');
    expect(updated.color).toBe('#FF0000');
  });

  test('should delete a folder and its children', async ({ request, projectConfig }) => {
    const parentRes = await request.post(api(projectConfig), {
      data: { name: TestDataFactory.uniqueId() },
    });
    const parent = (await parentRes.json()).data;

    await request.post(api(projectConfig), {
      data: { name: TestDataFactory.uniqueId(), parentId: parent.id },
    });

    const delRes = await request.delete(`${api(projectConfig)}/${parent.id}`);
    expect(delRes.ok()).toBeTruthy();

    // Verify parent gone
    const getRes = await request.patch(`${api(projectConfig)}/${parent.id}`, {
      data: { name: 'nope' },
    });
    expect(getRes.status()).toBe(404);
  });

  test('should move a folder to a new parent', async ({ request, projectConfig, cleanup }) => {
    const aRes = await request.post(api(projectConfig), { data: { name: TestDataFactory.uniqueId() } });
    const a = (await aRes.json()).data;
    const bRes = await request.post(api(projectConfig), { data: { name: TestDataFactory.uniqueId() } });
    const b = (await bRes.json()).data;

    cleanup.track({
      type: 'folder', id: a.id, name: a.name,
      deleteVia: 'api', deletePath: `${api(projectConfig)}/${a.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    const moveRes = await request.patch(`${api(projectConfig)}/${b.id}/move`, {
      data: { parentId: a.id },
    });
    expect(moveRes.ok()).toBeTruthy();
    const moved = (await moveRes.json()).data;
    expect(moved.parentId).toBe(a.id);
  });

  test('should prevent circular move', async ({ request, projectConfig, cleanup }) => {
    const aRes = await request.post(api(projectConfig), { data: { name: TestDataFactory.uniqueId() } });
    const a = (await aRes.json()).data;
    const bRes = await request.post(api(projectConfig), {
      data: { name: TestDataFactory.uniqueId(), parentId: a.id },
    });
    const b = (await bRes.json()).data;

    cleanup.track({
      type: 'folder', id: a.id, name: a.name,
      deleteVia: 'api', deletePath: `${api(projectConfig)}/${a.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    // Try to move A under B (circular)
    const moveRes = await request.patch(`${api(projectConfig)}/${a.id}/move`, {
      data: { parentId: b.id },
    });
    expect(moveRes.ok()).toBeFalsy();
    expect(moveRes.status()).toBe(400);
  });

  test('should return 404 for non-existent folder', async ({ request, projectConfig }) => {
    const response = await request.patch(`${api(projectConfig)}/nonexistent-id-12345`, {
      data: { name: 'nope' },
    });
    expect(response.status()).toBe(404);
  });
});
