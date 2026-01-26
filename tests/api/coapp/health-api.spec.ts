/**
 * CoApp Health API Tests
 *
 * Tests for health check endpoint against a running CoApp API.
 * Validates service health including database and Redis connectivity.
 *
 * Run with: npx playwright test tests/api/coapp/health-api.spec.ts --project=coapp-api
 *
 * @tags @coapp @api @health
 */

import { test, expect } from '@playwright/test';
import { HealthCheckSchema } from '../../../src/contracts/coapp';
import { API_URL, testHeaders } from './helpers';

test.describe('CoApp Health API @coapp @api @health', () => {
  test('GET /health - should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Response may be wrapped in data/meta structure
    const healthData = body.data || body;

    // Validate against schema
    const parsed = HealthCheckSchema.safeParse(healthData);
    if (!parsed.success) {
      console.log('Schema validation errors:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    // Status should be 'ok' or 'up'
    expect(['ok', 'up', 'healthy']).toContain(healthData.status);
  });

  test('GET /health - should include database health info', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });
    const body = await response.json();
    const healthData = body.data || body;

    // Check for database health in info or details
    const hasDbInfo =
      healthData.info?.database ||
      healthData.details?.database ||
      healthData.info?.db ||
      healthData.details?.db ||
      healthData.info?.prisma ||
      healthData.details?.prisma;

    // If service reports component health, verify database is included
    if (healthData.info || healthData.details) {
      expect(hasDbInfo).toBeTruthy();

      const dbStatus =
        healthData.info?.database?.status ||
        healthData.details?.database?.status ||
        healthData.info?.db?.status ||
        healthData.details?.db?.status ||
        healthData.info?.prisma?.status ||
        healthData.details?.prisma?.status;

      if (dbStatus) {
        expect(['up', 'ok', 'healthy']).toContain(dbStatus);
      }
    }
  });

  test('GET /health - should include Redis health info', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });
    const body = await response.json();
    const healthData = body.data || body;

    // Check for Redis health in info or details
    const hasRedisInfo =
      healthData.info?.redis ||
      healthData.details?.redis ||
      healthData.info?.cache ||
      healthData.details?.cache;

    // If service reports component health, verify Redis is included
    if (healthData.info || healthData.details) {
      expect(hasRedisInfo).toBeTruthy();

      const redisStatus =
        healthData.info?.redis?.status ||
        healthData.details?.redis?.status ||
        healthData.info?.cache?.status ||
        healthData.details?.cache?.status;

      if (redisStatus) {
        expect(['up', 'ok', 'healthy']).toContain(redisStatus);
      }
    }
  });

  test('GET /health - should respond within acceptable time', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });
    const duration = Date.now() - start;

    expect(response.ok()).toBeTruthy();

    // Health check should respond within 2 seconds
    // (allows time for DB/Redis ping)
    expect(duration).toBeLessThan(2000);
  });

  test('GET /health - should not require authentication', async ({ request }) => {
    // Health endpoints should be public (no auth header)
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });

    // Should not return 401/403
    expect(response.status()).not.toBe(401);
    expect(response.status()).not.toBe(403);
    expect(response.ok()).toBeTruthy();
  });

  test('GET /health - should return proper content type', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('GET /health - error details should be null when healthy', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: testHeaders,
    });
    const body = await response.json();
    const healthData = body.data || body;

    // When healthy, error should be null/undefined or empty
    if (healthData.status === 'ok' || healthData.status === 'up') {
      expect(
        healthData.error === null ||
          healthData.error === undefined ||
          Object.keys(healthData.error || {}).length === 0
      ).toBeTruthy();
    }
  });
});

test.describe('CoApp Health API - Liveness & Readiness @coapp @api @health @probes', () => {
  test('GET /health/live - should return liveness status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/live`, {
      headers: testHeaders,
    });

    // Skip if endpoint doesn't exist (404)
    if (response.status() === 404) {
      test.skip(true, 'Liveness endpoint not implemented');
      return;
    }

    // Liveness should always return 200 if process is running
    expect(response.status()).toBe(200);

    const body = await response.json();
    const healthData = body.data || body;
    expect(['ok', 'up', 'healthy']).toContain(healthData.status);
  });

  test('GET /health/ready - should return readiness status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/ready`, {
      headers: testHeaders,
    });

    // Skip if endpoint doesn't exist (404)
    if (response.status() === 404) {
      test.skip(true, 'Readiness endpoint not implemented');
      return;
    }

    // Readiness indicates if service can accept traffic
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const healthData = body.data || body;
    expect(['ok', 'up', 'ready', 'healthy']).toContain(healthData.status);
  });

  test('liveness probe should respond faster than full health check', async ({ request }) => {
    // First check if liveness endpoint exists
    const checkResponse = await request.get(`${API_URL}/health/live`, {
      headers: testHeaders,
    });
    if (checkResponse.status() === 404) {
      test.skip(true, 'Liveness endpoint not implemented');
      return;
    }

    // Measure full health check
    const fullStart = Date.now();
    await request.get(`${API_URL}/health`, { headers: testHeaders });
    const fullDuration = Date.now() - fullStart;

    // Measure liveness probe
    const liveStart = Date.now();
    await request.get(`${API_URL}/health/live`, { headers: testHeaders });
    const liveDuration = Date.now() - liveStart;

    // Liveness should be faster (or at least not significantly slower)
    // Allow 50ms variance for network
    expect(liveDuration).toBeLessThan(fullDuration + 50);
  });
});

test.describe('CoApp Health API - Resilience @coapp @api @health @resilience', () => {
  test('health endpoint should handle concurrent requests', async ({ request }) => {
    // Send 10 concurrent health checks
    const requests = Array(10)
      .fill(null)
      .map(() => request.get(`${API_URL}/health`, { headers: testHeaders }));

    const responses = await Promise.all(requests);

    // All should succeed
    for (const response of responses) {
      expect(response.ok()).toBeTruthy();
    }
  });

  test('health endpoint should be consistent', async ({ request }) => {
    // Make multiple requests and verify consistency
    const results: string[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await request.get(`${API_URL}/health`, {
        headers: testHeaders,
      });
      const body = await response.json();
      const healthData = body.data || body;
      results.push(healthData.status);
    }

    // All results should be the same
    expect(new Set(results).size).toBe(1);
    expect(['ok', 'up', 'healthy']).toContain(results[0]);
  });
});
