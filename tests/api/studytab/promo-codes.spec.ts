import { test, expect } from '../../../src/fixtures';

test.describe('Promo Code Admin CRUD & Validation @studytab @api @admin @promo', () => {
  test.use({ storageState: '.auth/admin.json' });

  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;
  const promoCode = `TEST${Date.now()}`;
  let promoId: string;

  test.afterAll(async ({ request, projectConfig }) => {
    // Safety net cleanup — delete the promo code if it still exists
    if (promoId) {
      await request.delete(`${apiBase(projectConfig.apiUrl)}/admin/promo-codes/${promoId}`);
    }
  });

  test('POST /admin/promo-codes creates a promo code', async ({ request, projectConfig }) => {
    const response = await request.post(`${apiBase(projectConfig.apiUrl)}/admin/promo-codes`, {
      data: {
        code: promoCode,
        type: 'PERCENTAGE',
        value: 20,
        maxUses: 10,
        applicableTiers: ['PRO', 'PREMIUM'],
        isActive: true,
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('code', promoCode);
    expect(body.data).toHaveProperty('type', 'PERCENTAGE');
    expect(body.data).toHaveProperty('value', 20);

    promoId = body.data.id;
  });

  test('GET /admin/promo-codes lists the created promo code', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/promo-codes`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const codes = Array.isArray(body.data) ? body.data : body.data?.promoCodes;
    expect(Array.isArray(codes)).toBeTruthy();

    // Our promo code should be in the list
    const found = codes.find((c: { code: string }) => c.code === promoCode);
    expect(found).toBeTruthy();
  });

  test('PUT /admin/promo-codes/:id updates the promo code', async ({ request, projectConfig }) => {
    expect(promoId).toBeTruthy();

    const response = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/promo-codes/${promoId}`,
      { data: { isActive: false } },
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data.isActive).toBe(false);

    // Re-enable for the validation tests below
    const reEnableResponse = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/promo-codes/${promoId}`,
      { data: { isActive: true } },
    );
    expect(reEnableResponse.ok()).toBeTruthy();
  });

  test('POST /subscriptions/apply-promo validates the promo code (user auth)', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/subscriptions/apply-promo`, {
      data: {
        code: promoCode,
        tier: 'PRO',
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('valid', true);
    expect(body.data).toHaveProperty('discount');
    expect(typeof body.data.discount).toBe('number');

    await userCtx.dispose();
  });

  test('POST /subscriptions/apply-promo with invalid code returns invalid', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.post(`${apiBase(projectConfig.apiUrl)}/subscriptions/apply-promo`, {
      data: {
        code: 'NONEXISTENT_CODE_12345',
        tier: 'PRO',
      },
    });

    // Could be 200 with valid:false or 400/404 — accept either
    const body = await response.json();
    if (response.ok()) {
      expect(body.data).toHaveProperty('valid', false);
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }

    await userCtx.dispose();
  });

  test('DELETE /admin/promo-codes/:id deletes the promo code', async ({ request, projectConfig }) => {
    expect(promoId).toBeTruthy();

    const response = await request.delete(
      `${apiBase(projectConfig.apiUrl)}/admin/promo-codes/${promoId}`,
    );

    expect(response.ok()).toBeTruthy();

    // Verify it's gone
    const checkResponse = await request.get(
      `${apiBase(projectConfig.apiUrl)}/admin/promo-codes/${promoId}`,
    );
    expect(checkResponse.status()).toBe(404);

    // Clear so afterAll doesn't try to delete again
    promoId = '';
  });
});
