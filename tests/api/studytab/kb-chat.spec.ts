import { test, expect } from '../../../src/fixtures';

test.describe('Knowledge Base Chat API @studytab @api @kb-chat', () => {
  test.use({ storageState: '.auth/user.json' });

  const chatApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/chat`;

  async function createSession(request: any, cfg: any, cleanup: any, data?: { title?: string; folderId?: string }) {
    const res = await request.post(`${chatApi(cfg)}/sessions`, { data: data ?? {} });
    const session = (await res.json()).data;
    cleanup.track({
      type: 'chat-session', id: session.id, name: session.title ?? 'Chat',
      deleteVia: 'api', deletePath: `${chatApi(cfg)}/sessions/${session.id}`,
      project: 'studytab', createdAt: new Date(),
    });
    return session;
  }

  test('should create a chat session', async ({ request, projectConfig, cleanup }) => {
    const res = await request.post(`${chatApi(projectConfig)}/sessions`, {
      data: { title: 'Test Chat' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.title).toBe('Test Chat');

    cleanup.track({
      type: 'chat-session', id: body.data.id, name: 'Test Chat',
      deleteVia: 'api', deletePath: `${chatApi(projectConfig)}/sessions/${body.data.id}`,
      project: 'studytab', createdAt: new Date(),
    });
  });

  test('should create a folder-scoped chat session', async ({ request, projectConfig, cleanup }) => {
    // Create a folder first
    const folderRes = await request.post(`${projectConfig.apiUrl}/api/v1/folders`, {
      data: { name: 'chat-scope-folder' },
    });
    const folder = (await folderRes.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name: 'chat-scope-folder',
      deleteVia: 'api', deletePath: `${projectConfig.apiUrl}/api/v1/folders/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    const res = await request.post(`${chatApi(projectConfig)}/sessions`, {
      data: { folderId: folder.id },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.folderId).toBe(folder.id);

    cleanup.track({
      type: 'chat-session', id: body.data.id, name: 'Scoped Chat',
      deleteVia: 'api', deletePath: `${chatApi(projectConfig)}/sessions/${body.data.id}`,
      project: 'studytab', createdAt: new Date(),
    });
  });

  test('should list chat sessions', async ({ request, projectConfig, cleanup }) => {
    await createSession(request, projectConfig, cleanup, { title: 'Session A' });
    await createSession(request, projectConfig, cleanup, { title: 'Session B' });

    const res = await request.get(`${chatApi(projectConfig)}/sessions`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBeTruthy();

    const titles = body.data.map((s: any) => s.title);
    expect(titles).toContain('Session A');
    expect(titles).toContain('Session B');

    // Verify ordered by most recent (B created after A, so B first)
    const idxA = titles.indexOf('Session A');
    const idxB = titles.indexOf('Session B');
    expect(idxB).toBeLessThan(idxA);
  });

  test('should delete a chat session', async ({ request, projectConfig, cleanup }) => {
    const session = await createSession(request, projectConfig, cleanup, { title: 'Delete Me' });

    const delRes = await request.delete(`${chatApi(projectConfig)}/sessions/${session.id}`);
    expect(delRes.ok()).toBeTruthy();

    // Verify it's gone from the list
    const listRes = await request.get(`${chatApi(projectConfig)}/sessions`);
    const sessions = (await listRes.json()).data;
    expect(sessions.some((s: any) => s.id === session.id)).toBeFalsy();
  });

  test('should send a message and get SSE stream', async ({ request, projectConfig, cleanup }) => {
    const hasAI = !!process.env.OPENAI_API_KEY;
    test.skip(!hasAI, 'Skipped: OPENAI_API_KEY not set');

    const session = await createSession(request, projectConfig, cleanup);

    const res = await request.post(`${chatApi(projectConfig)}/sessions/${session.id}/messages`, {
      data: { content: 'What is photosynthesis?' },
    });

    expect(res.ok()).toBeTruthy();

    const responseText = await res.text();
    // SSE format: "event: <type>\ndata: <json>\n\n"
    expect(responseText).toContain('event: text');
    expect(responseText).toContain('event: done');
  });

  test('should return message history', async ({ request, projectConfig, cleanup }) => {
    const hasAI = !!process.env.OPENAI_API_KEY;
    test.skip(!hasAI, 'Skipped: OPENAI_API_KEY not set');

    const session = await createSession(request, projectConfig, cleanup);

    // Send a message first
    await request.post(`${chatApi(projectConfig)}/sessions/${session.id}/messages`, {
      data: { content: 'Hello AI' },
    });

    // Fetch history
    const res = await request.get(`${chatApi(projectConfig)}/sessions/${session.id}/messages`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    const roles = body.data.map((m: any) => m.role);
    expect(roles).toContain('USER');
    expect(roles).toContain('ASSISTANT');
  });
});
