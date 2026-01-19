import { test as base } from '@playwright/test';
import { createCleanupTracker } from '../utils/cleanup-tracker';
import { CleanupTracker } from '../types';

export const cleanupFixture = base.extend<{
  cleanup: CleanupTracker;
}>({
  cleanup: async ({ page, request }, use) => {
    const tracker = createCleanupTracker();

    // Provide the tracker to the test
    await use(tracker);

    // After test completes, cleanup all tracked resources
    await tracker.cleanup(page, request);
  },
});
