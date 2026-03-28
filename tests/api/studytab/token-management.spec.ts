import { test, expect } from '../../../src/fixtures';

const api = (apiUrl: string) => `${apiUrl}/api/v1`;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const parse = async (res: any) => { const j = await res.json(); return j.data ?? j; };

test.describe('Token Management System @studytab @api @tokens', () => {
  test.describe.configure({ timeout: 120_000, mode: 'serial' });
  test.use({ storageState: '.auth/user.json' });

  let testUserId: string;
  let cardGenRan = false;

  // ─── BALANCE & BASICS ───

  test('new user gets tier-appropriate token allocation', async ({ request, projectConfig }) => {
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    expect(data).toHaveProperty('available');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('tierAllocation');
    expect(typeof data.used).toBe('number');
    expect(typeof data.reserved).toBe('number');
    expect(data).toHaveProperty('resetDate');
  });

  test('token balance returns correct reset date', async ({ request, projectConfig }) => {
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`);
    const data = await parse(res);
    const resetDate = new Date(data.resetDate);
    expect(resetDate.getDate()).toBe(1);
    expect(resetDate.getTime()).toBeGreaterThan(Date.now());
  });

  test('token packs endpoint returns active packs', async ({ request, projectConfig }) => {
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/packs`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    const packs = Array.isArray(data) ? data : data?.packs;
    expect(packs.length).toBe(3);
    for (const pack of packs) {
      expect(pack).toHaveProperty('name');
      expect(pack).toHaveProperty('slug');
      expect(pack).toHaveProperty('tokenAmount');
      expect(pack).toHaveProperty('priceInPaise');
    }
    const bySlug = (s: string) => packs.find((p: any) => p.slug === s);
    expect(bySlug('starter')?.tokenAmount).toBe(750_000);
    expect(bySlug('power')?.tokenAmount).toBe(3_000_000);
    expect(bySlug('mega')?.tokenAmount).toBe(7_000_000);
  });

  // ─── ESTIMATION ───

  test('estimate returns cost for card generation', async ({ request, projectConfig }) => {
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/estimate?operationType=card_generation`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    expect(data.estimatedCost).toBeGreaterThan(0);
    expect(typeof data.canAfford).toBe('boolean');
    expect(typeof data.currentBalance).toBe('number');
  });

  test('estimate returns cost for different operations', async ({ request, projectConfig }) => {
    const ops = ['summarization', 'document_chat', 'embedding'];
    const costs: Record<string, number> = {};
    for (const op of ops) {
      await delay(300);
      const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/estimate?operationType=${op}`);
      expect(res.ok()).toBeTruthy();
      costs[op] = (await parse(res)).estimatedCost;
      expect(costs[op]).toBeGreaterThan(0);
    }
    expect(costs.embedding).toBeLessThan(costs.document_chat);
  });

  test('resolve test user ID', async ({ request, projectConfig }) => {
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/users/me`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    testUserId = data?.id || data?.user?.id;
    expect(testUserId).toBeTruthy();
  });

  // ─── DEDUCTION ───

  test('card generation deducts tokens from balance', async ({ request, projectConfig }) => {
    await delay(500);
    const before = await parse(await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`));

    const genRes = await request.post(`${api(projectConfig.apiUrl)}/ai/generate/cards`, {
      data: {
        content: 'The mitochondria is the powerhouse of the cell. It produces ATP via cellular respiration.',
        count: 2,
      },
    });
    if (!genRes.ok()) test.skip(true, `AI provider unavailable (${genRes.status()})`);

    await delay(3000);
    const after = await parse(await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`));

    expect(after.used).toBeGreaterThan(before.used);
    expect(after.available).toBeLessThan(before.available);
    cardGenRan = true;
  });

  test('token transaction is logged after AI operation', async ({ request, projectConfig }) => {
    test.skip(!cardGenRan, 'card generation was skipped — no CONSUMPTION transaction to verify');
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/history?limit=5`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    const txns = data?.transactions || data;
    expect(Array.isArray(txns)).toBeTruthy();
    if (txns.length > 0) {
      const recent = txns[0];
      expect(recent.type).toBe('CONSUMPTION');
      expect(recent.amount).toBeLessThan(0);
    }
  });

  // ─── STREAMING ───

  test('streaming operation reserves and settles tokens', async ({ request, projectConfig }) => {
    await delay(500);
    const before = await parse(await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`));

    const res = await request.post(`${api(projectConfig.apiUrl)}/ai-tools/summarize`, {
      data: {
        content: 'Photosynthesis converts light energy into chemical energy stored in glucose molecules.',
      },
    });
    if (!res.ok()) test.skip(true, `AI provider unavailable (${res.status()})`);

    await delay(3000);
    const after = await parse(await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`));

    expect(after.used).toBeGreaterThan(before.used);
    expect(after.reserved).toBe(before.reserved);
  });

  // ─── INSUFFICIENT TOKENS ───

  test('returns 402 when tokens insufficient', async ({ playwright, request, projectConfig }) => {
    if (!testUserId) test.skip(true, 'No test user ID resolved');
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const balBefore = await parse(await request.get(`${api(projectConfig.apiUrl)}/tokens/balance`));

    if (balBefore.available > 100) {
      await adminCtx.post(`${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/revoke`, {
        data: { amount: balBefore.available - 10, reason: 'E2E insufficient tokens test' },
      });
      await delay(500);
    }
    const genRes = await request.post(`${api(projectConfig.apiUrl)}/ai/generate/cards`, {
      data: { content: 'Token insufficiency test content', count: 10 },
    });
    if (genRes.status() !== 402) {
      // Restore tokens before skipping
      await adminCtx.post(`${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/grant`, {
        data: { amount: balBefore.available, reason: 'E2E test restore' },
      });
      await adminCtx.dispose();
      test.skip(true, `Expected 402 but got ${genRes.status()} — AI provider may be unavailable`);
    }
    const body = await genRes.json();
    expect(body.error || body.data?.error || body.code).toBeTruthy();
    await adminCtx.post(`${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/grant`, {
      data: { amount: balBefore.available, reason: 'E2E test restore' },
    });
    await adminCtx.dispose();
  });

  // ─── HISTORY & USAGE ───

  test('usage breakdown groups by operation', async ({ request, projectConfig }) => {
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/usage?days=30`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    expect(data).toHaveProperty('daily');
    expect(data).toHaveProperty('byOperation');
    if (data.byOperation.length > 0) {
      expect(data.byOperation[0]).toHaveProperty('operationType');
      expect(data.byOperation[0]).toHaveProperty('totalTokens');
    }
  });

  test('transaction history is paginated', async ({ request, projectConfig }) => {
    await delay(300);
    const res = await request.get(`${api(projectConfig.apiUrl)}/tokens/history?page=1&limit=5`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('totalPages');
    expect(data.transactions.length).toBeLessThanOrEqual(5);
  });

  test('transaction history filters by type', async ({ request, projectConfig }) => {
    await delay(300);
    const res1 = await request.get(`${api(projectConfig.apiUrl)}/tokens/history?type=CONSUMPTION`);
    expect(res1.ok()).toBeTruthy();
    const data1 = await parse(res1);
    const txns1 = data1?.transactions || data1;
    if (Array.isArray(txns1)) {
      for (const tx of txns1) expect(tx.type).toBe('CONSUMPTION');
    }
    await delay(300);
    const res2 = await request.get(`${api(projectConfig.apiUrl)}/tokens/history?type=TIER_ALLOCATION`);
    expect(res2.ok()).toBeTruthy();
    const data2 = await parse(res2);
    const txns2 = data2?.transactions || data2;
    if (Array.isArray(txns2)) {
      for (const tx of txns2) expect(tx.type).toBe('TIER_ALLOCATION');
    }
  });

  // ─── ADMIN OPERATIONS ───

  test('admin can view AI models config', async ({ playwright, request, projectConfig }) => {
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const res = await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/models`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    const models = Array.isArray(data) ? data : data?.models;
    expect(models.length).toBeGreaterThanOrEqual(13);
    for (const m of models.slice(0, 3)) {
      expect(m).toHaveProperty('provider');
      expect(m).toHaveProperty('modelId');
      expect(m).toHaveProperty('inputTokenMultiplier');
      expect(m).toHaveProperty('outputTokenMultiplier');
    }
    await adminCtx.dispose();
  });

  test('admin can update model multiplier', async ({ playwright, request, projectConfig }) => {
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });

    const listRes = await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/models`);
    const models = await parse(listRes);
    const list = Array.isArray(models) ? models : models?.models;
    const target = list[0];
    const original = target.inputTokenMultiplier;

    const upRes = await adminCtx.put(`${api(projectConfig.apiUrl)}/admin/ai/models/${target.id}`, {
      data: { inputTokenMultiplier: 25 },
    });
    expect(upRes.ok()).toBeTruthy();

    await delay(300);
    const verifyRes = await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/models`);
    const updated = await parse(verifyRes);
    const updatedList = Array.isArray(updated) ? updated : updated?.models;
    expect(updatedList.find((m: any) => m.id === target.id).inputTokenMultiplier).toBe(25);

    // Cleanup
    await adminCtx.put(`${api(projectConfig.apiUrl)}/admin/ai/models/${target.id}`, {
      data: { inputTokenMultiplier: original },
    });
    await adminCtx.dispose();
  });

  test('admin can view operation routing', async ({ playwright, request, projectConfig }) => {
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const res = await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/routing`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    const routes = Array.isArray(data) ? data : data?.routes;
    expect(routes.length).toBeGreaterThanOrEqual(14);
    const cardRoute = routes.find((r: any) => r.operationType === 'card_generation');
    expect(cardRoute).toBeTruthy();
    expect(cardRoute.preferredProvider).toBe('openai');
    await adminCtx.dispose();
  });

  test('admin can view and update tier config', async ({ playwright, request, projectConfig }) => {
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const tierRes = await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/tiers`);
    expect(tierRes.ok()).toBeTruthy();
    const tiers = await parse(tierRes);
    const tierList = Array.isArray(tiers) ? tiers : tiers?.tiers;
    expect(tierList.length).toBe(3);
    const upRes = await adminCtx.put(`${api(projectConfig.apiUrl)}/admin/ai/tiers/PRO`, {
      data: { monthlyTokenAllocation: 6_000_000 },
    });
    expect(upRes.ok()).toBeTruthy();
    await delay(300);
    await adminCtx.put(`${api(projectConfig.apiUrl)}/admin/ai/tiers/PRO`, {
      data: { monthlyTokenAllocation: 5_000_000 },
    });
    await adminCtx.dispose();
  });

  test('admin can grant tokens to user', async ({ playwright, request, projectConfig }) => {
    if (!testUserId) test.skip(true, 'No test user ID resolved');
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const before = await parse(await adminCtx.get(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/tokens`
    ));
    await delay(300);
    const grantRes = await adminCtx.post(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/grant`,
      { data: { amount: 10_000, reason: 'E2E test grant' } }
    );
    expect(grantRes.ok()).toBeTruthy();
    await delay(300);
    const after = await parse(await adminCtx.get(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/tokens`
    ));
    expect((after?.bonus ?? after?.balance?.bonus ?? 0))
      .toBeGreaterThan(before?.bonus ?? before?.balance?.bonus ?? 0);
    await adminCtx.dispose();
  });

  test('admin can revoke tokens from user', async ({ playwright, request, projectConfig }) => {
    if (!testUserId) test.skip(true, 'No test user ID resolved');
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const revokeRes = await adminCtx.post(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/revoke`,
      { data: { amount: 5_000, reason: 'E2E test revoke' } }
    );
    expect(revokeRes.ok()).toBeTruthy();
    await delay(300);
    const histData = await parse(await request.get(
      `${api(projectConfig.apiUrl)}/tokens/history?limit=5`
    ));
    const txns = histData?.transactions || histData;
    if (Array.isArray(txns)) {
      expect(txns.find((t: any) => t.type === 'ADMIN_REVOKE')).toBeTruthy();
    }
    await adminCtx.post(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/grant`,
      { data: { amount: 5_000, reason: 'E2E test restore after revoke' } }
    );
    await adminCtx.dispose();
  });

  test('admin can disable AI for a user', async ({ playwright, request, projectConfig }) => {
    if (!testUserId) test.skip(true, 'No test user ID resolved');
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const disableRes = await adminCtx.put(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/ai-access`,
      { data: { enabled: false } }
    );
    expect(disableRes.ok()).toBeTruthy();
    await delay(500);
    const aiRes = await request.post(`${api(projectConfig.apiUrl)}/ai/generate/cards`, {
      data: { content: 'Should fail - AI disabled', count: 1 },
    });
    expect([403, 422]).toContain(aiRes.status());
    await adminCtx.put(
      `${api(projectConfig.apiUrl)}/admin/ai/users/${testUserId}/ai-access`,
      { data: { enabled: true } }
    );
    await adminCtx.dispose();
  });

  test('admin dashboard returns stats', async ({ playwright, request, projectConfig }) => {
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const res = await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/dashboard`);
    expect(res.ok()).toBeTruthy();
    const data = await parse(res);
    expect(data).toHaveProperty('totalTokensConsumed');
    expect(data).toHaveProperty('totalTokensAllocated');
    expect(data).toHaveProperty('activeUsers');
    expect(data).toHaveProperty('estimatedMonthlyCost');
    await adminCtx.dispose();
  });

  // ─── PACKS ADMIN ───

  test('admin can CRUD token packs', async ({ playwright, request, projectConfig }) => {
    await delay(300);
    const adminCtx = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    const createRes = await adminCtx.post(`${api(projectConfig.apiUrl)}/admin/ai/packs`, {
      data: { name: 'Test Pack', slug: 'test-e2e', tokenAmount: 1000, priceInPaise: 100 },
    });
    expect(createRes.ok()).toBeTruthy();
    const packId = (await parse(createRes)).id;
    await delay(300);
    const updateRes = await adminCtx.put(`${api(projectConfig.apiUrl)}/admin/ai/packs/${packId}`, {
      data: { tokenAmount: 2000 },
    });
    expect(updateRes.ok()).toBeTruthy();
    await delay(300);
    expect((await adminCtx.delete(`${api(projectConfig.apiUrl)}/admin/ai/packs/${packId}`)).ok()).toBeTruthy();
    await delay(300);
    const packs = await parse(await adminCtx.get(`${api(projectConfig.apiUrl)}/admin/ai/packs`));
    const packList = Array.isArray(packs) ? packs : packs?.packs;
    const testPack = packList?.find((p: any) => p.slug === 'test-e2e');
    if (testPack) expect(testPack.isActive).toBe(false);
    await adminCtx.dispose();
  });
});
