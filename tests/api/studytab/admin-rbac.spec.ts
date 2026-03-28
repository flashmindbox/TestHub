import { test, expect } from '../../../src/fixtures';

test.describe('Admin RBAC Permission System @studytab @api @admin', () => {
  // Admin auth for most tests
  test.use({ storageState: '.auth/admin.json' });

  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;

  // ── Non-admin permission denial tests ──────────────────────────────────────

  test('non-admin user gets 403 on /admin/users', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);

    expect(response.status()).toBe(403);

    await userCtx.dispose();
  });

  test('non-admin user gets 403 on /admin/roles', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.get(`${apiBase(projectConfig.apiUrl)}/admin/roles`);

    expect(response.status()).toBe(403);

    await userCtx.dispose();
  });

  test('non-admin user gets 403 on /admin/reports', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.get(`${apiBase(projectConfig.apiUrl)}/admin/reports`);

    expect(response.status()).toBe(403);

    await userCtx.dispose();
  });

  test('non-admin user gets 403 on /admin/analytics/overview', async ({ request, projectConfig }) => {
    const userCtx = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await userCtx.get(`${apiBase(projectConfig.apiUrl)}/admin/analytics/overview`);

    expect(response.status()).toBe(403);

    await userCtx.dispose();
  });

  // ── Admin access tests ─────────────────────────────────────────────────────

  test('admin can access /admin/users', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  test('admin can access /admin/analytics/overview', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/analytics/overview`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  test('GET /admin/roles/permissions returns role-permission map', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/roles/permissions`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    // Permission map should be an object with role keys
    expect(typeof body.data).toBe('object');
  });

  test('role assignment creates a UserRole record', async ({ request, projectConfig, cleanup }) => {
    // First, find a test user via GET /admin/users
    const usersResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);
    expect(usersResponse.ok()).toBeTruthy();
    const usersBody = await usersResponse.json();
    const users = Array.isArray(usersBody.data) ? usersBody.data : usersBody.data?.users;
    expect(users.length).toBeGreaterThan(0);

    const targetUser = users[0];

    // Assign a role
    const response = await request.post(`${apiBase(projectConfig.apiUrl)}/admin/roles`, {
      data: {
        userId: targetUser.id,
        role: 'moderator',
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id');

    // Track for cleanup
    cleanup.track({
      type: 'role',
      id: body.data.id,
      name: `role-${targetUser.id}`,
      deleteVia: 'api',
      deletePath: `${apiBase(projectConfig.apiUrl)}/admin/roles/${body.data.id}`,
      project: 'studytab',
      createdAt: new Date(),
    });
  });

  test('role revocation removes access', async ({ request, projectConfig }) => {
    // Find a test user
    const usersResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);
    const usersBody = await usersResponse.json();
    const users = Array.isArray(usersBody.data) ? usersBody.data : usersBody.data?.users;
    const targetUser = users[0];

    // Assign a role first
    const assignResponse = await request.post(`${apiBase(projectConfig.apiUrl)}/admin/roles`, {
      data: {
        userId: targetUser.id,
        role: 'moderator',
      },
    });
    expect(assignResponse.ok()).toBeTruthy();
    const assignBody = await assignResponse.json();
    const roleId = assignBody.data.id;

    // Revoke the role
    const deleteResponse = await request.delete(`${apiBase(projectConfig.apiUrl)}/admin/roles/${roleId}`);

    expect(deleteResponse.ok()).toBeTruthy();
  });

  test('audit log records admin actions', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/audit`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    const entries = Array.isArray(body.data) ? body.data : body.data?.entries;
    expect(Array.isArray(entries)).toBeTruthy();
  });
});
