import { test, expect } from '../../../src/fixtures';

test.describe('Subscription & Payment Endpoints @studytab @api @payments', () => {
  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;

  // ── Public endpoint tests ──────────────────────────────────────────────────

  test('GET /subscriptions/plans returns 3 tiers with pricing', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/subscriptions/plans`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const plans = Array.isArray(body.data) ? body.data : body.data?.plans;
    expect(Array.isArray(plans)).toBeTruthy();
    expect(plans.length).toBe(3);

    // Verify the 3 tiers exist
    const tierNames = plans.map((p: { tier: string }) => p.tier);
    expect(tierNames).toContain('FREE');
    expect(tierNames).toContain('PRO');
    expect(tierNames).toContain('PREMIUM');

    // Each plan should have pricing info
    for (const plan of plans) {
      expect(plan).toHaveProperty('tier');
      expect(plan).toHaveProperty('price');
    }
  });

  test('GET /subscriptions/plans is accessible without authentication', async ({ request, projectConfig }) => {
    // Use a fresh context with no auth state
    const unauthCtx = await request.newContext();

    const response = await unauthCtx.get(`${apiBase(projectConfig.apiUrl)}/subscriptions/plans`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);

    await unauthCtx.dispose();
  });

  // ── Standard user validation tests ─────────────────────────────────────────

  test('GET /subscriptions/current returns null/empty for user with no subscription', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.get(`${apiBase(projectConfig.apiUrl)}/subscriptions/current`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    // User with no subscription should get null/empty data
    expect(body.data === null || body.data === undefined || body.data?.tier === 'FREE').toBeTruthy();

    await userCtx.dispose();
  });

  test('POST /subscriptions/checkout with tier=FREE returns 400', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/subscriptions/checkout`, {
      data: { tier: 'FREE' },
    });

    expect(response.status()).toBe(400);

    await userCtx.dispose();
  });

  test('POST /subscriptions/checkout with invalid tier returns validation error', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/subscriptions/checkout`, {
      data: { tier: 'INVALID_TIER' },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await userCtx.dispose();
  });

  test('POST /subscriptions/cancel returns error when user has no active subscription', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/subscriptions/cancel`);

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await userCtx.dispose();
  });

  test('POST /subscriptions/change-tier returns error when user has no active subscription', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/subscriptions/change-tier`, {
      data: { tier: 'PREMIUM' },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await userCtx.dispose();
  });

  // ── Admin endpoint ─────────────────────────────────────────────────────────

  test('GET /admin/subscriptions returns paginated list', async ({ request, projectConfig }) => {
    const adminCtx = await request.newContext({
      storageState: '.auth/admin.json',
    });

    const response = await adminCtx.get(`${apiBase(projectConfig.apiUrl)}/admin/subscriptions`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    await adminCtx.dispose();
  });
});
