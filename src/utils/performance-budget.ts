/**
 * Performance Budget Utility
 *
 * Measures Core Web Vitals and enforces performance budgets.
 * Fails tests when metrics exceed configured thresholds.
 *
 * @module utils/performance-budget
 */

import type { Page } from '@playwright/test';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Performance metric names
 */
export type MetricName = 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'TTI' | 'TBT' | 'INP';

/**
 * Performance budgets configuration
 */
export interface PerformanceBudgets {
  /** Largest Contentful Paint (ms) - when main content is visible */
  LCP: number;
  /** First Input Delay (ms) - responsiveness to first interaction */
  FID: number;
  /** Cumulative Layout Shift - visual stability (0-1 score) */
  CLS: number;
  /** Time to First Byte (ms) - server response time */
  TTFB: number;
  /** First Contentful Paint (ms) - first content rendered */
  FCP: number;
  /** Time to Interactive (ms) - fully interactive */
  TTI: number;
  /** Total Blocking Time (ms) - main thread blocking */
  TBT: number;
  /** Interaction to Next Paint (ms) - input responsiveness */
  INP: number;
}

/**
 * Collected performance metrics
 */
export interface PerformanceMetrics {
  /** Largest Contentful Paint in ms */
  LCP: number | null;
  /** First Input Delay in ms */
  FID: number | null;
  /** Cumulative Layout Shift score */
  CLS: number | null;
  /** Time to First Byte in ms */
  TTFB: number | null;
  /** First Contentful Paint in ms */
  FCP: number | null;
  /** Time to Interactive in ms */
  TTI: number | null;
  /** Total Blocking Time in ms */
  TBT: number | null;
  /** Interaction to Next Paint in ms */
  INP: number | null;
  /** Page URL measured */
  url: string;
  /** Measurement timestamp */
  timestamp: Date;
  /** Raw navigation timing data */
  navigationTiming?: PerformanceNavigationTimingData;
}

/**
 * Navigation timing data subset
 */
export interface PerformanceNavigationTimingData {
  domContentLoadedEventEnd: number;
  domInteractive: number;
  loadEventEnd: number;
  responseStart: number;
  requestStart: number;
  domComplete: number;
}

/**
 * Budget check result for a single metric
 */
export interface MetricResult {
  name: MetricName;
  value: number | null;
  budget: number;
  passed: boolean;
  difference: number | null;
  percentageOverBudget: number | null;
}

/**
 * Overall budget check result
 */
export interface BudgetResult {
  passed: boolean;
  metrics: MetricResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  url: string;
  timestamp: Date;
}

/**
 * Performance budget options
 */
export interface PerformanceBudgetOptions {
  /** Custom budget thresholds */
  budgets?: Partial<PerformanceBudgets>;
  /** Wait time before measuring (ms) */
  measureDelay?: number;
  /** Timeout for metric collection (ms) */
  timeout?: number;
  /** Include detailed navigation timing */
  includeNavigationTiming?: boolean;
  /** Metrics to skip (won't fail if exceeded) */
  skipMetrics?: MetricName[];
  /** Verbose logging */
  verbose?: boolean;
}

// =============================================================================
// DEFAULT BUDGETS
// =============================================================================

/**
 * Default performance budgets based on Google's Core Web Vitals recommendations
 *
 * These thresholds represent "good" performance:
 * - LCP: 2.5s or less
 * - FID: 100ms or less
 * - CLS: 0.1 or less
 * - TTFB: 800ms or less (server response)
 * - FCP: 1.8s or less
 * - TTI: 3.8s or less
 * - TBT: 200ms or less
 * - INP: 200ms or less
 */
export const PERFORMANCE_BUDGETS: PerformanceBudgets = {
  LCP: 2500,
  FID: 100,
  CLS: 0.1,
  TTFB: 800,
  FCP: 1800,
  TTI: 3800,
  TBT: 200,
  INP: 200,
};

/**
 * Strict budgets for high-performance requirements
 */
export const STRICT_BUDGETS: PerformanceBudgets = {
  LCP: 1500,
  FID: 50,
  CLS: 0.05,
  TTFB: 400,
  FCP: 1000,
  TTI: 2500,
  TBT: 100,
  INP: 100,
};

/**
 * Relaxed budgets for slower connections/devices
 */
export const RELAXED_BUDGETS: PerformanceBudgets = {
  LCP: 4000,
  FID: 300,
  CLS: 0.25,
  TTFB: 1500,
  FCP: 3000,
  TTI: 7500,
  TBT: 500,
  INP: 500,
};

// =============================================================================
// PERFORMANCE BUDGET ERROR
// =============================================================================

/**
 * Error thrown when performance budgets are exceeded
 */
export class PerformanceBudgetError extends Error {
  public readonly result: BudgetResult;
  public readonly failedMetrics: MetricResult[];

