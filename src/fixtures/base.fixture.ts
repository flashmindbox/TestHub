import { mergeTests } from '@playwright/test';
import { authFixture } from './auth.fixture';
import { apiFixture } from './api.fixture';
import { cleanupFixture } from './cleanup.fixture';
import { getProjectEnv } from '../../config/projects';
import { ProjectConfig } from '../types';

// Merge all fixtures
export const test = mergeTests(
  authFixture,
  apiFixture,
  cleanupFixture
).extend<{
  projectConfig: ProjectConfig & { currentEnv: string; baseUrl: string; apiUrl: string; readOnly: boolean };
}>({
  projectConfig: async ({}, use) => {
    const env = process.env.ENV || 'local';
    const config = getProjectEnv('studytab', env);
    await use(config);
  },
});

export { expect } from '@playwright/test';

// Re-export types for convenience
export type { Page, BrowserContext, APIRequestContext } from '@playwright/test';
