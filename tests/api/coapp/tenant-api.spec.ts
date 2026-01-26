/**
 * CoApp Tenant API Tests
 *
 * Tests for tenant management endpoints against a running CoApp API.
 * These tests validate multi-tenant functionality.
 *
 * Run with: npx playwright test tests/api/coapp/tenant-api.spec.ts --project=coapp-api
 *
 * @tags @coapp @api @tenant
 */

import { test, expect } from '@playwright/test';
import {
  TenantContextSchema,
  TenantMembersResponseSchema,
  CreateTenantResponseSchema,
} from '../../../src/contracts/coapp';
import {
  API_URL,
  testHeaders,
  authHeaders,
  tenantHeaders,
  testUser as createTestUser,
  testTenant as createTestTenant,
} from './helpers';

test.describe('CoApp Tenant API @coapp @api @tenant', () => {
  // Test user credentials - create fresh user for tenant tests
  const testUserData = createTestUser({ name: 'Tenant Test User' });

  let accessToken: string;
  let tenantId: string;
  let tenantSlug: string;

  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    // Register user
    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: testUserData,
    });

    // Login to get access token
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: {
        email: testUserData.email,
        password: testUserData.password,
      },
    });

    if (loginResponse.ok()) {
      const loginBody = await loginResponse.json();
      accessToken = (loginBody.data || loginBody).accessToken;
    }
  });

  test('POST /tenants - should create new tenant', async ({ request }) => {
    test.skip(!accessToken, 'No access token available');

    const tenantData = createTestTenant();

    const response = await request.post(`${API_URL}/tenants`, {
      headers: authHeaders(accessToken),
      data: tenantData,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    const responseData = body.data || body;

    // Validate against schema
    const parsed = CreateTenantResponseSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Extract tenant data (handle both { message, tenant } and direct tenant response)
    const tenant = responseData.tenant || responseData;

    // Verify tenant data
    expect(tenant.name).toBe(tenantData.name);
    expect(tenant.slug).toBe(tenantData.slug);

    // Store for later tests
    tenantId = tenant.id;
    tenantSlug = tenant.slug;
  });

  test('POST /tenants - should reject duplicate slug', async ({ request }) => {
    test.skip(!tenantSlug, 'No tenant slug available');

    const response = await request.post(`${API_URL}/tenants`, {
      headers: authHeaders(accessToken),
      data: {
        name: 'Another Org',
        slug: tenantSlug, // Same slug as before
      },
    });

    expect([400, 409]).toContain(response.status());
  });

  test('POST /tenants - should require authentication', async ({ request }) => {
    const response = await request.post(`${API_URL}/tenants`, {
      headers: testHeaders, // No auth token
      data: {
        name: 'Unauthorized Org',
        slug: `unauthorized-org-${Date.now()}`,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /tenants/current - should return tenant context', async ({ request }) => {
    test.skip(!tenantId, 'No tenant ID available');

    const response = await request.get(`${API_URL}/tenants/current`, {
      headers: tenantHeaders(accessToken, tenantId),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const responseData = body.data || body;

    // Validate against schema
    const parsed = TenantContextSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Verify context (API returns tenant directly with embedded features/limits)
    expect(responseData.id).toBe(tenantId);
    expect(responseData.slug).toBeDefined();
    expect(responseData.name).toBeDefined();
    expect(responseData.features).toBeDefined();
    expect(responseData.limits).toBeDefined();
  });

  test('GET /tenants/current - should require tenant header', async ({ request }) => {
    test.skip(!accessToken, 'No access token available');

    const response = await request.get(`${API_URL}/tenants/current`, {
      headers: authHeaders(accessToken), // No X-Tenant-ID header
    });

    // Should fail without tenant context (401, 400, or 403 are acceptable)
    expect([401, 400, 403]).toContain(response.status());
  });

  test('PATCH /tenants/current - should update tenant', async ({ request }) => {
    test.skip(!tenantId, 'No tenant ID available');

    const newName = `Updated Org ${Date.now()}`;

    const response = await request.patch(`${API_URL}/tenants/current`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: newName,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const responseData = body.data || body;

    expect(responseData.name || responseData.tenant?.name).toBe(newName);
  });

  test('GET /tenants/current/members - should list tenant members', async ({ request }) => {
    test.skip(!tenantId, 'No tenant ID available');

    const response = await request.get(`${API_URL}/tenants/current/members`, {
      headers: tenantHeaders(accessToken, tenantId),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const responseData = body.data || body;

    // Validate against schema
    const parsed = TenantMembersResponseSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Handle both { members, total } and direct array response
    const members = Array.isArray(responseData) ? responseData : responseData.members;

    // Should have at least the owner (creator)
    expect(members.length).toBeGreaterThanOrEqual(1);
    if (!Array.isArray(responseData)) {
      expect(responseData.total).toBeGreaterThanOrEqual(1);
    }

    // Creator should be owner (check both uppercase and lowercase)
    const owner = members.find(
      (m: { role: string }) => m.role === 'owner' || m.role === 'OWNER'
    );
    expect(owner).toBeDefined();
  });
});

test.describe('CoApp Tenant Isolation @coapp @api @tenant @isolation', () => {
  // Two separate users with their own tenants
  const user1 = createTestUser({ name: 'Isolation User 1' });
  const user2 = createTestUser({ name: 'Isolation User 2' });

  let user1Token: string;
  let user2Token: string;
  let user1TenantId: string;
  let user2TenantId: string;

  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    // Register both users
    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: user1,
    });
    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: user2,
    });

    // Login both users
    const login1 = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { email: user1.email, password: user1.password },
    });
    const login2 = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { email: user2.email, password: user2.password },
    });

    if (login1.ok()) {
      const body1 = await login1.json();
      user1Token = (body1.data || body1).accessToken;
    }
    if (login2.ok()) {
      const body2 = await login2.json();
      user2Token = (body2.data || body2).accessToken;
    }

    // Create tenant for each user (if logged in)
    if (user1Token) {
      const tenant1Response = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(user1Token),
        data: createTestTenant({ name: 'User1 Org' }),
      });
      if (tenant1Response.ok()) {
        const tenant1Body = await tenant1Response.json();
        user1TenantId = (tenant1Body.data || tenant1Body).tenant?.id;
      }
    }

    if (user2Token) {
      const tenant2Response = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(user2Token),
        data: createTestTenant({ name: 'User2 Org' }),
      });
      if (tenant2Response.ok()) {
        const tenant2Body = await tenant2Response.json();
        user2TenantId = (tenant2Body.data || tenant2Body).tenant?.id;
      }
    }
  });

  test('should not allow user to access another tenant', async ({ request }) => {
    test.skip(!user1Token || !user2TenantId, 'Missing test prerequisites');

    // User1 tries to access User2's tenant
    const response = await request.get(`${API_URL}/tenants/current`, {
      headers: tenantHeaders(user1Token, user2TenantId), // User2's tenant
    });

    // Should be forbidden
    expect([403, 404]).toContain(response.status());
  });

  test('should not allow user to modify another tenant', async ({ request }) => {
    test.skip(!user1Token || !user2TenantId, 'Missing test prerequisites');

    // User1 tries to update User2's tenant
    const response = await request.patch(`${API_URL}/tenants/current`, {
      headers: tenantHeaders(user1Token, user2TenantId),
      data: {
        name: 'Hacked Name',
      },
    });

    expect([403, 404]).toContain(response.status());
  });

  test('should not allow user to list members of another tenant', async ({ request }) => {
    test.skip(!user1Token || !user2TenantId, 'Missing test prerequisites');

    const response = await request.get(`${API_URL}/tenants/current/members`, {
      headers: tenantHeaders(user1Token, user2TenantId),
    });

    expect([403, 404]).toContain(response.status());
  });

  test('each user should only see their own tenants in /auth/me', async ({ request }) => {
    test.skip(!user1Token || !user1TenantId, 'Missing test prerequisites');

    const response = await request.get(`${API_URL}/auth/me`, {
      headers: authHeaders(user1Token),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const userData = body.data || body;

    // User1 should only see their own tenants
    if (userData.tenants) {
      const tenantIds = userData.tenants.map((t: { tenantId: string }) => t.tenantId);
      expect(tenantIds).toContain(user1TenantId);
      expect(tenantIds).not.toContain(user2TenantId);
    }
  });
});

