import { Page, APIRequestContext } from '@playwright/test';
import { CreatedResource, CleanupTracker } from '../types';

export function createCleanupTracker(): CleanupTracker {
  const resources: CreatedResource[] = [];

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

      console.log(`[Cleanup] Starting cleanup of ${toCleanup.length} resources...`);

      for (const resource of toCleanup) {
        try {
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
        } catch (error) {
          console.error(`[Cleanup] Failed to delete ${resource.type} - ${resource.id}:`, error);
          // Continue with other cleanups even if one fails
        }
      }

      // Clear the tracked resources
      resources.length = 0;
      console.log('[Cleanup] Cleanup completed');
    },

    clear() {
      resources.length = 0;
    },
  };
}
