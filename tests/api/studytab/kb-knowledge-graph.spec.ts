import { test, expect } from '../../../src/fixtures';

test.describe('KB Knowledge Graph API @studytab @api @kb-graph', () => {
  test.use({ storageState: '.auth/user.json' });

  const graphApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/knowledge-graph`;

  // ─── CRUD tests (no AI calls) ─────────────────────────────────────────────

  test.describe('Graph CRUD', () => {
    test('GET / returns nodes and edges', async ({ request, projectConfig }) => {
      const res = await request.get(graphApi(projectConfig));
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.data).toHaveProperty('nodes');
      expect(body.data).toHaveProperty('edges');
      expect(Array.isArray(body.data.nodes)).toBeTruthy();
      expect(Array.isArray(body.data.edges)).toBeTruthy();
    });

    test('POST /nodes creates a node', async ({ request, projectConfig }) => {
      const res = await request.post(`${graphApi(projectConfig)}/nodes`, {
        data: { label: 'Test Concept', type: 'CONCEPT', description: 'A test node' },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.data.label).toBe('Test Concept');
      expect(body.data.type).toBe('CONCEPT');

      await request.delete(`${graphApi(projectConfig)}/nodes/${body.data.id}`);
    });

    test('POST /nodes rejects invalid type', async ({ request, projectConfig }) => {
      const res = await request.post(`${graphApi(projectConfig)}/nodes`, {
        data: { label: 'Bad', type: 'INVALID_TYPE' },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });

    test('PATCH /nodes/:id updates node', async ({ request, projectConfig }) => {
      const createRes = await request.post(`${graphApi(projectConfig)}/nodes`, {
        data: { label: 'Update Me', type: 'TERM' },
      });
      const node = (await createRes.json()).data;

      const updateRes = await request.patch(`${graphApi(projectConfig)}/nodes/${node.id}`, {
        data: { description: 'Updated description' },
      });
      expect(updateRes.ok()).toBeTruthy();
      expect((await updateRes.json()).data.description).toBe('Updated description');

      await request.delete(`${graphApi(projectConfig)}/nodes/${node.id}`);
    });

    test('DELETE /nodes/:id deletes node', async ({ request, projectConfig }) => {
      const createRes = await request.post(`${graphApi(projectConfig)}/nodes`, {
        data: { label: 'Delete Me', type: 'CONCEPT' },
      });
      const node = (await createRes.json()).data;

      const delRes = await request.delete(`${graphApi(projectConfig)}/nodes/${node.id}`);
      expect(delRes.ok()).toBeTruthy();

      const getRes = await request.get(`${graphApi(projectConfig)}/nodes/${node.id}`);
      expect(getRes.status()).toBe(404);
    });
  });

  test.describe('Edges', () => {
    test('POST /edges creates edge between nodes', async ({ request, projectConfig }) => {
      const n1 = (await (await request.post(`${graphApi(projectConfig)}/nodes`, { data: { label: 'Source', type: 'TOPIC' } })).json()).data;
      const n2 = (await (await request.post(`${graphApi(projectConfig)}/nodes`, { data: { label: 'Target', type: 'CONCEPT' } })).json()).data;

      const edgeRes = await request.post(`${graphApi(projectConfig)}/edges`, {
        data: { sourceId: n1.id, targetId: n2.id, type: 'CONTAINS' },
      });
      expect(edgeRes.status()).toBe(201);

      await request.delete(`${graphApi(projectConfig)}/nodes/${n1.id}`);
      await request.delete(`${graphApi(projectConfig)}/nodes/${n2.id}`);
    });

    test('POST /edges rejects self-loops', async ({ request, projectConfig }) => {
      const n = (await (await request.post(`${graphApi(projectConfig)}/nodes`, { data: { label: 'Self', type: 'CONCEPT' } })).json()).data;

      const res = await request.post(`${graphApi(projectConfig)}/edges`, {
        data: { sourceId: n.id, targetId: n.id, type: 'RELATES_TO' },
      });
      expect(res.status()).toBe(400);

      await request.delete(`${graphApi(projectConfig)}/nodes/${n.id}`);
    });
  });

  test.describe('Special operations', () => {
    test('GET /search returns matching nodes', async ({ request, projectConfig }) => {
      const n = (await (await request.post(`${graphApi(projectConfig)}/nodes`, { data: { label: 'Photosynthesis', type: 'CONCEPT' } })).json()).data;

      const res = await request.get(`${graphApi(projectConfig)}/search?q=photo`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.data.some((node: any) => node.id === n.id)).toBeTruthy();

      await request.delete(`${graphApi(projectConfig)}/nodes/${n.id}`);
    });

    test('POST /positions batch saves', async ({ request, projectConfig }) => {
      const res = await request.post(`${graphApi(projectConfig)}/positions`, {
        data: { positions: [] },
      });
      expect(res.ok()).toBeTruthy();
    });

    test('POST /merge merges two nodes', async ({ request, projectConfig }) => {
      const n1 = (await (await request.post(`${graphApi(projectConfig)}/nodes`, { data: { label: 'Node A', type: 'CONCEPT' } })).json()).data;
      const n2 = (await (await request.post(`${graphApi(projectConfig)}/nodes`, { data: { label: 'Node B', type: 'CONCEPT', description: 'B desc' } })).json()).data;

      const res = await request.post(`${graphApi(projectConfig)}/merge`, {
        data: { nodeId1: n1.id, nodeId2: n2.id },
      });
      expect(res.ok()).toBeTruthy();

      const getN2 = await request.get(`${graphApi(projectConfig)}/nodes/${n2.id}`);
      expect(getN2.status()).toBe(404);

      await request.delete(`${graphApi(projectConfig)}/nodes/${n1.id}`);
    });

    test('GET /stats returns counts', async ({ request, projectConfig }) => {
      const res = await request.get(`${graphApi(projectConfig)}/stats`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.data).toHaveProperty('nodeCount');
      expect(body.data).toHaveProperty('edgeCount');
    });
  });

  // ─── AI Pipeline: Multi-concept graph building ────────────────────────────

  test.describe('Graph Building @ai', () => {
    test.describe.configure({ timeout: 30_000 });

    test('builds connected biology concept graph', async ({ request, projectConfig }) => {
      const gApi = graphApi(projectConfig);
      // Create biology concept nodes
      const concepts = ['Mitochondria', 'ATP', 'Cell Membrane', 'Photosynthesis', 'DNA Replication'];
      const nodeIds: string[] = [];

      for (const label of concepts) {
        const res = await request.post(`${gApi}/nodes`, {
          data: { label, type: 'CONCEPT', description: `Biology concept: ${label}` },
        });
        expect(res.status()).toBe(201);
        nodeIds.push((await res.json()).data.id);
      }

      // Create edges: Mitochondria → ATP, Photosynthesis → ATP
      const edge1 = await request.post(`${gApi}/edges`, {
        data: { sourceId: nodeIds[0], targetId: nodeIds[1], type: 'RELATES_TO', label: 'produces' },
      });
      expect(edge1.status()).toBe(201);

      const edge2 = await request.post(`${gApi}/edges`, {
        data: { sourceId: nodeIds[3], targetId: nodeIds[1], type: 'RELATES_TO', label: 'produces' },
      });
      expect(edge2.status()).toBe(201);

      // Verify search finds our concepts
      const searchRes = await request.get(`${gApi}/search?q=Mitochondria`);
      expect(searchRes.ok()).toBeTruthy();
      const searchBody = await searchRes.json();
      expect(searchBody.data.some((n: any) => n.label === 'Mitochondria')).toBeTruthy();

      // Verify stats increased
      const statsRes = await request.get(`${gApi}/stats`);
      const stats = (await statsRes.json()).data;
      expect(stats.nodeCount).toBeGreaterThanOrEqual(5);
      expect(stats.edgeCount).toBeGreaterThanOrEqual(2);

      // Cleanup
      for (const id of nodeIds.reverse()) {
        await request.delete(`${gApi}/nodes/${id}`);
      }
    });
  });
});