test.describe('CoApp Tenant Member Management @coapp @api @tenant @members', () => {
  const owner = createTestUser({ name: 'Member Test Owner' });
  const member = createTestUser({ name: 'Member Test User' });

  let ownerToken: string;
  let memberToken: string;
  let tenantId: string;

  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    // Register both users
    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: owner,
    });
    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: member,
    });

    // Login owner
    const ownerLogin = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { email: owner.email, password: owner.password },
    });
    if (ownerLogin.ok()) {
      const ownerBody = await ownerLogin.json();
      ownerToken = (ownerBody.data || ownerBody).accessToken;
    }

    // Login member
    const memberLogin = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { email: member.email, password: member.password },
    });
    if (memberLogin.ok()) {
      const memberBody = await memberLogin.json();
      memberToken = (memberBody.data || memberBody).accessToken;
    }

    // Create tenant as owner (if logged in)
    if (ownerToken) {
      const tenantResponse = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(ownerToken),
        data: createTestTenant({ name: 'Member Test Org' }),
      });
      if (tenantResponse.ok()) {
        const tenantBody = await tenantResponse.json();
        tenantId = (tenantBody.data || tenantBody).tenant?.id;
      }
    }
  });

  test('POST /tenants/current/members/invite - owner should invite member', async ({
    request,
  }) => {
    test.skip(!ownerToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/tenants/current/members/invite`, {
      headers: tenantHeaders(ownerToken, tenantId),
      data: {
        email: member.email,
        role: 'member',
      },
    });

    // Should succeed
    expect([200, 201]).toContain(response.status());
  });

  test('non-owner should not be able to invite members', async ({ request }) => {
    test.skip(!memberToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/tenants/current/members/invite`, {
      headers: tenantHeaders(memberToken, tenantId),
      data: {
        email: 'newmember@example.com',
        role: 'member',
      },
    });

    // Should be forbidden (only owner/admin can invite)
    expect([401, 403]).toContain(response.status());
  });

  test('PATCH /tenants/current/members/:userId - owner should update member role', async ({
    request,
  }) => {
    test.skip(!ownerToken || !tenantId, 'Missing test prerequisites');

    // First get members to find the member's userId
    const membersResponse = await request.get(`${API_URL}/tenants/current/members`, {
      headers: tenantHeaders(ownerToken, tenantId),
    });

    const membersBody = await membersResponse.json();
    const members = (membersBody.data || membersBody).members;
    const memberUser = members?.find((m: { role: string }) => m.role === 'member');

    if (memberUser) {
      const response = await request.patch(
        `${API_URL}/tenants/current/members/${memberUser.userId}`,
        {
          headers: tenantHeaders(ownerToken, tenantId),
          data: {
            role: 'admin',
          },
        }
      );

      expect([200, 204]).toContain(response.status());
    }
  });

  test('DELETE /tenants/current/members/:userId - owner should remove member', async ({
    request,
  }) => {
    test.skip(!ownerToken || !tenantId, 'Missing test prerequisites');

    // Get members to find a removable member
    const membersResponse = await request.get(`${API_URL}/tenants/current/members`, {
      headers: tenantHeaders(ownerToken, tenantId),
    });

    const membersBody = await membersResponse.json();
    const members = (membersBody.data || membersBody).members;
    const removableMember = members?.find((m: { role: string }) => m.role !== 'owner');

    if (removableMember) {
      const response = await request.delete(
        `${API_URL}/tenants/current/members/${removableMember.userId}`,
        {
          headers: tenantHeaders(ownerToken, tenantId),
        }
      );

      expect([200, 204]).toContain(response.status());
    }
  });
});
