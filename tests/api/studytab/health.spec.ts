import { test, expect } from '../../../src/fixtures';

test.describe('API Health Checks @studytab @api @health', () => {
  test('should return healthy status', async ({ apiClient, projectConfig }) => {
    const response = await apiClient.request.get(`${projectConfig.apiUrl}/health`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
  });

  test('should respond within acceptable time', async ({ apiClient, projectConfig }) => {
    const start = Date.now();
    await apiClient.request.get(`${projectConfig.apiUrl}/health`);
    const duration = Date.now() - start;

    // Health check should respond within 1 second
    expect(duration).toBeLessThan(1000);
  });
});
