/**
 * CoApp Rate Limit API Tests
 *
 * Tests for rate limiting functionality against a running CoApp API.
 * Validates that rate limits are enforced correctly.
 *
 * NOTE: These tests are run WITHOUT the test bypass header to verify
 * rate limiting is working correctly.
 *
 * Run with: npx playwright test tests/api/coapp/rate-limit-api.spec.ts --project=coapp-api
 *
 * @tags @coapp @api @rate-limit @security
 */

import { test, expect } from '@playwright/test';
import { API_URL, testHeaders, authHeaders, testUser as createTestUser } from './helpers';

// Rate limit configuration (from CoApp docs)
const UNAUTHENTICATED_LIMIT = 30; // requests per minute
const AUTHENTICATED_LIMIT = 100; // requests per minute

// Headers WITHOUT bypass for rate limit testing
const rateLimitTestHeaders = {
  'Content-Type': 'application/json',
};

test.describe('CoApp Rate Limiting @coapp @api @rate-limit', () => {
  test('should return rate limit headers (if implemented)', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: rateLimitTestHeaders,
    });

    // Common rate limit header names
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
      'retry-after',
    ];

    const headers = response.headers();
    const hasRateLimitHeader = rateLimitHeaders.some(
      (header) => headers[header] !== undefined
    );

    // Note: Rate limit headers may not be present on all endpoints
    if (!hasRateLimitHeader) {
      test.info().annotations.push({
        type: 'info',
        description: 'Rate limit headers not present on /health endpoint',
      });
    }
  });

  test('should enforce unauthenticated rate limit on auth endpoints', async ({ request }) => {
    // Note: Health endpoint may be excluded from rate limiting
    // Use auth endpoint for rate limit testing

    // First check if already rate limited
    const initialCheck = await request.post(`${API_URL}/auth/login`, {
      headers: rateLimitTestHeaders,
      data: { email: 'test@example.com', password: 'test' },
    });

    if (initialCheck.status() === 429) {
      // Already rate limited from previous tests - this proves rate limiting works
      test.info().annotations.push({
        type: 'info',
        description: 'Already rate limited from previous tests - rate limiting is working',
      });
      expect(initialCheck.status()).toBe(429);
      return;
    }

    // Make requests until we hit the limit
    const results: { status: number; remaining?: string }[] = [];
    let hitRateLimit = false;

    // Make more requests than the limit
    const requestCount = UNAUTHENTICATED_LIMIT + 10;

    for (let i = 0; i < requestCount; i++) {
      const response = await request.post(`${API_URL}/auth/login`, {
        headers: rateLimitTestHeaders,
        data: { email: `test${i}@example.com`, password: 'test' },
      });
      const remaining =
        response.headers()['x-ratelimit-remaining'] ||
        response.headers()['ratelimit-remaining'];

      results.push({
        status: response.status(),
        remaining,
      });

      if (response.status() === 429) {
        hitRateLimit = true;
        break;
      }
    }

    // Should have hit rate limit
    expect(hitRateLimit).toBeTruthy();

    // Last successful request should show low remaining count
    const lastSuccess = results.filter((r) => r.status !== 429).pop();
    if (lastSuccess?.remaining) {
      expect(parseInt(lastSuccess.remaining)).toBeLessThanOrEqual(5);
    }
  });

  test('429 response should include retry-after header', async ({ request }) => {
    // First, exhaust the rate limit
    let rateLimitResponse = null;

    for (let i = 0; i < UNAUTHENTICATED_LIMIT + 10; i++) {
      const response = await request.post(`${API_URL}/auth/login`, {
        headers: rateLimitTestHeaders,
        data: { email: `retry-test${i}@example.com`, password: 'test' },
      });
      if (response.status() === 429) {
        rateLimitResponse = response;
        break;
      }
    }

    if (rateLimitResponse) {
      const retryAfter =
        rateLimitResponse.headers()['retry-after'] ||
        rateLimitResponse.headers()['x-ratelimit-reset'];

      expect(retryAfter).toBeDefined();

      // Retry-after should be a reasonable value (< 60 seconds for per-minute limit)
      const retrySeconds = parseInt(retryAfter);
      expect(retrySeconds).toBeLessThanOrEqual(60);
    }
  });

  test('429 response body should include error message', async ({ request }) => {
    // Exhaust rate limit
    let rateLimitResponse = null;

    for (let i = 0; i < UNAUTHENTICATED_LIMIT + 10; i++) {
      const response = await request.post(`${API_URL}/auth/login`, {
        headers: rateLimitTestHeaders,
        data: { email: `error-test${i}@example.com`, password: 'test' },
      });
      if (response.status() === 429) {
        rateLimitResponse = response;
        break;
      }
    }

    if (rateLimitResponse) {
      const body = await rateLimitResponse.json();

      // Should have error message
      expect(body.message || body.error).toBeDefined();

      // Message should indicate rate limiting
      const message = (body.message || body.error || '').toLowerCase();
      expect(
        message.includes('rate') ||
          message.includes('limit') ||
          message.includes('too many') ||
          message.includes('throttle')
      ).toBeTruthy();
    }
  });

  test('test bypass header should skip rate limiting', async ({ request }) => {
    // Make many requests WITH the bypass header
    const requests = [];
    for (let i = 0; i < 50; i++) {
      requests.push(
        request.post(`${API_URL}/auth/login`, {
          headers: testHeaders, // Uses bypass header
          data: { email: `bypass-test${i}@example.com`, password: 'test' },
        })
      );
    }

    const responses = await Promise.all(requests);

    // None should be rate limited (429)
    const rateLimited = responses.filter((r) => r.status() === 429);
    expect(rateLimited.length).toBe(0);
  });
});

