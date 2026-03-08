import { test, expect } from '../../../../src/fixtures';

/**
 * Stats Trend Indicators E2E Tests
 *
 * Validates trend calculations in the /stats/summary API
 * and trend indicator display on the stats page.
 *
 * Tags: @studytab @stats @trends
 */
test.describe('Stats Trend Indicators @studytab @stats @trends', () => {
  test.use({ storageState: '.auth/user.json' });
  test.setTimeout(30000);

  test.describe('API: Trend data in /stats/summary', () => {
    test('returns trends for period-based queries (7d, 30d, 90d)', async ({ request, projectConfig }) => {
      for (const period of ['7d', '30d', '90d']) {
        const res = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=${period}`);
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const { trends } = body.data;

        expect(trends).not.toBeNull();
        for (const key of ['flashcards', 'topics', 'tasks', 'pomodoro', 'notes']) {
          expect(trends[key]).toBeDefined();
          expect(typeof trends[key].percentChange).toBe('number');
          expect(['up', 'down', 'flat']).toContain(trends[key].direction);
        }
      }
    });

    test('returns null trends for "all" period', async ({ request, projectConfig }) => {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=all`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();

      expect(body.data.trends).toBeNull();
    });

    test('trend direction matches percentChange sign', async ({ request, projectConfig }) => {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=30d`);
      expect(res.ok()).toBeTruthy();
      const { trends } = (await res.json()).data;

      for (const key of ['flashcards', 'topics', 'tasks', 'pomodoro', 'notes']) {
        const { percentChange, direction } = trends[key];
        if (percentChange > 0) expect(direction).toBe('up');
        else if (percentChange < 0) expect(direction).toBe('down');
        else expect(direction).toBe('flat');
      }
    });
  });

  test.describe('UI: Trend indicators on stats page', () => {
    test('stats page loads with productivity overview', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/stats`);
      const overview = page.locator('#main-content');
      await expect(overview.getByText('Productivity Overview')).toBeVisible({ timeout: 10000 });

      for (const label of ['Flashcards', 'Pomodoro', 'Tasks Done', 'Notes', 'Topics']) {
        await expect(overview.getByText(label, { exact: true })).toBeVisible();
      }
    });

    test('trend indicators appear for non-all periods', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/stats`);
      await expect(page.getByText('Productivity Overview')).toBeVisible({ timeout: 10000 });

      // Default period is 30d — trends should be present (up, down, or flat icons)
      const trendIcons = page.locator('[class*="inline-flex"][class*="items-center"][class*="gap-0.5"]');
      await expect(trendIcons.first()).toBeVisible({ timeout: 5000 });
      const count = await trendIcons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('switching to "All Time" hides trend indicators', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/stats`);
      await expect(page.getByText('Productivity Overview')).toBeVisible({ timeout: 10000 });

      // Click "All Time" period tab
      await page.getByRole('button', { name: 'All Time' }).click();
      await page.waitForTimeout(1000);

      // Trend indicators within the Productivity Overview should not be visible
      const overview = page.locator('text=Productivity Overview').locator('..');
      const trendIcons = overview.locator('[class*="text-accent-green"], [class*="text-accent-red"]');
      await expect(trendIcons).toHaveCount(0);
    });

    test('trend shows percentage text', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/stats`);
      await expect(page.getByText('Productivity Overview')).toBeVisible({ timeout: 10000 });

      // Wait for MiniStatCards to finish loading (skeleton disappears, real values appear)
      const overview = page.locator('#main-content');
      await expect(overview.getByText('Flashcards')).toBeVisible({ timeout: 10000 });

      // At least one trend indicator should show a percentage (e.g. "+100%", "0%", "-50%")
      const percentTexts = overview.locator('span').filter({ hasText: /^\+?\-?\d+%$/ });
      await expect(percentTexts.first()).toBeVisible({ timeout: 5000 });
    });
  });
});