  constructor(result: BudgetResult) {
    const failedMetrics = result.metrics.filter((m) => !m.passed && m.value !== null);
    const message = formatBudgetErrorMessage(result, failedMetrics);
    super(message);

    this.name = 'PerformanceBudgetError';
    this.result = result;
    this.failedMetrics = failedMetrics;

    Object.setPrototypeOf(this, PerformanceBudgetError.prototype);
  }
}

/**
 * Format error message for budget violations
 */
function formatBudgetErrorMessage(result: BudgetResult, failedMetrics: MetricResult[]): string {
  const lines = [
    `Performance budget exceeded for ${result.url}`,
    '',
    'Failed metrics:',
  ];

  for (const metric of failedMetrics) {
    const overBy = metric.percentageOverBudget?.toFixed(1) ?? '?';
    lines.push(
      `  - ${metric.name}: ${formatMetricValue(metric.name, metric.value)} (budget: ${formatMetricValue(metric.name, metric.budget)}, ${overBy}% over)`
    );
  }

  return lines.join('\n');
}

/**
 * Format metric value with appropriate unit
 */
function formatMetricValue(name: MetricName, value: number | null): string {
  if (value === null) return 'N/A';

  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'LCP':
    case 'FID':
    case 'TTFB':
    case 'FCP':
    case 'TTI':
    case 'TBT':
    case 'INP':
      return `${Math.round(value)}ms`;
    default:
      return String(value);
  }
}

// =============================================================================
// WEB VITALS MEASUREMENT SCRIPT
// =============================================================================

/**
 * Script injected into page to collect Web Vitals
 */
const WEB_VITALS_SCRIPT = `
(() => {
  return new Promise((resolve) => {
    const metrics = {
      LCP: null,
      FID: null,
      CLS: null,
      TTFB: null,
      FCP: null,
      TTI: null,
      TBT: null,
      INP: null,
      navigationTiming: null,
    };

    // Get navigation timing
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      metrics.TTFB = nav.responseStart - nav.requestStart;
      metrics.navigationTiming = {
        domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
        domInteractive: nav.domInteractive,
        loadEventEnd: nav.loadEventEnd,
        responseStart: nav.responseStart,
        requestStart: nav.requestStart,
        domComplete: nav.domComplete,
      };
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType('paint');
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        metrics.FCP = entry.startTime;
      }
    }

    // Observe LCP
    let lcpValue = null;
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcpValue = lastEntry.startTime;
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP not supported
    }

    // Observe CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS not supported
    }

    // Observe FID
    let fidValue = null;
    const fidObserver = new PerformanceObserver((list) => {
      const firstInput = list.getEntries()[0];
      if (firstInput) {
        fidValue = firstInput.processingStart - firstInput.startTime;
      }
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID not supported
    }

    // Observe long tasks for TBT calculation
    let tbtValue = 0;
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // TBT = sum of (task duration - 50ms) for tasks > 50ms
        const blockingTime = entry.duration - 50;
        if (blockingTime > 0) {
          tbtValue += blockingTime;
        }
      }
    });

    try {
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Long tasks not supported
    }

    // Calculate TTI approximation (simplified)
    // Real TTI requires more complex calculation
    const calculateTTI = () => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.domInteractive) {
        // Simplified: domInteractive + some buffer for scripts
        return nav.domInteractive;
      }
      return null;
    };

    // Collect metrics after a delay to allow observations
    setTimeout(() => {
      metrics.LCP = lcpValue;
      metrics.CLS = clsValue;
      metrics.FID = fidValue;
      metrics.TBT = tbtValue;
      metrics.TTI = calculateTTI();

      // Disconnect observers
      try { lcpObserver.disconnect(); } catch (e) {}
      try { clsObserver.disconnect(); } catch (e) {}
      try { fidObserver.disconnect(); } catch (e) {}
      try { longTaskObserver.disconnect(); } catch (e) {}

      resolve(metrics);
    }, 1000);
  });
})()
`;

// =============================================================================
// PERFORMANCE BUDGET CLASS
// =============================================================================

/**
 * Performance Budget Manager
 *
 * Measures and enforces performance budgets for web pages.
 *
 * @example
 * ```typescript
 * const budget = new PerformanceBudget();
 *
 * // Measure page performance
 * const metrics = await budget.measure(page);
 *
 * // Check against budgets
 * const result = budget.check(metrics);
 * console.log(result.passed ? 'All budgets met!' : 'Budget exceeded');
 *
 * // Or assert (throws on failure)
 * budget.assertWithinBudget(metrics);
 * ```
 */
export class PerformanceBudget {
  private budgets: PerformanceBudgets;
  private options: Required<Omit<PerformanceBudgetOptions, 'budgets'>>;
  private measurements: PerformanceMetrics[] = [];