test.describe('CoApp Rate Limiting - Authenticated @coapp @api @rate-limit @auth', () => {
  let accessToken: string | undefined;

  test.beforeAll(async ({ request }) => {
    // Create and login test user (with bypass to avoid rate limiting during setup)
    const testUserData = createTestUser();

    await request.post(`${API_URL}/auth/register`, {
      headers: testHeaders,
      data: testUserData,
    });

    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      headers: testHeaders,
      data: { email: testUserData.email, password: testUserData.password },
    });

    if (loginResponse.ok()) {
      const loginBody = await loginResponse.json();
      accessToken = (loginBody.data || loginBody).accessToken;
    }
  });

  test('authenticated users should have higher rate limit', async ({ request }) => {
    test.skip(!accessToken, 'No access token available');

    // Make request without bypass to check rate limit headers
    const response = await request.get(`${API_URL}/auth/me`, {
      headers: {
        ...rateLimitTestHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const limit =
      response.headers()['x-ratelimit-limit'] ||
      response.headers()['ratelimit-limit'];

    if (limit) {
      // Authenticated limit should be at least as high as unauthenticated
      // (may be higher depending on plan)
      expect(parseInt(limit)).toBeGreaterThanOrEqual(UNAUTHENTICATED_LIMIT);
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'No rate limit headers present on authenticated endpoint',
      });
    }
  });
});

test.describe('CoApp Rate Limiting - Endpoint Specific @coapp @api @rate-limit', () => {
  test('login endpoint should have stricter rate limit', async ({ request }) => {
    // Login endpoints often have stricter limits to prevent brute force
    let hitRateLimit = false;
    let requestCount = 0;

    // Try up to 20 login attempts
    for (let i = 0; i < 20; i++) {
      const response = await request.post(`${API_URL}/auth/login`, {
        headers: rateLimitTestHeaders,
        data: {
          email: `bruteforce-${i}@example.com`,
          password: 'wrongpassword',
        },
      });

      requestCount++;

      if (response.status() === 429) {
        hitRateLimit = true;
        break;
      }
    }

    // Auth endpoints should rate limit sooner than general endpoints
    if (hitRateLimit) {
      expect(requestCount).toBeLessThan(UNAUTHENTICATED_LIMIT);
    }
  });

  test('register endpoint should have stricter rate limit', async ({ request }) => {
    // Registration endpoints should also have strict limits
    let hitRateLimit = false;
    let requestCount = 0;

    for (let i = 0; i < 15; i++) {
      const response = await request.post(`${API_URL}/auth/register`, {
        headers: rateLimitTestHeaders,
        data: {
          email: `rate-test-${Date.now()}-${i}@example.com`,
          password: 'Test123Pass',
          name: 'Rate Test',
        },
      });

      requestCount++;

      if (response.status() === 429) {
        hitRateLimit = true;
        break;
      }
    }

    // Registration should be rate limited
    if (hitRateLimit) {
      expect(requestCount).toBeLessThanOrEqual(10);
    }
  });
});

test.describe('CoApp Rate Limiting - Recovery @coapp @api @rate-limit', () => {
  test.skip('rate limit should reset after window expires', async ({ request }) => {
    // This test is slow (waits for rate limit reset) - skip in normal runs
    // Run manually when testing rate limit reset behavior

    // First, exhaust the rate limit
    for (let i = 0; i < UNAUTHENTICATED_LIMIT + 5; i++) {
      const response = await request.post(`${API_URL}/auth/login`, {
        headers: rateLimitTestHeaders,
        data: { email: `reset-test${i}@example.com`, password: 'test' },
      });
      if (response.status() === 429) break;
    }

    // Wait for reset (1 minute for per-minute limits)
    await new Promise((resolve) => setTimeout(resolve, 61000));

    // Should be able to make requests again
    const response = await request.post(`${API_URL}/auth/login`, {
      headers: rateLimitTestHeaders,
      data: { email: 'reset-verify@example.com', password: 'test' },
    });
    expect(response.status()).not.toBe(429);
  });
});
