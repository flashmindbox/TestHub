/**
 * CoApp Auth API Tests
 *
 * Tests for authentication endpoints against a running CoApp API.
 * These tests validate the auth contract and behavior.
 *
 * Run with: npx playwright test tests/api/coapp/auth-api.spec.ts --project=coapp-api
 *
 * @tags @coapp @api @auth
 */

import { test, expect } from '@playwright/test';
import {
  RegisterResponseSchema,
  LoginResponseSchema,
  MeResponseSchema,
} from '../../../src/contracts/coapp';
import {
  API_URL,
  testHeaders,
  authHeaders,
  testUser as createTestUser,
} from './helpers';

test.describe('CoApp Auth API @coapp @api @auth', () => {
  // Generate unique test user for this test run
  const testUserData = createTestUser();

  // Store token across tests in this describe block
  let accessToken: string;
  let userId: string;

  test.describe.configure({ mode: 'serial' });

  test('POST /auth/register - should create new user', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: testUserData,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Validate response has data wrapper (or direct response)
    const responseData = body.data || body;

    // Validate against schema
    const parsed = RegisterResponseSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Verify user data
    expect(responseData.user.email).toBe(testUserData.email.toLowerCase());
    expect(responseData.user.name).toBe(testUserData.name);

    // Password should never be returned
    expect(responseData.user.password).toBeUndefined();
    expect(responseData.user.passwordHash).toBeUndefined();

    // Store user ID for later tests
    userId = responseData.user.id;
  });

  test('POST /auth/register - should reject duplicate email', async ({ request }) => {
    // Skip if registration failed (no user was created)
    test.skip(!userId, 'Previous registration failed - no user to duplicate');

    const response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: testUserData, // Same user as before
    });

    // Should be 400 or 409 (Conflict)
    expect([400, 409]).toContain(response.status());

    const body = await response.json();
    expect(body.message || body.error).toBeDefined();
  });

  test('POST /auth/register - should reject invalid email', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: {
        email: 'not-an-email',
        password: 'Test123Pass',
        name: 'Test User',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /auth/register - should reject weak password', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: {
        email: `weak-pass-${Date.now()}@example.com`,
        password: '123', // Too weak
        name: 'Test User',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('POST /auth/login - should return token for valid credentials', async ({ request }) => {
    test.skip(!userId, 'No user registered to login');

    const response = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: {
        email: testUserData.email,
        password: testUserData.password,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate response has data wrapper (or direct response)
    const responseData = body.data || body;

    // Validate against schema
    const parsed = LoginResponseSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Verify token is returned
    expect(responseData.accessToken).toBeDefined();
    expect(typeof responseData.accessToken).toBe('string');
    expect(responseData.accessToken.length).toBeGreaterThan(0);

    // Verify user data is returned
    expect(responseData.user).toBeDefined();
    expect(responseData.user.email).toBe(testUserData.email.toLowerCase());

    // Store token for subsequent tests
    accessToken = responseData.accessToken;
  });

  test('POST /auth/login - should reject invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: {
        email: testUserData.email,
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.message || body.error).toBeDefined();
  });

  test('POST /auth/login - should reject non-existent user', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: {
        email: 'nonexistent@example.com',
        password: 'anypassword',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /auth/me - should return current user when authenticated', async ({ request }) => {
    // Skip if we don't have a token from login test
    test.skip(!accessToken, 'No access token available');

    const response = await request.get(`${API_URL}/auth/me`, {
      headers: authHeaders(accessToken),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate response has data wrapper (or direct response)
    const responseData = body.data || body;

    // Validate against schema
    const parsed = MeResponseSchema.safeParse(responseData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Verify user matches
    expect(responseData.email).toBe(testUserData.email.toLowerCase());
    expect(responseData.id).toBe(userId);
  });

  test('GET /auth/me - should reject without token', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`, {
      headers: testHeaders,
    });

    expect(response.status()).toBe(401);
  });

  test('GET /auth/me - should reject invalid token', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`, {
      headers: {
        ...testHeaders,
        Authorization: 'Bearer invalid-token-here',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /auth/me - should reject expired/malformed JWT', async ({ request }) => {
    // Malformed JWT (invalid signature)
    const malformedJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature';

    const response = await request.get(`${API_URL}/auth/me`, {
      headers: {
        ...testHeaders,
        Authorization: `Bearer ${malformedJwt}`,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('POST /auth/logout - should invalidate session', async ({ request }) => {
    // Skip if we don't have a token
    test.skip(!accessToken, 'No access token available');

    const response = await request.post(`${API_URL}/auth/logout`, {
      headers: authHeaders(accessToken),
    });

    // Logout should succeed
    expect([200, 204]).toContain(response.status());
  });
});

test.describe('CoApp Auth API - Input Validation @coapp @api @auth @validation', () => {
  test('POST /auth/register - should require all fields', async ({ request }) => {
    // Missing email
    let response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: { password: 'Test123Pass', name: 'Test' },
    });
    expect(response.ok()).toBeFalsy();

    // Missing password
    response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: { email: 'test@example.com', name: 'Test' },
    });
    expect(response.ok()).toBeFalsy();

    // Missing name
    response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: { email: 'test@example.com', password: 'Test123Pass' },
    });
    expect(response.ok()).toBeFalsy();
  });

  test('POST /auth/login - should require email and password', async ({ request }) => {
    // Missing email
    let response = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { password: 'Test123Pass' },
    });
    expect(response.ok()).toBeFalsy();

    // Missing password
    response = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { email: 'test@example.com' },
    });
    expect(response.ok()).toBeFalsy();

    // Empty body
    response = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: {},
    });
    expect(response.ok()).toBeFalsy();
  });

  test('POST /auth/register - should sanitize email (lowercase, trim)', async ({ request }) => {
    const uniqueEmail = `sanitize-test-${Date.now()}@example.com`;

    const response = await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: {
        email: `  ${uniqueEmail.toUpperCase()}  `, // Uppercase with whitespace
        password: 'Test123Pass',
        name: 'Sanitize Test',
      },
    });

    if (response.status() === 201) {
      const body = await response.json();
      const responseData = body.data || body;
      expect(responseData.user.email).toBe(uniqueEmail.toLowerCase());
    }
  });
});
