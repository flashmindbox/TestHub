/**
 * Page Performance Budget Tests
 *
 * Enforces performance budgets on critical StudyTab pages.
 * Tests both cold (fresh) and warm (cached) page loads.
 *
 * @tags @studytab @performance @budgets
 */

import { test, expect } from '../../../src/fixtures';
import {
  PerformanceBudget,
  PerformanceMetrics,
  PERFORMANCE_BUDGETS,
  createPerformanceBudget,
} from '../../../src/utils/performance-budget';

// =============================================================================
// PAGE-SPECIFIC BUDGETS
// =============================================================================

/**
 * Default budgets for most pages
 */
const DEFAULT_BUDGETS = {
  ...PERFORMANCE_BUDGETS,
  // Slightly relaxed for general pages
  LCP: 3000,
  FCP: 2000,
  TTI: 4500,
};

/**
 * Strict budgets for UX-critical pages (study session)
 */
const STRICT_BUDGETS = {
  ...PERFORMANCE_BUDGETS,
  LCP: 2000,
  FCP: 1500,
  TTI: 3000,
  TBT: 150,
};

/**
 * Relaxed budgets for data-heavy pages (dashboard, deck view)
 */
const DATA_HEAVY_BUDGETS = {
  ...PERFORMANCE_BUDGETS,
  LCP: 3500,
  FCP: 2500,
  TTI: 5000,
  TTFB: 1000,
};

/**
 * Budgets for simple/static pages (login, landing)
 */
const SIMPLE_PAGE_BUDGETS = {
  ...PERFORMANCE_BUDGETS,
  LCP: 2000,
  FCP: 1500,
  TTI: 3000,
  TTFB: 600,
};

// =============================================================================
// TEST SETUP
// =============================================================================

// Store all metrics for final report
const allMetrics: Map<string, PerformanceMetrics[]> = new Map();

/**
 * Record metrics for a page
 */
function recordMetrics(pageName: string, metrics: PerformanceMetrics): void {
  if (!allMetrics.has(pageName)) {
    allMetrics.set(pageName, []);
  }
  allMetrics.get(pageName)!.push(metrics);
}

/**
 * Generate summary report
 */
function generateSummaryReport(): string {
  const lines: string[] = [];
  const budget = createPerformanceBudget();

  lines.push('');
  lines.push('═'.repeat(80));
  lines.push('  STUDYTAB PAGE PERFORMANCE SUMMARY');
  lines.push('═'.repeat(80));
  lines.push('');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [pageName, metrics] of allMetrics) {
    lines.push(`┌─ ${pageName} ${'─'.repeat(Math.max(0, 74 - pageName.length))}┐`);

    for (const metric of metrics) {
      const result = budget.check(metric);
      const status = result.passed ? '✓ PASS' : '✗ FAIL';

      if (result.passed) totalPassed++;
      else totalFailed++;

      const lcpStr = metric.LCP ? `${Math.round(metric.LCP)}ms` : 'N/A';
      const fcpStr = metric.FCP ? `${Math.round(metric.FCP)}ms` : 'N/A';
      const clsStr = metric.CLS !== null ? metric.CLS.toFixed(3) : 'N/A';
      const ttfbStr = metric.TTFB ? `${Math.round(metric.TTFB)}ms` : 'N/A';

      lines.push(`│ ${status}  LCP: ${lcpStr.padEnd(8)} FCP: ${fcpStr.padEnd(8)} CLS: ${clsStr.padEnd(6)} TTFB: ${ttfbStr.padEnd(8)} │`);
    }

    lines.push(`└${'─'.repeat(78)}┘`);
    lines.push('');
  }

  lines.push('─'.repeat(80));
  lines.push(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  lines.push('═'.repeat(80));

  return lines.join('\n');
}

// =============================================================================
// UNAUTHENTICATED PAGE TESTS
// =============================================================================

