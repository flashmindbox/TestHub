/**
 * Database Snapshot Playwright Fixture
 *
 * Provides database snapshot/restore capabilities for test isolation.
 * Automatically restores database state after tests complete.
 *
 * @module fixtures/db-snapshot
 */

import { test as base } from '@playwright/test';
import { DbSnapshot, DbSnapshotOptions, SnapshotMetadata, DatabaseType } from '../utils/db-snapshot';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Snapshot fixture interface
 */
export interface DbSnapshotFixture {
  /** The DbSnapshot instance */
  db: DbSnapshot;

  /**
   * Take a named snapshot of the current database state
   * @param name - Snapshot name (auto-generated if not provided)
   */
  snapshot: (name?: string) => Promise<string>;

  /**
   * Restore to a previously taken snapshot
   * @param name - Snapshot name to restore
   */
  restore: (name: string) => Promise<void>;

  /**
   * Reset database to empty state
   */
  reset: () => Promise<void>;

  /**
   * List all available snapshots
   */
  list: () => Promise<SnapshotMetadata[]>;

  /**
   * Run a seed script
   * @param script - Custom seed script (uses default if not provided)
   */
  seed: (script?: string) => Promise<void>;

  /**
   * Get the database type
   */
  getDatabaseType: () => DatabaseType;
}

/**
 * Fixture options
 */
export interface DbSnapshotFixtureOptions {
  /** Auto-snapshot before each test */
  autoSnapshot?: boolean;
  /** Auto-restore after each test */
  autoRestore?: boolean;
  /** Snapshot name prefix */
  snapshotPrefix?: string;
  /** DbSnapshot configuration */
  dbOptions?: DbSnapshotOptions;
}

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const defaultOptions: DbSnapshotFixtureOptions = {
  autoSnapshot: false,
  autoRestore: false,
  snapshotPrefix: 'test',
};

// =============================================================================
// FIXTURE IMPLEMENTATION
// =============================================================================

/**
 * Create database snapshot fixture
 *
 * @example
 * ```typescript
 * // In test file
 * import { test } from './db-snapshot.fixture';
 *
 * test.describe('My tests', () => {
 *   test.beforeAll(async ({ dbSnapshot }) => {
 *     await dbSnapshot.snapshot('before-suite');
 *   });
 *
 *   test.afterAll(async ({ dbSnapshot }) => {
 *     await dbSnapshot.restore('before-suite');
 *   });
 *
 *   test('my test', async ({ dbSnapshot }) => {
 *     // Test with isolated database state
 *   });
 * });
 * ```
 */
export const test = base.extend<
  { dbSnapshot: DbSnapshotFixture },
  { dbSnapshotOptions: DbSnapshotFixtureOptions }
>({
  // Worker-scoped options (shared across tests in a worker)
  dbSnapshotOptions: [defaultOptions, { scope: 'worker', option: true }],

  // Test-scoped fixture
  dbSnapshot: async ({ dbSnapshotOptions }, use, testInfo) => {
    const options = { ...defaultOptions, ...dbSnapshotOptions };
    let db: DbSnapshot | null = null;
    let autoSnapshotName: string | null = null;

    // Lazy initialization to avoid creating DbSnapshot when not needed
    const getDb = (): DbSnapshot => {
      if (!db) {
        db = new DbSnapshot(options.dbOptions);
      }
      return db;
    };

    // Generate unique snapshot name for this test
    const generateSnapshotName = (prefix?: string): string => {
      const base = prefix ?? options.snapshotPrefix ?? 'test';
      const testName = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const timestamp = Date.now();
      return `${base}-${testName}-${timestamp}`;
    };

    // Auto-snapshot before test if enabled
    if (options.autoSnapshot) {
      autoSnapshotName = generateSnapshotName('auto');
      await getDb().snapshot(autoSnapshotName);
    }

    // Create fixture object
    const fixture: DbSnapshotFixture = {
      get db() {
        return getDb();
      },

      async snapshot(name?: string): Promise<string> {
        const snapshotName = name ?? generateSnapshotName();
        await getDb().snapshot(snapshotName);
        return snapshotName;
      },

      async restore(name: string): Promise<void> {
        await getDb().restore(name);
      },

      async reset(): Promise<void> {
        await getDb().reset();
      },

      async list(): Promise<SnapshotMetadata[]> {
        return getDb().list();
      },

      async seed(script?: string): Promise<void> {
        await getDb().seed(script);
      },

      getDatabaseType(): DatabaseType {
        return getDb().getDatabaseType();
      },
    };

    // Provide fixture to test
    await use(fixture);

    // Auto-restore after test if enabled
    if (options.autoRestore && autoSnapshotName) {
      try {
        await getDb().restore(autoSnapshotName);
        await getDb().delete(autoSnapshotName);
      } catch (error) {
        console.error(`Failed to auto-restore snapshot: ${error}`);
      }
    }
  },
});

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { expect } from '@playwright/test';
export { DbSnapshot, type DbSnapshotOptions, type SnapshotMetadata, type DatabaseType };

