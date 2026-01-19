import { test as base } from '@playwright/test';
import { createApiClient, ApiClient } from '../utils/api-client';
import { getProjectEnv } from '../../config/projects';

export const apiFixture = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    const env = process.env.ENV || 'local';
    const project = getProjectEnv('studytab', env);

    const client = createApiClient(request, {
      baseUrl: project.apiUrl,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    });

    await use(client);
  },
});