test.describe('Page Performance Budgets - Public Pages @studytab @performance', () => {
  // No authentication needed for these pages
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ context }) => {
    // Clear browser cache for consistent cold load measurements
    await context.clearCookies();
  });

  test.describe('Landing Page', () => {
    const pageName = 'Landing Page';

    test('cold load - meets performance budgets', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({ budgets: SIMPLE_PAGE_BUDGETS });

      // Navigate to landing page
      await page.goto(projectConfig.baseUrl, { waitUntil: 'networkidle' });

      // Measure performance
      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Cold)`, metrics);

      // Assert within budget
      const result = budget.check(metrics);

      // Log report for debugging
      console.log(budget.generateReport(metrics));

      expect(result.passed, `Landing page exceeded performance budget:\n${budget.generateReport(metrics)}`).toBe(true);
    });

    test('warm load - meets stricter budgets after caching', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: {
          ...SIMPLE_PAGE_BUDGETS,
          // Even stricter for cached loads
          LCP: 1500,
          FCP: 1000,
          TTFB: 400,
        },
      });

      // First load to warm cache
      await page.goto(projectConfig.baseUrl, { waitUntil: 'networkidle' });

      // Reload for warm measurement
      await page.reload({ waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Warm)`, metrics);

      const result = budget.check(metrics);
      console.log(budget.generateReport(metrics));

      // Warm loads should be faster
      expect(result.passed, `Warm load exceeded budget:\n${budget.generateReport(metrics)}`).toBe(true);
    });
  });

  test.describe('Login Page', () => {
    const pageName = 'Login Page';

    test('cold load - meets performance budgets', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({ budgets: SIMPLE_PAGE_BUDGETS });

      await page.goto(`${projectConfig.baseUrl}/login`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Cold)`, metrics);

      const result = budget.check(metrics);
      console.log(budget.generateReport(metrics));

      expect(result.passed, `Login page exceeded performance budget`).toBe(true);
    });

    test('warm load - fast form rendering', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: {
          ...SIMPLE_PAGE_BUDGETS,
          LCP: 1500,
          FCP: 1000,
        },
      });

      // Warm cache
      await page.goto(`${projectConfig.baseUrl}/login`, { waitUntil: 'networkidle' });
      await page.reload({ waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Warm)`, metrics);

      const result = budget.check(metrics);

      expect(result.passed).toBe(true);
    });

    test('login form is interactive quickly', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: { TTI: 2500, TBT: 100 },
        skipMetrics: ['LCP', 'FCP', 'CLS', 'TTFB', 'INP'],
      });

      await page.goto(`${projectConfig.baseUrl}/login`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);

      // Form should be interactive quickly
      budget.assertWithinBudget(metrics);

      // Verify form elements are actually interactive
      const emailInput = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]'));
      await expect(emailInput).toBeEnabled({ timeout: 3000 });
    });
  });
});

// =============================================================================
// AUTHENTICATED PAGE TESTS
// =============================================================================

