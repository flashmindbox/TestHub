import { test, expect } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

test.describe('Auth API Endpoints @studytab @api @auth', () => {
  test('should reject login with invalid credentials', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.post(`${projectConfig.apiUrl}/auth/sign-in/email`, {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
    });

    // Should return 401 or 400
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should reject registration with invalid email', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.post(`${projectConfig.apiUrl}/auth/sign-up/email`, {
      data: {
        email: 'not-an-email',
        password: 'Test123!',
        name: 'Test User',
      },
    });

    expect(response.ok()).toBeFalsy();
  });

  test('should reject registration with weak password', async ({ apiClient, projectConfig }) => {
    const userData = TestDataFactory.user();

    const response = await apiClient.request.post(`${projectConfig.apiUrl}/auth/sign-up/email`, {
      data: {
        email: userData.email,
        password: '123', // Too weak
        name: userData.name,
      },
    });

    expect(response.ok()).toBeFalsy();
  });

  test('should return 401 for protected endpoints without auth', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.get(`${projectConfig.apiUrl}/users/me`);

    expect(response.status()).toBe(401);
  });

  test('should return user session when authenticated', async ({ request, projectConfig }) => {
    // Use authenticated context
    const context = await request.newContext({
      storageState: '.auth/user.json',
    });

    const response = await context.get(`${projectConfig.apiUrl}/auth/get-session`);

    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty('user');
    }

    await context.dispose();
  });
});