  constructor(options: PerformanceBudgetOptions = {}) {
    this.budgets = {
      ...PERFORMANCE_BUDGETS,
      ...options.budgets,
    };

    this.options = {
      measureDelay: options.measureDelay ?? 1000,
      timeout: options.timeout ?? 30000,
      includeNavigationTiming: options.includeNavigationTiming ?? true,
      skipMetrics: options.skipMetrics ?? [],
      verbose: options.verbose ?? false,
    };
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[PerformanceBudget] ${message}`);
    }
  }

  /**
   * Get current budget thresholds
   */
  getBudgets(): PerformanceBudgets {
    return { ...this.budgets };
  }

  /**
   * Update budget thresholds
   */
  setBudgets(budgets: Partial<PerformanceBudgets>): void {
    this.budgets = { ...this.budgets, ...budgets };
  }

  /**
   * Measure performance metrics for a page
   */
  async measure(page: Page): Promise<PerformanceMetrics> {
    const url = page.url();
    this.log(`Measuring performance for ${url}`);

    // Wait for page to be fully loaded
    await page.waitForLoadState('load');

    // Additional delay to capture LCP, CLS
    await page.waitForTimeout(this.options.measureDelay);

    // Collect metrics via page.evaluate
    const rawMetrics = await page.evaluate(WEB_VITALS_SCRIPT);

    const metrics: PerformanceMetrics = {
      ...(rawMetrics as Omit<PerformanceMetrics, 'url' | 'timestamp'>),
      url,
      timestamp: new Date(),
    };

    // Store measurement for comparison
    this.measurements.push(metrics);

    this.log(`Collected metrics: LCP=${metrics.LCP}ms, FCP=${metrics.FCP}ms, CLS=${metrics.CLS}, TTFB=${metrics.TTFB}ms`);

    return metrics;
  }

  /**
   * Measure with retries for more accurate results
   */
  async measureWithRetry(page: Page, retries = 3): Promise<PerformanceMetrics> {
    const results: PerformanceMetrics[] = [];

    for (let i = 0; i < retries; i++) {
      // Reload page for fresh measurement
      if (i > 0) {
        await page.reload();
      }

      const metrics = await this.measure(page);
      results.push(metrics);
    }

    // Return median values
    return this.calculateMedianMetrics(results);
  }

  /**
   * Calculate median metrics from multiple measurements
   */
  private calculateMedianMetrics(measurements: PerformanceMetrics[]): PerformanceMetrics {
    const median = (values: (number | null)[]): number | null => {
      const valid = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
      if (valid.length === 0) return null;
      const mid = Math.floor(valid.length / 2);
      return valid.length % 2 !== 0 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
    };

    return {
      LCP: median(measurements.map((m) => m.LCP)),
      FID: median(measurements.map((m) => m.FID)),
      CLS: median(measurements.map((m) => m.CLS)),
      TTFB: median(measurements.map((m) => m.TTFB)),
      FCP: median(measurements.map((m) => m.FCP)),
      TTI: median(measurements.map((m) => m.TTI)),
      TBT: median(measurements.map((m) => m.TBT)),
      INP: median(measurements.map((m) => m.INP)),
      url: measurements[0].url,
      timestamp: new Date(),
      navigationTiming: measurements[0].navigationTiming,
    };
  }

  /**
   * Check metrics against budgets
   */
  check(metrics: PerformanceMetrics): BudgetResult {
    const results: MetricResult[] = [];
    const skipMetrics = new Set(this.options.skipMetrics);

    const metricNames: MetricName[] = ['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'TTI', 'TBT', 'INP'];

    for (const name of metricNames) {
      const value = metrics[name];
      const budget = this.budgets[name];
      const isSkipped = skipMetrics.has(name);

      let passed = true;
      let difference: number | null = null;
      let percentageOverBudget: number | null = null;

      if (value !== null && !isSkipped) {
        passed = value <= budget;
        difference = value - budget;
        percentageOverBudget = ((value - budget) / budget) * 100;
      }

      results.push({
        name,
        value,
        budget,
        passed: value === null || isSkipped || passed,
        difference,
        percentageOverBudget,
      });
    }

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed && r.value !== null).length,
      failed: results.filter((r) => !r.passed).length,
      skipped: results.filter((r) => r.value === null || skipMetrics.has(r.name)).length,
    };

    return {
      passed: summary.failed === 0,
      metrics: results,
      summary,
      url: metrics.url,
      timestamp: metrics.timestamp,
    };
  }

  /**
   * Assert metrics are within budget (throws on failure)
   */
  assertWithinBudget(metrics: PerformanceMetrics): void {
    const result = this.check(metrics);

    if (!result.passed) {
      throw new PerformanceBudgetError(result);
    }
  }

  /**
   * Measure and assert in one call
   */
  async measureAndAssert(page: Page): Promise<PerformanceMetrics> {
    const metrics = await this.measure(page);
    this.assertWithinBudget(metrics);
    return metrics;
  }

  /**
   * Generate human-readable report
   */
  generateReport(metrics: PerformanceMetrics): string {
    const result = this.check(metrics);
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('  PERFORMANCE BUDGET REPORT');
    lines.push('═'.repeat(60));
    lines.push(`  URL: ${metrics.url}`);
    lines.push(`  Time: ${metrics.timestamp.toISOString()}`);
    lines.push(`  Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    lines.push('─'.repeat(60));

    // Metric table
    lines.push('');
    lines.push('  Metric    │ Value      │ Budget     │ Status');
    lines.push('  ──────────┼────────────┼────────────┼────────');

    for (const metric of result.metrics) {
      const value = formatMetricValue(metric.name, metric.value).padEnd(10);
      const budget = formatMetricValue(metric.name, metric.budget).padEnd(10);
      const status = metric.value === null ? '⊘ Skip' : metric.passed ? '✓ Pass' : '✗ Fail';
      const name = metric.name.padEnd(8);
      lines.push(`  ${name}  │ ${value} │ ${budget} │ ${status}`);
    }

    lines.push('');
    lines.push('─'.repeat(60));
    lines.push(`  Summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped`);
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(metrics: PerformanceMetrics): object {
    const result = this.check(metrics);

    return {
      url: metrics.url,
      timestamp: metrics.timestamp.toISOString(),
      passed: result.passed,
      metrics: result.metrics.map((m) => ({
        name: m.name,
        value: m.value,
        budget: m.budget,
        passed: m.passed,
        difference: m.difference,
        percentageOverBudget: m.percentageOverBudget,
      })),
      summary: result.summary,
      rawMetrics: {
        LCP: metrics.LCP,
        FID: metrics.FID,
        CLS: metrics.CLS,
        TTFB: metrics.TTFB,
        FCP: metrics.FCP,
        TTI: metrics.TTI,
        TBT: metrics.TBT,
        INP: metrics.INP,
      },
      navigationTiming: metrics.navigationTiming,
    };
  }

  /**
   * Get all stored measurements
   */
  getMeasurements(): PerformanceMetrics[] {
    return [...this.measurements];
  }

  /**
   * Clear stored measurements
   */
  clearMeasurements(): void {
    this.measurements = [];
  }

  /**
   * Compare two measurements
   */
  compare(baseline: PerformanceMetrics, current: PerformanceMetrics): object {
    const metricNames: MetricName[] = ['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'TTI', 'TBT', 'INP'];
    const comparison: Record<string, object> = {};

    for (const name of metricNames) {
      const baselineValue = baseline[name];
      const currentValue = current[name];

      if (baselineValue !== null && currentValue !== null) {
        const difference = currentValue - baselineValue;
        const percentageChange = ((difference) / baselineValue) * 100;
        const improved = difference < 0;

        comparison[name] = {
          baseline: baselineValue,
          current: currentValue,
          difference,
          percentageChange,
          improved,
          status: improved ? 'improved' : difference === 0 ? 'unchanged' : 'regressed',
        };
      } else {
        comparison[name] = {
          baseline: baselineValue,
          current: currentValue,
          status: 'incomplete',
        };
      }
    }

    return {
      baselineUrl: baseline.url,
      currentUrl: current.url,
      baselineTime: baseline.timestamp,
      currentTime: current.timestamp,
      metrics: comparison,
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a PerformanceBudget instance with default settings
 */
export function createPerformanceBudget(options?: PerformanceBudgetOptions): PerformanceBudget {
  return new PerformanceBudget(options);
}

/**
 * Create a strict performance budget
 */
export function createStrictBudget(options?: Omit<PerformanceBudgetOptions, 'budgets'>): PerformanceBudget {
  return new PerformanceBudget({
    ...options,
    budgets: STRICT_BUDGETS,
  });
}

/**
 * Create a relaxed performance budget
 */
export function createRelaxedBudget(options?: Omit<PerformanceBudgetOptions, 'budgets'>): PerformanceBudget {
  return new PerformanceBudget({
    ...options,
    budgets: RELAXED_BUDGETS,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Quick performance check - measure and return pass/fail
 */
export async function checkPerformance(
  page: Page,
  budgets?: Partial<PerformanceBudgets>
): Promise<BudgetResult> {
  const budget = new PerformanceBudget({ budgets });
  const metrics = await budget.measure(page);
  return budget.check(metrics);
}

/**
 * Quick performance assertion
 */
export async function assertPerformance(
  page: Page,
  budgets?: Partial<PerformanceBudgets>
): Promise<PerformanceMetrics> {
  const budget = new PerformanceBudget({ budgets });
  return budget.measureAndAssert(page);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PerformanceBudget;