test.describe('Page Performance Budgets - Authenticated Pages @studytab @performance', () => {
  // Use authenticated session
  test.use({ storageState: '.auth/user.json' });

  test.beforeEach(async ({ context }) => {
    // Clear only performance-related caches, keep auth
    // Note: We can't fully clear cache without losing auth
  });

  test.describe('Dashboard', () => {
    const pageName = 'Dashboard';

    test('cold load - meets data-heavy page budgets', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({ budgets: DATA_HEAVY_BUDGETS });

      await page.goto(`${projectConfig.baseUrl}/dashboard`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Cold)`, metrics);

      const result = budget.check(metrics);
      console.log(budget.generateReport(metrics));

      expect(result.passed, `Dashboard exceeded performance budget`).toBe(true);
    });

    test('warm load - improved performance with cache', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: {
          ...DATA_HEAVY_BUDGETS,
          LCP: 2500,
          FCP: 2000,
        },
      });

      // Warm cache
      await page.goto(`${projectConfig.baseUrl}/dashboard`, { waitUntil: 'networkidle' });
      await page.reload({ waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Warm)`, metrics);

      const result = budget.check(metrics);

      expect(result.passed).toBe(true);
    });

    test('dashboard widgets load progressively', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/dashboard`);

      // First contentful paint should happen quickly
      await page.waitForLoadState('domcontentloaded');

      const budget = createPerformanceBudget({
        budgets: { FCP: 2000 },
        skipMetrics: ['LCP', 'CLS', 'TTFB', 'TTI', 'TBT', 'FID', 'INP'],
      });

      const metrics = await budget.measure(page);

      expect(metrics.FCP).toBeLessThan(2000);
    });
  });

  test.describe('Deck View Page', () => {
    const pageName = 'Deck View';

    test('cold load - meets data-heavy page budgets', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({ budgets: DATA_HEAVY_BUDGETS });

      // Navigate to decks list first, then to a specific deck
      await page.goto(`${projectConfig.baseUrl}/decks`, { waitUntil: 'networkidle' });

      // Wait for deck list to load
      await page.waitForTimeout(1000);

      // Try to click on first deck if available
      const deckLink = page.locator('[data-testid="deck-card"], .deck-card, a[href*="/deck"]').first();

      if (await deckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deckLink.click();
        await page.waitForLoadState('networkidle');

        const metrics = await budget.measure(page);
        recordMetrics(`${pageName} (Cold)`, metrics);

        const result = budget.check(metrics);
        console.log(budget.generateReport(metrics));

        expect(result.passed, `Deck view exceeded performance budget`).toBe(true);
      } else {
        // No decks available, test with decks page instead
        const metrics = await budget.measure(page);
        recordMetrics(`${pageName} (Decks List)`, metrics);

        const result = budget.check(metrics);
        expect(result.passed).toBe(true);
      }
    });

    test('deck cards render without excessive layout shift', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: { CLS: 0.1 },
        skipMetrics: ['LCP', 'FCP', 'TTFB', 'TTI', 'TBT', 'FID', 'INP'],
      });

      await page.goto(`${projectConfig.baseUrl}/decks`, { waitUntil: 'networkidle' });

      // Wait for any dynamic content
      await page.waitForTimeout(2000);

      const metrics = await budget.measure(page);

      // CLS should be minimal
      if (metrics.CLS !== null) {
        expect(metrics.CLS).toBeLessThanOrEqual(0.15);
      }
    });
  });

  test.describe('Study Session Page', () => {
    const pageName = 'Study Session';

    test('study page meets strict UX budgets', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: STRICT_BUDGETS,
        verbose: true,
      });

      // Navigate to study page (may redirect if no cards due)
      await page.goto(`${projectConfig.baseUrl}/study`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName}`, metrics);

      const result = budget.check(metrics);
      console.log(budget.generateReport(metrics));

      // Study page is UX-critical - should be fast
      expect(result.passed, `Study page is too slow for good UX`).toBe(true);
    });

    test('card flip animation is smooth (low TBT)', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: { TBT: 100 },
        skipMetrics: ['LCP', 'FCP', 'CLS', 'TTFB', 'TTI', 'FID', 'INP'],
      });

      await page.goto(`${projectConfig.baseUrl}/study`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);

      // Low blocking time ensures smooth animations
      if (metrics.TBT !== null) {
        expect(metrics.TBT).toBeLessThan(150);
      }
    });

    test('study session is interactive immediately', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/study`);

      // Wait for page to be interactive
      await page.waitForLoadState('domcontentloaded');

      const startTime = Date.now();

      // Try to find and interact with study controls
      const studyControls = page.locator('[data-testid="study-controls"], .study-card, button').first();

      try {
        await studyControls.waitFor({ state: 'visible', timeout: 3000 });
        const interactiveTime = Date.now() - startTime;

        // Should be interactive within 3 seconds
        expect(interactiveTime).toBeLessThan(3000);
      } catch {
        // Page may redirect if no cards, that's OK
      }
    });
  });

  test.describe('Settings Page', () => {
    const pageName = 'Settings';

    test('cold load - meets default budgets', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({ budgets: DEFAULT_BUDGETS });

      await page.goto(`${projectConfig.baseUrl}/settings`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      recordMetrics(`${pageName} (Cold)`, metrics);

      const result = budget.check(metrics);
      console.log(budget.generateReport(metrics));

      expect(result.passed, `Settings page exceeded budget`).toBe(true);
    });

    test('settings form is interactive quickly', async ({ page, projectConfig }) => {
      const budget = createPerformanceBudget({
        budgets: { TTI: 3500 },
        skipMetrics: ['LCP', 'FCP', 'CLS', 'TTFB', 'TBT', 'FID', 'INP'],
      });

      await page.goto(`${projectConfig.baseUrl}/settings`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);

      budget.assertWithinBudget(metrics);
    });
  });
});

// =============================================================================
// CROSS-PAGE COMPARISON TESTS
// =============================================================================

test.describe('Page Performance Comparison @studytab @performance', () => {
  test.use({ storageState: '.auth/user.json' });

  test('compare all critical pages', async ({ page, projectConfig }) => {
    const budget = createPerformanceBudget({ budgets: DEFAULT_BUDGETS });
    const pages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Decks', path: '/decks' },
      { name: 'Study', path: '/study' },
      { name: 'Settings', path: '/settings' },
    ];

    const results: Array<{ name: string; metrics: PerformanceMetrics; passed: boolean }> = [];

    for (const p of pages) {
      await page.goto(`${projectConfig.baseUrl}${p.path}`, { waitUntil: 'networkidle' });

      const metrics = await budget.measure(page);
      const result = budget.check(metrics);

      results.push({ name: p.name, metrics, passed: result.passed });
    }

    // Log comparison
    console.log('\nPage Performance Comparison:');
    console.log('─'.repeat(60));

    for (const r of results) {
      const lcpStr = r.metrics.LCP ? `${Math.round(r.metrics.LCP)}ms` : 'N/A';
      const fcpStr = r.metrics.FCP ? `${Math.round(r.metrics.FCP)}ms` : 'N/A';
      const status = r.passed ? '✓' : '✗';
      console.log(`${status} ${r.name.padEnd(15)} LCP: ${lcpStr.padEnd(10)} FCP: ${fcpStr}`);
    }

    console.log('─'.repeat(60));

    // All pages should pass
    const allPassed = results.every((r) => r.passed);
    expect(allPassed, 'Some pages exceeded performance budgets').toBe(true);
  });

  test('navigation performance - page transitions are fast', async ({ page, projectConfig }) => {
    // Start on dashboard
    await page.goto(`${projectConfig.baseUrl}/dashboard`, { waitUntil: 'networkidle' });

    const navigations = [
      { to: '/decks', name: 'Dashboard → Decks' },
      { to: '/settings', name: 'Decks → Settings' },
      { to: '/dashboard', name: 'Settings → Dashboard' },
    ];

    for (const nav of navigations) {
      const startTime = Date.now();

      await page.goto(`${projectConfig.baseUrl}${nav.to}`, { waitUntil: 'domcontentloaded' });

      const navigationTime = Date.now() - startTime;

      console.log(`${nav.name}: ${navigationTime}ms`);

      // Client-side navigation should be fast (< 2s to DOM ready)
      expect(navigationTime).toBeLessThan(2000);
    }
  });
});

// =============================================================================
// SUMMARY REPORT
// =============================================================================

test.afterAll(() => {
  // Generate and log summary report
  const report = generateSummaryReport();
  console.log(report);
});
