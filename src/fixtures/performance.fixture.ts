/**
 * Performance Budget Playwright Fixture
 *
 * Provides performance measurement and budget enforcement in tests.
 *
 * @module fixtures/performance
 */

import { test as base, Page } from '@playwright/test';
import {
  PerformanceBudget,
  PerformanceBudgetOptions,
  PerformanceMetrics,
  PerformanceBudgets,
  BudgetResult,
  PERFORMANCE_BUDGETS,
  STRICT_BUDGETS,
  RELAXED_BUDGETS,
  PerformanceBudgetError,
} from '../utils/performance-budget';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Performance fixture interface
 */
export interface PerformanceFixture {
  /** The PerformanceBudget instance */
  budget: PerformanceBudget;

  /**
   * Measure page performance
   * @param page - Page to measure (uses test page if not provided)
   */
  measure: (page?: Page) => Promise<PerformanceMetrics>;

  /**
   * Measure with retries for more accurate results
   * @param page - Page to measure
   * @param retries - Number of retries (default: 3)
   */
  measureWithRetry: (page?: Page, retries?: number) => Promise<PerformanceMetrics>;

  /**
   * Check metrics against budgets
   */
  check: (metrics: PerformanceMetrics) => BudgetResult;

  /**
   * Assert metrics are within budget (throws on failure)
   */
  assertWithinBudget: (metrics: PerformanceMetrics) => void;

  /**
   * Measure and assert in one call
   * @param page - Page to measure
   */
  expectWithinBudget: (page?: Page) => Promise<PerformanceMetrics>;

  /**
   * Generate human-readable report
   */
  generateReport: (metrics: PerformanceMetrics) => string;

  /**
   * Get all stored measurements
   */
  getMeasurements: () => PerformanceMetrics[];

  /**
   * Compare two measurements
   */
  compare: (baseline: PerformanceMetrics, current: PerformanceMetrics) => object;

  /**
   * Get current budget thresholds
   */
  getBudgets: () => PerformanceBudgets;
}

/**
 * Fixture options
 */
