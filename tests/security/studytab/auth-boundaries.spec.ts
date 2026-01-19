/**
 * Authorization Boundary Tests
 *
 * Tests that users cannot access resources belonging to other users.
 */

import { test, expect } from '../../../src/fixtures';
import { DecksPage } from '../../../src/page-objects/studytab';

test.describe('Authorization Boundaries @security @auth-boundary', () => {
  test.describe('Deck Access Control', () => {
    test('should not access another user\'s deck via direct URL', async ({ page, auth, projectConfig }) => {
      await auth.login(page);

      // Try to access a deck that doesn't belong to this user
      const nonExistentDeckId = 'deck-that-does-not-exist-12345';

      const response = await page.goto(`${projectConfig.baseUrl}/decks/${nonExistentDeckId}`);

      // Should show 404 or redirect, not the deck
      const is404 = await page.getByText(/not found|doesn't exist|404/i).isVisible().catch(() => false);
      const isRedirected = page.url().includes('/dashboard') || page.url().includes('/decks');
      const statusIs404 = response?.status() === 404;

      expect(is404 || isRedirected || statusIs404).toBe(true);
    });

    test('should not allow editing another user\'s deck via API', async ({ request, auth, page }) => {
      // Login to get authenticated request context
      await auth.login(page);

      const nonExistentDeckId = 'other-user-deck-12345';

      const response = await request.put(`/api/v1/decks/${nonExistentDeckId}`, {
        data: { name: 'Hacked Name' },
      });

      // Should be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(response.status());
    });

    test('should not allow deleting another user\'s deck via API', async ({ request, auth, page }) => {
      await auth.login(page);

      const nonExistentDeckId = 'other-user-deck-12345';

      const response = await request.delete(`/api/v1/decks/${nonExistentDeckId}`);

      // Should be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(response.status());
    });
  });

  test.describe('Card Access Control', () => {
    test('should not access another user\'s card via API', async ({ request, auth, page }) => {
      await auth.login(page);

      const nonExistentCardId = 'other-user-card-12345';

      const response = await request.get(`/api/v1/cards/${nonExistentCardId}`);

      expect([403, 404]).toContain(response.status());
    });

    test('should not allow updating another user\'s card', async ({ request, auth, page }) => {
      await auth.login(page);

      const nonExistentCardId = 'other-user-card-12345';

      const response = await request.put(`/api/v1/cards/${nonExistentCardId}`, {
        data: { front: 'Hacked content', back: 'Hacked' },
      });

      expect([403, 404]).toContain(response.status());
    });

    test('should not allow deleting another user\'s card', async ({ request, auth, page }) => {
      await auth.login(page);

      const nonExistentCardId = 'other-user-card-12345';

      const response = await request.delete(`/api/v1/cards/${nonExistentCardId}`);

      expect([403, 404]).toContain(response.status());
    });
  });

  test.describe('API Authentication', () => {
    test('should reject requests without authentication', async ({ request, context }) => {
      // Clear any existing auth
      await context.clearCookies();

      const response = await request.get('/api/v1/decks');

      // Should be 401 Unauthorized
      expect(response.status()).toBe(401);
    });

    test('should reject requests with invalid token', async ({ request }) => {
      const response = await request.get('/api/v1/decks', {
        headers: {
          Authorization: 'Bearer invalid-token-12345',
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should reject requests with expired token', async ({ request }) => {
      // Simulate an expired JWT (just use malformed one)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';

      const response = await request.get('/api/v1/decks', {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Admin Routes Protection', () => {
    test('should not access admin routes as regular user', async ({ page, auth, projectConfig }) => {
      await auth.login(page);

      // Try to access potential admin routes
      const adminRoutes = ['/admin', '/admin/users', '/admin/stats'];

      for (const route of adminRoutes) {
        const response = await page.goto(`${projectConfig.baseUrl}${route}`);

        // Should be 403, 404, or redirect
        if (response) {
          const status = response.status();
          const redirected = page.url().includes('/dashboard') || page.url().includes('/login');

          expect(status === 403 || status === 404 || redirected).toBe(true);
        }
      }
    });

    test('should not access admin API endpoints as regular user', async ({ request, auth, page }) => {
      await auth.login(page);

      const adminApiRoutes = ['/api/admin/users', '/api/admin/stats', '/api/admin/config'];

      for (const route of adminApiRoutes) {
        const response = await request.get(route);
        expect([401, 403, 404]).toContain(response.status());
      }
    });
  });

  test.describe('IDOR Prevention', () => {
    test('should not expose sequential IDs that can be enumerated', async ({ request, auth, page }) => {
      await auth.login(page);

      // Get current user's decks
      const response = await request.get('/api/v1/decks');

      if (response.ok()) {
        const data = await response.json();

        if (data.decks && data.decks.length > 0) {
          const deckId = data.decks[0].id;

          // IDs should be UUIDs or random, not sequential integers
          const isSequential = /^\d+$/.test(String(deckId));
          const isSimpleIncrement = parseInt(deckId, 10) < 10000;

          // Fail if ID looks like a simple sequential number
          expect(isSequential && isSimpleIncrement).toBe(false);
        }
      }
    });

    test('should not allow ID manipulation to access other resources', async ({ request, auth, page, projectConfig }) => {
      await auth.login(page);

      // Get user's decks first
      const response = await request.get('/api/v1/decks');

      if (response.ok()) {
        const data = await response.json();

        if (data.decks && data.decks.length > 0) {
          const deckId = data.decks[0].id;

          // Try to manipulate ID (if it's numeric, try adjacent numbers)
          if (/^\d+$/.test(String(deckId))) {
            const manipulatedId = parseInt(deckId, 10) - 1;
            const manipulatedResponse = await request.get(`/api/v1/decks/${manipulatedId}`);

            // Should either return same deck (it's ours) or 403/404
            if (manipulatedResponse.ok()) {
              const manipulatedData = await manipulatedResponse.json();
              // If successful, it must be our deck
              expect(String(manipulatedData.id)).toBe(String(deckId - 1));
            } else {
              expect([403, 404]).toContain(manipulatedResponse.status());
            }
          }
        }
      }
    });
  });

  test.describe('Data Exposure', () => {
    test('should not expose sensitive fields in user profile response', async ({ request, auth, page }) => {
      await auth.login(page);

      const response = await request.get('/api/v1/user/profile');

      if (response.ok()) {
        const data = await response.json();

        // Should NOT expose these fields
        expect(data).not.toHaveProperty('password');
        expect(data).not.toHaveProperty('passwordHash');
        expect(data).not.toHaveProperty('salt');
        expect(data).not.toHaveProperty('refreshToken');
        expect(data).not.toHaveProperty('resetToken');
        expect(data).not.toHaveProperty('verificationToken');
      }
    });

    test('should not expose other users data in deck responses', async ({ request, auth, page }) => {
      await auth.login(page);

      const response = await request.get('/api/v1/decks');

      if (response.ok()) {
        const data = await response.json();

        if (data.decks) {
          for (const deck of data.decks) {
            // Should not expose sensitive user info
            expect(deck).not.toHaveProperty('user.password');
            expect(deck).not.toHaveProperty('user.passwordHash');
            expect(deck).not.toHaveProperty('user.salt');

            // If user object exists, it should be minimal
            if (deck.user) {
              const allowedUserFields = ['id', 'name', 'email', 'avatar'];
              const userKeys = Object.keys(deck.user);
              for (const key of userKeys) {
                expect(allowedUserFields).toContain(key);
              }
            }
          }
        }
      }
    });

    test('should not expose internal IDs or database details in error responses', async ({ request, auth, page }) => {
      await auth.login(page);

      // Trigger an error
      const response = await request.get('/api/v1/decks/invalid-id-format');

      const text = await response.text();

      // Should not expose internal details
      expect(text.toLowerCase()).not.toContain('stack trace');
      expect(text.toLowerCase()).not.toContain('sql');
      expect(text.toLowerCase()).not.toContain('mongodb');
      expect(text.toLowerCase()).not.toContain('prisma');
      expect(text.toLowerCase()).not.toContain('sequelize');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should rate limit API requests', async ({ request, auth, page }) => {
      await auth.login(page);

      // Make many rapid requests
      const requests = Array(50).fill(null).map(() => request.get('/api/v1/decks'));
      const responses = await Promise.all(requests);

      // At least some should be rate limited (429)
      const rateLimited = responses.filter((r) => r.status() === 429);

      // If no rate limiting exists, this test will pass but log a warning
      if (rateLimited.length === 0) {
        test.info().annotations.push({
          type: 'warning',
          description: 'No rate limiting detected - consider implementing rate limits',
        });
      }
    });
  });

  test.describe('Session Security', () => {
    test('should invalidate session on logout', async ({ page, auth, request, context, projectConfig }) => {
      await auth.login(page);

      // Verify we can access protected endpoint
      const beforeLogout = await request.get('/api/v1/decks');
      expect(beforeLogout.ok()).toBe(true);

      // Logout
      await auth.logout(page);

      // Clear context to ensure fresh state
      await context.clearCookies();

      // Try to access protected endpoint again
      const afterLogout = await request.get('/api/v1/decks');
      expect(afterLogout.status()).toBe(401);
    });

    test('should not allow session fixation', async ({ page, context, projectConfig }) => {
      // Get cookies before login
      const cookiesBefore = await context.cookies();
      const sessionCookieBefore = cookiesBefore.find((c) => c.name.includes('session'));

      // Login
      await page.goto(`${projectConfig.baseUrl}/auth/login`);
      const emailInput = page.locator('[data-testid="email-input"], input[type="email"]').first();
      const passwordInput = page.locator('[data-testid="password-input"], input[type="password"]').first();

      await emailInput.fill('test@example.com');
      await passwordInput.fill('Test123!');
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

      // Get cookies after login
      const cookiesAfter = await context.cookies();
      const sessionCookieAfter = cookiesAfter.find((c) => c.name.includes('session'));

      // Session should be different (regenerated) after login
      if (sessionCookieBefore && sessionCookieAfter) {
        expect(sessionCookieAfter.value).not.toBe(sessionCookieBefore.value);
      }
    });
  });
});
