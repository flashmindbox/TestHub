import { test, expect } from '../../../src/fixtures';

test.describe('Onboarding API @studytab @api @onboarding', () => {
  test.use({ storageState: '.auth/user.json' });

  test('GET /users/me should include onboardingCompleted in profile', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.get(`${projectConfig.apiUrl}/api/v1/users/me`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('data');

    const profile = body.data.profile ?? body.data;
    expect(typeof profile.onboardingCompleted).toBe('boolean');
    expect(profile).toHaveProperty('studyGoal');
    // studyGoal should be null or a string
    expect(profile.studyGoal === null || typeof profile.studyGoal === 'string').toBeTruthy();
  });

  test('PATCH /users/me/onboarding should mark onboarding complete', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.patch(
      `${projectConfig.apiUrl}/api/v1/users/me/onboarding`,
      {
        data: { studyGoal: 'JEE/NEET', completed: true },
      },
    );

    expect(response.status()).toBe(200);

    // Verify by fetching profile again
    const meResponse = await apiClient.request.get(`${projectConfig.apiUrl}/api/v1/users/me`);
    expect(meResponse.ok()).toBeTruthy();

    const meBody = await meResponse.json();
    const profile = meBody.data.profile ?? meBody.data;

    expect(profile.onboardingCompleted).toBe(true);
    expect(profile.studyGoal).toBe('JEE/NEET');
    expect(profile.onboardingCompletedAt).not.toBeNull();
  });

  test('PATCH /users/me/onboarding should reject invalid study goal', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.patch(
      `${projectConfig.apiUrl}/api/v1/users/me/onboarding`,
      {
        data: { studyGoal: 'invalid-goal' },
      },
    );

    // Expect 400 or 422 for invalid input
    expect([400, 422]).toContain(response.status());
  });
});