export interface PerformanceFixtureOptions {
  /** Custom budget thresholds */
  budgets?: Partial<PerformanceBudgets>;
  /** Use strict budgets */
  strict?: boolean;
  /** Use relaxed budgets */
  relaxed?: boolean;
  /** Metrics to skip */
  skipMetrics?: Array<'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'TTI' | 'TBT' | 'INP'>;
  /** Auto-measure on test end */
  autoMeasure?: boolean;
  /** Auto-assert on test end */
  autoAssert?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const defaultOptions: PerformanceFixtureOptions = {
  strict: false,
  relaxed: false,
  autoMeasure: false,
  autoAssert: false,
  verbose: false,
};

// =============================================================================
// FIXTURE IMPLEMENTATION
// =============================================================================

/**
 * Performance budget test fixture
 *
 * @example
 * ```typescript
 * import { test } from './performance.fixture';
 *
 * test('page loads within budget', async ({ page, performance }) => {
 *   await page.goto('/dashboard');
 *
 *   // Measure and assert
 *   await performance.expectWithinBudget(page);
 * });
 *
 * test('compare performance', async ({ page, performance }) => {
 *   // Measure baseline
 *   await page.goto('/');
 *   const baseline = await performance.measure(page);
 *
 *   // Make changes...
 *
 *   // Measure again
 *   await page.goto('/');
 *   const current = await performance.measure(page);
 *
 *   // Compare
 *   const comparison = performance.compare(baseline, current);
 *   console.log(comparison);
 * });
 * ```
 */
export const test = base.extend<
  { performance: PerformanceFixture },
  { performanceOptions: PerformanceFixtureOptions }
>({
  // Worker-scoped options
  performanceOptions: [defaultOptions, { scope: 'worker' }],

  // Test-scoped fixture
  performance: async ({ page, performanceOptions }, use, testInfo) => {
    const options = { ...defaultOptions, ...performanceOptions };

    // Determine which budgets to use
    let budgets: Partial<PerformanceBudgets> = options.budgets ?? {};
    if (options.strict) {
      budgets = { ...STRICT_BUDGETS, ...budgets };
    } else if (options.relaxed) {
      budgets = { ...RELAXED_BUDGETS, ...budgets };
    }

    // Create budget instance
    const budget = new PerformanceBudget({
      budgets,
      skipMetrics: options.skipMetrics,
      verbose: options.verbose,
    });

    // Track metrics for this test
    let lastMetrics: PerformanceMetrics | null = null;

    // Create fixture object
    const fixture: PerformanceFixture = {
      budget,

      async measure(targetPage?: Page): Promise<PerformanceMetrics> {
        const p = targetPage ?? page;
        lastMetrics = await budget.measure(p);
        return lastMetrics;
      },

      async measureWithRetry(targetPage?: Page, retries = 3): Promise<PerformanceMetrics> {
        const p = targetPage ?? page;
        lastMetrics = await budget.measureWithRetry(p, retries);
        return lastMetrics;
      },

      check(metrics: PerformanceMetrics): BudgetResult {
        return budget.check(metrics);
      },

      assertWithinBudget(metrics: PerformanceMetrics): void {
        budget.assertWithinBudget(metrics);
      },

      async expectWithinBudget(targetPage?: Page): Promise<PerformanceMetrics> {
        const p = targetPage ?? page;
        lastMetrics = await budget.measureAndAssert(p);
        return lastMetrics;
      },

      generateReport(metrics: PerformanceMetrics): string {
        return budget.generateReport(metrics);
      },

      getMeasurements(): PerformanceMetrics[] {
        return budget.getMeasurements();
      },

      compare(baseline: PerformanceMetrics, current: PerformanceMetrics): object {
        return budget.compare(baseline, current);
      },

      getBudgets(): PerformanceBudgets {
        return budget.getBudgets();
      },
    };

    // Auto-measure before test if enabled
    if (options.autoMeasure && page.url() !== 'about:blank') {
      await fixture.measure();
    }

    // Provide fixture to test
    await use(fixture);

    // Auto-assert after test if enabled
    if (options.autoAssert && lastMetrics) {
      try {
        budget.assertWithinBudget(lastMetrics);
      } catch (error) {
        if (error instanceof PerformanceBudgetError) {
          // Attach performance report to test
          await testInfo.attach('performance-report', {
            body: budget.generateReport(lastMetrics),
            contentType: 'text/plain',
          });

          // Attach JSON data
          await testInfo.attach('performance-data', {
            body: JSON.stringify(budget.generateJsonReport(lastMetrics), null, 2),
            contentType: 'application/json',
          });
        }
        throw error;
      }
    }

    // Attach performance data if measured
    if (lastMetrics) {
      await testInfo.attach('performance-metrics', {
        body: JSON.stringify(budget.generateJsonReport(lastMetrics), null, 2),
        contentType: 'application/json',
      });
    }
  },
});

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { expect } from '@playwright/test';
export {
  PerformanceBudget,
  PerformanceBudgetError,
  PERFORMANCE_BUDGETS,
  STRICT_BUDGETS,
  RELAXED_BUDGETS,
  type PerformanceMetrics,
  type PerformanceBudgets,
  type BudgetResult,
};

// =============================================================================
// SPECIALIZED TEST VARIANTS
// =============================================================================

/**
 * Test with strict performance budgets
 */
export const strictPerfTest = test.extend<{}, { performanceOptions: PerformanceFixtureOptions }>({
  performanceOptions: [
    {
      strict: true,
      autoAssert: true,
    },
    { scope: 'worker' },
  ],
});

/**
 * Test with relaxed performance budgets
 */
export const relaxedPerfTest = test.extend<{}, { performanceOptions: PerformanceFixtureOptions }>({
  performanceOptions: [
    {
      relaxed: true,
    },
    { scope: 'worker' },
  ],
});

/**
 * Test with auto-assertion enabled
 */
export const perfAssertTest = test.extend<{}, { performanceOptions: PerformanceFixtureOptions }>({
  performanceOptions: [
    {
      autoMeasure: true,
      autoAssert: true,
    },
    { scope: 'worker' },
  ],
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a performance test suite with custom budgets
 *
 * @example
 * ```typescript
 * import { withPerformanceBudget } from './performance.fixture';
 *
 * withPerformanceBudget('Dashboard Performance', { LCP: 2000 }, (test) => {
 *   test('loads dashboard within budget', async ({ page, performance }) => {
 *     await page.goto('/dashboard');
 *     await performance.expectWithinBudget();
 *   });
 * });
 * ```
 */
export function withPerformanceBudget(
  suiteName: string,
  budgets: Partial<PerformanceBudgets>,
  callback: (test: typeof base) => void
): void {
  test.describe(suiteName, () => {
    test.use({
      performanceOptions: {
        budgets,
      },
    } as { performanceOptions: PerformanceFixtureOptions });

    callback(test);
  });
}

/**
 * Create a quick performance check helper
 *
 * @example
 * ```typescript
 * import { expectPagePerformance } from './performance.fixture';
 *
 * test('page is fast', async ({ page }) => {
 *   await page.goto('/');
 *   await expectPagePerformance(page, { LCP: 2000 });
 * });
 * ```
 */
export async function expectPagePerformance(
  page: Page,
  budgets?: Partial<PerformanceBudgets>
): Promise<PerformanceMetrics> {
  const budget = new PerformanceBudget({ budgets });
  return budget.measureAndAssert(page);
}

/**
 * Measure page performance without assertions
 */
export async function measurePagePerformance(page: Page): Promise<PerformanceMetrics> {
  const budget = new PerformanceBudget();
  return budget.measure(page);
}

/**
 * Generate performance report for a page
 */
export async function generatePerformanceReport(page: Page): Promise<string> {
  const budget = new PerformanceBudget();
  const metrics = await budget.measure(page);
  return budget.generateReport(metrics);
}

// =============================================================================
// BASELINE COMPARISON UTILITIES
// =============================================================================

/**
 * Performance baseline storage
 */
const baselineStore = new Map<string, PerformanceMetrics>();

/**
 * Store a performance baseline
 */
export function storeBaseline(name: string, metrics: PerformanceMetrics): void {
  baselineStore.set(name, metrics);
}

/**
 * Get a stored baseline
 */
export function getBaseline(name: string): PerformanceMetrics | undefined {
  return baselineStore.get(name);
}

/**
 * Clear all baselines
 */
export function clearBaselines(): void {
  baselineStore.clear();
}

/**
 * Compare current metrics against a stored baseline
 */
export function compareToBaseline(
  name: string,
  current: PerformanceMetrics,
  budget: PerformanceBudget
): object | null {
  const baseline = baselineStore.get(name);
  if (!baseline) return null;
  return budget.compare(baseline, current);
}

// =============================================================================
// METRIC THRESHOLDS
// =============================================================================

/**
 * Check if a specific metric is within threshold
 */
export function isMetricWithinBudget(
  metricName: keyof PerformanceMetrics,
  value: number | null,
  budgets: Partial<PerformanceBudgets> = PERFORMANCE_BUDGETS
): boolean {
  if (value === null) return true; // Skip null values
  const budget = budgets[metricName as keyof PerformanceBudgets];
  if (budget === undefined) return true;
  return value <= budget;
}

/**
 * Get rating for a metric value (good/needs-improvement/poor)
 */
export function getMetricRating(
  metricName: keyof PerformanceBudgets,
  value: number | null
): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  if (value === null) return 'unknown';

  // Thresholds based on Core Web Vitals
  const thresholds: Record<keyof PerformanceBudgets, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 },
    TTI: { good: 3800, poor: 7300 },
    TBT: { good: 200, poor: 600 },
    INP: { good: 200, poor: 500 },
  };

  const t = thresholds[metricName];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}
