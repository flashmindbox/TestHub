/**
 * CoApp API Test Helpers
 *
 * Common utilities for CoApp API tests including authentication
 * headers and rate limit bypass configuration.
 *
 * @module tests/api/coapp/helpers
 */

/** CoApp API base URL */
export const API_URL = process.env.COAPP_API_URL || 'http://localhost:4001';

/** Test bypass key for skipping rate limiting */
export const TEST_BYPASS_KEY =
  process.env.COAPP_TEST_BYPASS_KEY || 'coapp-test-bypass-key-2026';

/**
 * Base headers for all test requests
 * Includes rate limit bypass header
 */
export const testHeaders: Record<string, string> = {
  'x-test-bypass': TEST_BYPASS_KEY,
  'Content-Type': 'application/json',
};

/**
 * Headers for authenticated requests
 * @param token - JWT access token
 */
export const authHeaders = (token: string): Record<string, string> => ({
  ...testHeaders,
  Authorization: `Bearer ${token}`,
});

/**
 * Headers for tenant-scoped requests
 * @param token - JWT access token
 * @param tenantId - Tenant ID for the X-Tenant-ID header
 */
export const tenantHeaders = (
  token: string,
  tenantId: string
): Record<string, string> => ({
  ...testHeaders,
  Authorization: `Bearer ${token}`,
  'X-Tenant-ID': tenantId,
});

/**
 * Headers for tenant-scoped requests using slug
 * @param token - JWT access token
 * @param tenantSlug - Tenant slug for the X-Tenant-Slug header
 */
export const tenantSlugHeaders = (
  token: string,
  tenantSlug: string
): Record<string, string> => ({
  ...testHeaders,
  Authorization: `Bearer ${token}`,
  'X-Tenant-Slug': tenantSlug,
});

/**
 * Generate a unique email for test user registration
 * @param prefix - Optional prefix for the email
 */
export const uniqueEmail = (prefix = 'test'): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

/**
 * Generate unique test user data
 * @param overrides - Optional overrides for user fields
 */
export const testUser = (
  overrides?: Partial<{ email: string; password: string; name: string }>
) => ({
  email: overrides?.email || uniqueEmail(),
  password: overrides?.password || 'Test123Pass',
  name: overrides?.name || 'API Test User',
});

/**
 * Generate unique tenant data
 * @param overrides - Optional overrides for tenant fields
 */
export const testTenant = (
  overrides?: Partial<{ name: string; slug: string }>
) => ({
  name: overrides?.name || `Test Org ${Date.now()}`,
  slug: overrides?.slug || `test-org-${Date.now()}`,
});
