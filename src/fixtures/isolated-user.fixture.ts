/**
 * Isolated User Fixture
 *
 * Provides each test worker with a unique test user,
 * preventing cross-test contamination in parallel execution.
 */

import { test as base, type Page } from '@playwright/test';
import { getUserPool, type PoolUser } from '../utils/user-pool';
import { LoginPage } from '../page-objects/studytab';
import { getProjectEnv } from '../../config/projects';

export interface IsolatedUserFixtures {
  isolatedUser: PoolUser;
  isolatedAuthPage: Page;
}

export const test = base.extend<IsolatedUserFixtures>({
  isolatedUser: async ({}, use, testInfo) => {
    const pool = getUserPool();
    const workerId = testInfo.parallelIndex;

    const user = pool.acquire(workerId);
    if (!user) {
      throw new Error(`No available users in pool for worker ${workerId}`);
    }

    await use(user);

    pool.release(user.id);
  },

  isolatedAuthPage: async ({ page, isolatedUser }, use) => {
    // Get base URL from project config
    const env = process.env.ENV || 'local';
    const config = getProjectEnv('studytab', env);

    // Login with the isolated user
    const loginPage = new LoginPage(page, config.baseUrl);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(isolatedUser.email, isolatedUser.password);

    await use(page);

    // Page cleanup handled by Playwright
  },
});

export { expect } from '@playwright/test';

export type { PoolUser };
