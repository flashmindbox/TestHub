/**
 * CoApp Student API Tests
 *
 * Tests for student management endpoints against a running CoApp API.
 * These tests validate CRUD operations, validation, and tenant isolation.
 *
 * Run with: npm run test:coapp -- student-api
 *
 * @tags @coapp @api @students
 */

import { test, expect } from '@playwright/test';
import {
  StudentSchema,
  PaginatedStudentsResponseSchema,
  CreateStudentRequestSchema,
} from '../../../src/contracts/coapp';
import {
  API_URL,
  testHeaders,
  authHeaders,
  tenantHeaders,
  testUser as createTestUser,
  testTenant as createTestTenant,
} from './helpers';

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

/**
 * Generate unique student data for testing
 */
const testStudent = (
  overrides?: Partial<{
    name: string;
    email: string;
    phone: string;
    guardianName: string;
    guardianPhone: string;
    enrollmentNo: string;
    status: string;
  }>
) => ({
  name: overrides?.name || `Test Student ${Date.now()}`,
  email: overrides?.email || `student-${Date.now()}@example.com`,
  phone: overrides?.phone || '9876543210',
  guardianName: overrides?.guardianName || 'Test Guardian',
  guardianPhone: overrides?.guardianPhone || '9876543211',
  enrollmentNo: overrides?.enrollmentNo || `ENR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  status: overrides?.status || 'active',
});

// =============================================================================
// STUDENT CRUD TESTS
// =============================================================================

test.describe('CoApp Student API - CRUD @coapp @api @students', () => {
  const testUserData = createTestUser({ name: 'Student Test User' });

  let accessToken: string;
  let tenantId: string;
  let createdStudentId: string;
  let createdEnrollmentNo: string;

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

    // Create tenant for this test suite
    if (accessToken) {
      const tenantResponse = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(accessToken),
        data: createTestTenant({ name: 'Student Test Org' }),
      });

      if (tenantResponse.ok()) {
        const tenantBody = await tenantResponse.json();
        const tenant = (tenantBody.data || tenantBody).tenant || tenantBody.data || tenantBody;
        tenantId = tenant.id;
      }
    }
  });

  test('POST /students - should create student (happy path)', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const studentData = testStudent();
    createdEnrollmentNo = studentData.enrollmentNo;

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: studentData,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    const responseData = body.data || body;

    // Validate against schema
    const parsed = StudentSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Verify student data
    expect(responseData.name).toBe(studentData.name);
    expect(responseData.email).toBe(studentData.email);
    expect(responseData.enrollmentNo).toBe(studentData.enrollmentNo);
    expect(responseData.guardianName).toBe(studentData.guardianName);
    expect(responseData.tenantId).toBe(tenantId);

    // Store for later tests
    createdStudentId = responseData.id;
  });

  test('POST /students - should return validation error (400)', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    // Missing required fields
    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        // Missing name, guardianName, guardianPhone, enrollmentNo
        email: 'incomplete@example.com',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());

    const body = await response.json();
    expect(body.message || body.error || body.errors).toBeDefined();
  });

  test('POST /students - should reject duplicate enrollmentNo (409)', async ({ request }) => {
    test.skip(!accessToken || !tenantId || !createdEnrollmentNo, 'Missing test prerequisites');

    // Try to create another student with same enrollmentNo
    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: testStudent({ enrollmentNo: createdEnrollmentNo }),
    });

    expect([400, 409]).toContain(response.status());

    const body = await response.json();
    expect(body.message || body.error).toBeDefined();
  });

  test('GET /students - should list with pagination', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.get(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      params: {
        page: 1,
        limit: 10,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Handle various response formats
    const data = body.data || body;
    const students = Array.isArray(data) ? data : data;

    // Validate pagination structure if present
    if (body.meta || body.pagination) {
      const pagination = body.meta || body.pagination;
      expect(pagination.total).toBeDefined();
      expect(pagination.page).toBeDefined();
      expect(pagination.limit).toBeDefined();
      expect(pagination.totalPages).toBeDefined();
    }

    // Should return array of students
    expect(Array.isArray(students)).toBe(true);

    // If there are students, validate schema
    if (students.length > 0) {
      const parsed = StudentSchema.safeParse(students[0]);
      if (!parsed.success) {
        console.log('Schema validation errors:', parsed.error.issues);
      }
      expect(parsed.success).toBe(true);
    }
  });

  test('GET /students - should filter by status', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.get(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      params: {
        status: 'active',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const students = Array.isArray(body.data || body) ? (body.data || body) : [];

    // All returned students should have active status
    students.forEach((student: { status: string }) => {
      expect(['active', 'ACTIVE']).toContain(student.status);
    });
  });

  test('GET /students - should search by name', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.get(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      params: {
        search: 'Test Student',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const students = Array.isArray(body.data || body) ? (body.data || body) : [];

    // All returned students should match search
    students.forEach((student: { name: string }) => {
      expect(student.name.toLowerCase()).toContain('test');
    });
  });

  test('GET /students/:id - should get student by id', async ({ request }) => {
    test.skip(!accessToken || !tenantId || !createdStudentId, 'Missing test prerequisites');

    const response = await request.get(`${API_URL}/students/${createdStudentId}`, {
      headers: tenantHeaders(accessToken, tenantId),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const student = body.data || body;

    // Validate against schema
    const parsed = StudentSchema.safeParse(student);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Verify it's the correct student
    expect(student.id).toBe(createdStudentId);
  });

  test('GET /students/:id - should return 404 for non-existent student', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const fakeId = 'non-existent-student-id-12345';
    const response = await request.get(`${API_URL}/students/${fakeId}`, {
      headers: tenantHeaders(accessToken, tenantId),
    });

    expect(response.status()).toBe(404);
  });

  test('PATCH /students/:id - should update student', async ({ request }) => {
    test.skip(!accessToken || !tenantId || !createdStudentId, 'Missing test prerequisites');

    const updatedName = `Updated Student ${Date.now()}`;

    const response = await request.patch(`${API_URL}/students/${createdStudentId}`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: updatedName,
        phone: '1234567890',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const student = body.data || body;

    expect(student.name).toBe(updatedName);
    expect(student.phone).toBe('1234567890');
  });

  test('DELETE /students/:id - should soft delete student', async ({ request }) => {
    test.skip(!accessToken || !tenantId || !createdStudentId, 'Missing test prerequisites');

    const response = await request.delete(`${API_URL}/students/${createdStudentId}`, {
      headers: tenantHeaders(accessToken, tenantId),
    });

    expect([200, 204]).toContain(response.status());

    // Verify student is no longer accessible (or marked as deleted)
    const getResponse = await request.get(`${API_URL}/students/${createdStudentId}`, {
      headers: tenantHeaders(accessToken, tenantId),
    });

    // Should either be 404 or return with deleted/inactive status
    if (getResponse.status() === 200) {
      const body = await getResponse.json();
      const student = body.data || body;
      expect(['deleted', 'inactive', 'DELETED', 'INACTIVE']).toContain(student.status);
    } else {
      expect(getResponse.status()).toBe(404);
    }
  });
});

// =============================================================================
// TENANT ISOLATION TESTS
// =============================================================================

test.describe('CoApp Student API - Tenant Isolation @coapp @api @students @isolation', () => {
  const user1 = createTestUser({ name: 'Student Isolation User 1' });
  const user2 = createTestUser({ name: 'Student Isolation User 2' });

  let user1Token: string;
  let user2Token: string;
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1StudentId: string;

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

    // Create tenant for each user
    if (user1Token) {
      const tenant1Response = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(user1Token),
        data: createTestTenant({ name: 'Isolation Tenant 1' }),
      });
      if (tenant1Response.ok()) {
        const tenant1Body = await tenant1Response.json();
        const tenant = (tenant1Body.data || tenant1Body).tenant || tenant1Body.data || tenant1Body;
        tenant1Id = tenant.id;
      }
    }

    if (user2Token) {
      const tenant2Response = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(user2Token),
        data: createTestTenant({ name: 'Isolation Tenant 2' }),
      });
      if (tenant2Response.ok()) {
        const tenant2Body = await tenant2Response.json();
        const tenant = (tenant2Body.data || tenant2Body).tenant || tenant2Body.data || tenant2Body;
        tenant2Id = tenant.id;
      }
    }

    // Create a student in tenant1
    if (user1Token && tenant1Id) {
      const studentResponse = await request.post(`${API_URL}/students`, {
        headers: tenantHeaders(user1Token, tenant1Id),
        data: testStudent({ name: 'Tenant1 Student' }),
      });
      if (studentResponse.ok()) {
        const studentBody = await studentResponse.json();
        tenant1StudentId = (studentBody.data || studentBody).id;
      }
    }
  });

  test('should not allow access to other tenant\'s students via GET /students', async ({
    request,
  }) => {
    test.skip(!user2Token || !tenant1Id, 'Missing test prerequisites');

    // User2 tries to list students from Tenant1
    const response = await request.get(`${API_URL}/students`, {
      headers: tenantHeaders(user2Token, tenant1Id),
    });

    // Should be forbidden or return empty list (tenant isolation)
    if (response.status() === 200) {
      const body = await response.json();
      const students = Array.isArray(body.data || body) ? (body.data || body) : [];
      // Should not contain tenant1's students
      expect(students.length).toBe(0);
    } else {
      expect([401, 403, 404]).toContain(response.status());
    }
  });

  test('should not allow access to other tenant\'s student via GET /students/:id', async ({
    request,
  }) => {
    test.skip(!user2Token || !tenant2Id || !tenant1StudentId, 'Missing test prerequisites');

    // User2 tries to access Tenant1's student using their own tenant header
    const response = await request.get(`${API_URL}/students/${tenant1StudentId}`, {
      headers: tenantHeaders(user2Token, tenant2Id),
    });

    // Should not find the student (it's in a different tenant)
    expect([403, 404]).toContain(response.status());
  });

  test('should not allow modifying other tenant\'s student via PATCH', async ({ request }) => {
    test.skip(!user2Token || !tenant2Id || !tenant1StudentId, 'Missing test prerequisites');

    // User2 tries to update Tenant1's student
    const response = await request.patch(`${API_URL}/students/${tenant1StudentId}`, {
      headers: tenantHeaders(user2Token, tenant2Id),
      data: {
        name: 'Hacked Name',
      },
    });

    expect([403, 404]).toContain(response.status());
  });

  test('should not allow deleting other tenant\'s student via DELETE', async ({ request }) => {
    test.skip(!user2Token || !tenant2Id || !tenant1StudentId, 'Missing test prerequisites');

    // User2 tries to delete Tenant1's student
    const response = await request.delete(`${API_URL}/students/${tenant1StudentId}`, {
      headers: tenantHeaders(user2Token, tenant2Id),
    });

    expect([403, 404]).toContain(response.status());
  });

  test('each tenant should only see their own students', async ({ request }) => {
    test.skip(!user1Token || !tenant1Id || !user2Token || !tenant2Id, 'Missing test prerequisites');

    // Create a student in tenant2
    await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(user2Token, tenant2Id),
      data: testStudent({ name: 'Tenant2 Student' }),
    });

    // Get students for tenant1
    const tenant1Response = await request.get(`${API_URL}/students`, {
      headers: tenantHeaders(user1Token, tenant1Id),
    });

    expect(tenant1Response.status()).toBe(200);
    const tenant1Body = await tenant1Response.json();
    const tenant1Students = Array.isArray(tenant1Body.data || tenant1Body)
      ? (tenant1Body.data || tenant1Body)
      : [];

    // Get students for tenant2
    const tenant2Response = await request.get(`${API_URL}/students`, {
      headers: tenantHeaders(user2Token, tenant2Id),
    });

    expect(tenant2Response.status()).toBe(200);
    const tenant2Body = await tenant2Response.json();
    const tenant2Students = Array.isArray(tenant2Body.data || tenant2Body)
      ? (tenant2Body.data || tenant2Body)
      : [];

    // Verify tenant1 students all belong to tenant1
    tenant1Students.forEach((student: { tenantId: string }) => {
      expect(student.tenantId).toBe(tenant1Id);
    });

    // Verify tenant2 students all belong to tenant2
    tenant2Students.forEach((student: { tenantId: string }) => {
      expect(student.tenantId).toBe(tenant2Id);
    });

    // Verify no overlap
    const tenant1Ids = new Set(tenant1Students.map((s: { id: string }) => s.id));
    tenant2Students.forEach((student: { id: string }) => {
      expect(tenant1Ids.has(student.id)).toBe(false);
    });
  });
});

// =============================================================================
// INPUT VALIDATION TESTS
// =============================================================================

test.describe('CoApp Student API - Input Validation @coapp @api @students @validation', () => {
  const testUserData = createTestUser({ name: 'Student Validation User' });

  let accessToken: string;
  let tenantId: string;

  test.beforeAll(async ({ request }) => {
    // Register and login user
    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: testUserData,
    });

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

    // Create tenant
    if (accessToken) {
      const tenantResponse = await request.post(`${API_URL}/tenants`, {
        headers: authHeaders(accessToken),
        data: createTestTenant({ name: 'Validation Test Org' }),
      });

      if (tenantResponse.ok()) {
        const tenantBody = await tenantResponse.json();
        const tenant = (tenantBody.data || tenantBody).tenant || tenantBody.data || tenantBody;
        tenantId = tenant.id;
      }
    }
  });

  test('POST /students - should require name', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        guardianName: 'Test Guardian',
        guardianPhone: '9876543210',
        enrollmentNo: `ENR-${Date.now()}`,
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /students - should require guardianName', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: 'Test Student',
        guardianPhone: '9876543210',
        enrollmentNo: `ENR-${Date.now()}`,
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /students - should require guardianPhone', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: 'Test Student',
        guardianName: 'Test Guardian',
        enrollmentNo: `ENR-${Date.now()}`,
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /students - should require enrollmentNo', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: 'Test Student',
        guardianName: 'Test Guardian',
        guardianPhone: '9876543210',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /students - should validate email format', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: 'Test Student',
        email: 'not-an-email', // Invalid email
        guardianName: 'Test Guardian',
        guardianPhone: '9876543210',
        enrollmentNo: `ENR-${Date.now()}`,
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /students - should reject invalid status', async ({ request }) => {
    test.skip(!accessToken || !tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: tenantHeaders(accessToken, tenantId),
      data: {
        name: 'Test Student',
        guardianName: 'Test Guardian',
        guardianPhone: '9876543210',
        enrollmentNo: `ENR-${Date.now()}`,
        status: 'invalid-status', // Invalid status
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /students - should require authentication', async ({ request }) => {
    test.skip(!tenantId, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: testHeaders, // No auth token
      data: testStudent(),
    });

    expect(response.status()).toBe(401);
  });

  test('POST /students - should require tenant header', async ({ request }) => {
    test.skip(!accessToken, 'Missing test prerequisites');

    const response = await request.post(`${API_URL}/students`, {
      headers: authHeaders(accessToken), // No X-Tenant-ID header
      data: testStudent(),
    });

    expect([400, 401, 403]).toContain(response.status());
  });
});
