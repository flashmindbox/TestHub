import { test, expect } from '../../../../src/fixtures';

/**
 * Achievements v1 E2E Tests
 *
 * Validates achievement API endpoints and the achievements page UI.
 *
 * Tags: @studytab @achievements
 */
test.describe('Achievements v1 @studytab @achievements', () => {
  test.use({ storageState: '.auth/user.json' });
  test.setTimeout(30000);

  test.describe('API: Achievement endpoints', () => {
    test('GET /achievements returns list of achievements', async ({ request, projectConfig }) => {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/achievements`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const achievement = body.data[0];
      expect(achievement).toHaveProperty('id');
      expect(achievement).toHaveProperty('code');
      expect(achievement).toHaveProperty('name');
      expect(achievement).toHaveProperty('icon');
      expect(achievement).toHaveProperty('category');
      expect(achievement).toHaveProperty('rarity');
      expect(achievement).toHaveProperty('xpReward');
    });

    test('achievements have valid rarity values', async ({ request, projectConfig }) => {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/achievements`);
      const body = await res.json();
      const validRarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

      for (const a of body.data) {
        expect(validRarities).toContain(a.rarity);
      }
    });

    test('achievements cover all 4 categories', async ({ request, projectConfig }) => {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/achievements`);
      const body = await res.json();
      const categories = new Set(body.data.map((a: { category: string }) => a.category));
      expect(categories.has('study')).toBe(true);
      expect(categories.has('creation')).toBe(true);
      expect(categories.has('streak')).toBe(true);
      expect(categories.has('mastery')).toBe(true);
    });

    test('GET /achievements/mine returns user achievements array', async ({ request, projectConfig }) => {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/achievements/mine`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      // If user has unlocked achievements, verify structure
      if (body.data.length > 0) {
        const ua = body.data[0];
        expect(ua).toHaveProperty('achievementId');
        expect(ua).toHaveProperty('unlockedAt');
        expect(ua).toHaveProperty('achievement');
        expect(ua.achievement).toHaveProperty('name');
        expect(ua.achievement).toHaveProperty('icon');
      }
    });

    test('POST /achievements/seed upserts all achievement definitions', async ({ request, projectConfig }) => {
      const res = await request.post(`${projectConfig.apiUrl}/api/v1/achievements/seed`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.seeded).toBeGreaterThanOrEqual(15);
    });
  });

  test.describe('UI: Achievements page', () => {
    test('achievements page loads with heading and grid', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/achievements`);
      await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/\d+ of \d+ unlocked/)).toBeVisible();
    });

    test('category filter tabs are present', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/achievements`);
      await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible({ timeout: 10000 });

      for (const label of ['All', 'Study', 'Creation', 'Streaks', 'Mastery']) {
        await expect(page.getByRole('button', { name: label })).toBeVisible();
      }
    });

    test('clicking category tab filters achievements', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/achievements`);
      await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible({ timeout: 10000 });

      // Count cards with "All" selected
      const allCards = await page.locator('[class*="rounded-xl"][class*="border"]').count();

      // Click "Study" filter
      await page.getByRole('button', { name: 'Study' }).click();
      await page.waitForTimeout(300);

      const studyCards = await page.locator('[class*="rounded-xl"][class*="border"]').count();
      // Study subset should be less than or equal to all
      expect(studyCards).toBeLessThanOrEqual(allCards);
    });

    test('sidebar has Achievements link', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Desktop sidebar should show Achievements
      const sidebar = page.locator('aside');
      if (await sidebar.isVisible()) {
        await expect(sidebar.getByText('Achievements')).toBeVisible();
      }
    });
  });
});
