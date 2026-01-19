import { test, expect } from '../../../src/fixtures';

interface PerformanceMetrics {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  fcp: number | null;
}

test.describe('Performance - Core Web Vitals @studytab @perf', () => {
  test.use({ storageState: '.auth/user.json' });

  async function getPerformanceMetrics(page: any): Promise<PerformanceMetrics> {
    return await page.evaluate(() => {
      return new Promise<PerformanceMetrics>((resolve) => {
        const metrics: PerformanceMetrics = {
          lcp: null,
          fid: null,
          cls: null,
          ttfb: null,
          fcp: null,
        };

        // Get navigation timing
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
          metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        }

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
        }

        // LCP observer
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        });

        // CLS observer
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          metrics.cls = clsValue;
        });

        try {
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          // Some metrics may not be supported
        }

        // Wait a bit for metrics to be collected
        setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          resolve(metrics);
        }, 3000);
      });
    });
  }

  test('dashboard should meet Core Web Vitals thresholds', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    const metrics = await getPerformanceMetrics(page);

    console.log('Dashboard Performance Metrics:', metrics);

    // LCP should be under 2.5s (good) or 4s (needs improvement)
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(4000);
    }

    // CLS should be under 0.1 (good) or 0.25 (needs improvement)
    if (metrics.cls !== null) {
      expect(metrics.cls).toBeLessThan(0.25);
    }

    // FCP should be under 1.8s (good) or 3s (needs improvement)
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(3000);
    }

    // TTFB should be under 800ms (good) or 1800ms (needs improvement)
    if (metrics.ttfb) {
      expect(metrics.ttfb).toBeLessThan(1800);
    }
  });

  test('login page should load quickly', async ({ page, projectConfig }) => {
    const context = await page.context().browser()!.newContext();
    const freshPage = await context.newPage();

    const start = Date.now();
    await freshPage.goto(`${projectConfig.baseUrl}/auth/login`);
    await freshPage.waitForLoadState('domcontentloaded');
    const domContentLoaded = Date.now() - start;

    await freshPage.waitForLoadState('networkidle');
    const networkIdle = Date.now() - start;

    console.log('Login Page Load Times:', { domContentLoaded, networkIdle });

    // DOM should be ready within 2s
    expect(domContentLoaded).toBeLessThan(2000);

    // Full load within 5s
    expect(networkIdle).toBeLessThan(5000);

    await context.close();
  });

  test('decks page should load within acceptable time', async ({ page, projectConfig }) => {
    const start = Date.now();
    await page.goto(`${projectConfig.baseUrl}/decks`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    console.log('Decks Page Load Time:', loadTime);

    // Should load within 5s
    expect(loadTime).toBeLessThan(5000);
  });

  test('navigation between pages should be fast', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Navigate to decks
    const start = Date.now();
    await page.goto(`${projectConfig.baseUrl}/decks`);
    await page.waitForLoadState('domcontentloaded');
    const navigationTime = Date.now() - start;

    console.log('Navigation Time (dashboard → decks):', navigationTime);

    // Client-side navigation should be fast (under 1s)
    expect(navigationTime).toBeLessThan(2000);
  });

  test('should not have memory leaks after multiple navigations', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto(`${projectConfig.baseUrl}/decks`);
      await page.waitForLoadState('networkidle');
      await page.goto(`${projectConfig.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercentage = (memoryIncrease / initialMemory) * 100;

      console.log('Memory Usage:', { initialMemory, finalMemory, increasePercentage: `${increasePercentage.toFixed(2)}%` });

      // Memory shouldn't increase by more than 50% after navigations
      expect(increasePercentage).toBeLessThan(50);
    }
  });
});