// =============================================================================
// HELPER FIXTURES
// =============================================================================

/**
 * Test fixture with auto-snapshot enabled
 *
 * Automatically takes a snapshot before each test and restores after.
 * Useful for tests that modify database state.
 *
 * @example
 * ```typescript
 * import { isolatedTest } from './db-snapshot.fixture';
 *
 * isolatedTest('modifies database safely', async ({ dbSnapshot, page }) => {
 *   // Database state is automatically isolated
 *   await page.click('[data-testid="delete-all"]');
 *   // After test, database is restored to original state
 * });
 * ```
 */
export const isolatedTest = test.extend<{}, { dbSnapshotOptions: DbSnapshotFixtureOptions }>({
  dbSnapshotOptions: [
    {
      autoSnapshot: true,
      autoRestore: true,
      snapshotPrefix: 'isolated',
    },
    { scope: 'worker' },
  ],
});

// =============================================================================
// SUITE-LEVEL HELPERS
// =============================================================================

/**
 * Create a test suite with database isolation
 *
 * Takes a snapshot before all tests in the suite and restores after.
 *
 * @example
 * ```typescript
 * import { withDbIsolation } from './db-snapshot.fixture';
 *
 * withDbIsolation('My isolated suite', (test) => {
 *   test('test 1', async ({ page }) => {
 *     // Runs with clean database state
 *   });
 *
 *   test('test 2', async ({ page }) => {
 *     // Also runs with clean database state (restored from snapshot)
 *   });
 * });
 * ```
 */
export function withDbIsolation(
  suiteName: string,
  callback: (test: typeof base) => void,
  options?: DbSnapshotOptions
): void {
  test.describe(suiteName, () => {
    let db: DbSnapshot;
    const snapshotName = `suite-${suiteName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}`;

    test.beforeAll(async () => {
      db = new DbSnapshot(options);
      await db.snapshot(snapshotName);
    });

    test.afterAll(async () => {
      if (db) {
        try {
          await db.restore(snapshotName);
          await db.delete(snapshotName);
        } catch (error) {
          console.error(`Failed to restore suite snapshot: ${error}`);
        }
      }
    });

    // Run the test definitions
    callback(test);
  });
}

/**
 * Create a test that runs in complete isolation
 *
 * Takes a snapshot before the test, runs it, then restores.
 * More heavyweight than autoRestore but guarantees isolation.
 *
 * @example
 * ```typescript
 * import { withSnapshot } from './db-snapshot.fixture';
 *
 * withSnapshot('destructive test', async ({ page, dbSnapshot }) => {
 *   // This test is completely isolated
 *   await page.click('[data-testid="delete-everything"]');
 * });
 * ```
 */
export function withSnapshot(
  testName: string,
  testFn: (fixtures: { dbSnapshot: DbSnapshotFixture }) => Promise<void>,
  options?: DbSnapshotOptions
): void {
  test(testName, async ({ dbSnapshot }) => {
    const db = new DbSnapshot(options);
    const snapshotName = `isolated-${testName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`;

    await db.snapshot(snapshotName);

    try {
      await testFn({ dbSnapshot });
    } finally {
      await db.restore(snapshotName);
      await db.delete(snapshotName);
    }
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Wait for database to be ready
 *
 * Useful before taking snapshots to ensure all transactions are complete.
 */
export async function waitForDbReady(db: DbSnapshot, timeout = 5000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      // Try to list snapshots as a connectivity check
      await db.list();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Database not ready after ${timeout}ms`);
}

/**
 * Clean up old test snapshots
 *
 * Removes snapshots older than the specified age.
 */
export async function cleanupOldSnapshots(
  db: DbSnapshot,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<number> {
  const snapshots = await db.list();
  const now = Date.now();
  let deleted = 0;

  for (const snapshot of snapshots) {
    const age = now - snapshot.createdAt.getTime();
    if (age > maxAgeMs) {
      await db.delete(snapshot.name);
      deleted++;
    }
  }

  return deleted;
}
