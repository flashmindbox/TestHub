import { Page, APIRequestContext } from '@playwright/test';
import { CreatedResource, CleanupTracker, FailedCleanup } from '../types';

export function createCleanupTracker(): CleanupTracker {
  const resources: CreatedResource[] = [];
  let failedCleanups: FailedCleanup[] = [];

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function cleanupResource(
    resource: CreatedResource,
    apiContext: APIRequestContext
  ): Promise<void> {
    if (resource.deleteVia === 'api' && resource.deletePath) {
      const method = resource.deleteMethod || 'DELETE';
      if (method === 'DELETE') {
        await apiContext.delete(resource.deletePath);
      } else {
        await apiContext.post(resource.deletePath);
      }
      console.log(`[Cleanup] API deleted: ${resource.type} - ${resource.id}`);
    } else if (resource.deleteVia === 'ui') {
      // UI-based cleanup would go here
      // This is project-specific and handled in page objects
      console.log(`[Cleanup] UI cleanup required: ${resource.type} - ${resource.id}`);
    }
  }

  return {
    track(resource: CreatedResource) {
      resources.push({
        ...resource,
        createdAt: new Date(),
      });
      console.log(`[Cleanup] Tracked: ${resource.type} - ${resource.id}`);
    },

    getAll() {
      return [...resources];
    },

    async cleanup(page: Page, apiContext: APIRequestContext) {
      // Cleanup in reverse order (LIFO - children before parents)
      const toCleanup = [...resources].reverse();
      resources.length = 0;

      console.log(`[Cleanup] Starting cleanup of ${toCleanup.length} resources...`);

      for (const resource of toCleanup) {
        let success = false;
        let lastError: Error | null = null;
        let retryCount = 0;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await cleanupResource(resource, apiContext);
            success = true;
            break;
          } catch (error) {
            lastError = error as Error;
            retryCount = attempt + 1;
            if (attempt < 2) {
              console.log(`[Cleanup] Retry ${retryCount}/2 for ${resource.type} - ${resource.id}`);
              await sleep(1000);
            }
          }
        }

        if (!success && lastError) {
          failedCleanups.push({
            resource,
            error: lastError,
            timestamp: new Date(),
            retryCount,
          });
          console.error(`[Cleanup] Failed after ${retryCount} attempts: ${resource.type} - ${resource.id}`);
        }
      }

      console.log('[Cleanup] Cleanup completed');
    },

    clear() {
      resources.length = 0;
    },

    hasFailures() {
      return failedCleanups.length > 0;
    },

    getFailures() {
      return [...failedCleanups];
    },

    getFailureReport() {
      if (failedCleanups.length === 0) {
        return 'No cleanup failures';
      }

      const lines = ['=== Cleanup Failure Report ==='];
      for (const failure of failedCleanups) {
        lines.push(`- ${failure.resource.type} (${failure.resource.id}): ${failure.error.message}`);
        lines.push(`  Retries: ${failure.retryCount}, Time: ${failure.timestamp.toISOString()}`);
      }
      return lines.join('\n');
    },

    clearFailures() {
      failedCleanups = [];
    },
  };
}
