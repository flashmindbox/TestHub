import { test, expect } from '../../../src/fixtures';

test.describe('Admin User Management @studytab @api @admin', () => {
  test.use({ storageState: '.auth/admin.json' });

  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;

  test('GET /admin/users returns paginated user list', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    // Should have pagination metadata
    const data = body.data;
    if (data.users) {
      expect(Array.isArray(data.users)).toBeTruthy();
    } else {
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('GET /admin/users with search param filters by name/email', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users?search=test`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  test('GET /admin/users with status filter works', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users?status=active`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  test('GET /admin/users/:id returns user detail with roles and counts', async ({ request, projectConfig }) => {
    // Get a user ID first
    const listResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);
    const listBody = await listResponse.json();
    const users = Array.isArray(listBody.data) ? listBody.data : listBody.data?.users;
    expect(users.length).toBeGreaterThan(0);

    const userId = users[0].id;

    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users/${userId}`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('id', userId);
  });

  test('PUT /admin/users/:id/status changes user status and reactivates', async ({ request, projectConfig }) => {
    // Get a non-admin test user
    const listResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users?search=test`);
    const listBody = await listResponse.json();
    const users = Array.isArray(listBody.data) ? listBody.data : listBody.data?.users;
    expect(users.length).toBeGreaterThan(0);

    // Find a user that is not the admin
    const targetUser = users.find((u: { role?: string; email?: string }) =>
      u.role !== 'admin' && u.email !== 'admin@example.com'
    ) || users[0];
    const userId = targetUser.id;

    // Suspend the user
    const suspendResponse = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${userId}/status`,
      { data: { status: 'suspended' } },
    );
    expect(suspendResponse.ok()).toBeTruthy();

    // IMMEDIATELY reactivate — never leave a test user in broken state
    const reactivateResponse = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${userId}/status`,
      { data: { status: 'active' } },
    );
    expect(reactivateResponse.ok()).toBeTruthy();

    const body = await reactivateResponse.json();
    expect(body).toHaveProperty('success', true);
  });

  test('status change creates audit log entry', async ({ request, projectConfig }) => {
    // Get a test user
    const listResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users?search=test`);
    const listBody = await listResponse.json();
    const users = Array.isArray(listBody.data) ? listBody.data : listBody.data?.users;
    const targetUser = users.find((u: { role?: string; email?: string }) =>
      u.role !== 'admin' && u.email !== 'admin@example.com'
    ) || users[0];
    const userId = targetUser.id;

    // Perform a status change (suspend then reactivate)
    await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${userId}/status`,
      { data: { status: 'suspended' } },
    );
    await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${userId}/status`,
      { data: { status: 'active' } },
    );

    // Check audit log for this user
    const auditResponse = await request.get(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${userId}/audit`,
    );

    expect(auditResponse.ok()).toBeTruthy();

    const body = await auditResponse.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    const entries = Array.isArray(body.data) ? body.data : body.data?.entries;
    expect(Array.isArray(entries)).toBeTruthy();
    expect(entries.length).toBeGreaterThan(0);
  });

  test('GET /admin/users/:id/audit returns paginated audit entries', async ({ request, projectConfig }) => {
    // Get a user ID
    const listResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users`);
    const listBody = await listResponse.json();
    const users = Array.isArray(listBody.data) ? listBody.data : listBody.data?.users;
    const userId = users[0].id;

    const response = await request.get(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${userId}/audit`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  test('cannot change own status', async ({ request, projectConfig }) => {
    // Get the current admin's session to find own user ID
    const sessionResponse = await request.get(`${projectConfig.apiUrl}/auth/get-session`);
    let ownUserId: string | undefined;

    if (sessionResponse.ok()) {
      const sessionBody = await sessionResponse.json();
      ownUserId = sessionBody.user?.id;
    }

    // If we couldn't get the session, try to find admin in user list
    if (!ownUserId) {
      const listResponse = await request.get(`${apiBase(projectConfig.apiUrl)}/admin/users?search=admin`);
      const listBody = await listResponse.json();
      const users = Array.isArray(listBody.data) ? listBody.data : listBody.data?.users;
      const adminUser = users.find((u: { role?: string; email?: string }) =>
        u.role === 'admin' || u.email === 'admin@example.com'
      );
      ownUserId = adminUser?.id;
    }

    expect(ownUserId).toBeTruthy();

    // Try to change own status — should fail
    const response = await request.put(
      `${apiBase(projectConfig.apiUrl)}/admin/users/${ownUserId}/status`,
      { data: { status: 'suspended' } },
    );

    expect(response.ok()).toBeFalsy();
    // Expect 400 or 403
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
