import { test, expect } from '../../../../src/fixtures';

test.describe('Unified Schedule @studytab @productivity @schedule', () => {
  test.use({ storageState: '.auth/user.json' });

  test.describe('Navigation', () => {
    test('sidebar shows My Schedule link pointing to /schedule', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      const scheduleLink = page.locator('nav a[href="/schedule"], nav a:has-text("My Schedule")').first();
      await expect(scheduleLink).toBeVisible();

      // Old separate items should NOT exist in sidebar
      const timetableLink = page.locator('nav a[href="/timetable"]');
      await expect(timetableLink).toHaveCount(0);
    });

    test('clicking My Schedule navigates to /schedule', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      const scheduleLink = page.locator('nav a[href="/schedule"], nav a:has-text("My Schedule")').first();
      await scheduleLink.click();
      await page.waitForURL('**/schedule**');
      await expect(page).toHaveURL(/.*schedule.*/);
    });

    test('old /timetable route still works', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/timetable`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('old /calendar route still works', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/calendar`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Schedule Page Structure', () => {
    test.beforeEach(async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/schedule`);
      await page.waitForLoadState('networkidle');
    });

    test('page shows title and today date', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /my schedule/i })).toBeVisible();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[new Date().getDay()];
      await expect(page.getByText(new RegExp(dayName, 'i'))).toBeVisible();
    });

    test('three tabs are visible: Today, Week, Calendar', async ({ page }) => {
      await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /week/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /calendar/i })).toBeVisible();
    });

    test('Today tab is active by default', async ({ page }) => {
      const todayTab = page.getByRole('button', { name: /today/i });
      await expect(todayTab).toHaveClass(/border-primary|text-primary/);
    });
  });

  test.describe('Today Tab', () => {
    test.beforeEach(async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/schedule`);
      await page.waitForLoadState('networkidle');
    });

    test('shows entries or empty state', async ({ page }) => {
      await page.waitForTimeout(2000);

      const hasEntries = await page.locator('[class*="border-l-4"]').first().isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no schedule for today/i).isVisible().catch(() => false);

      expect(hasEntries || hasEmptyState).toBeTruthy();
    });

    test('empty state shows setup link and free study option', async ({ page }) => {
      const hasEmptyState = await page.getByText(/no schedule for today/i).isVisible().catch(() => false);
      if (!hasEmptyState) {
        test.skip();
        return;
      }

      await expect(page.getByText(/timetable/i)).toBeVisible();
      await expect(page.getByText(/free study/i)).toBeVisible();
    });

    test('action buttons are visible when entries exist', async ({ page }) => {
      await page.waitForTimeout(1500);

      const addBlock = page.getByRole('button', { name: /add study block/i });
      const freeStudy = page.getByRole('button', { name: /free study/i });

      const addBlockVisible = await addBlock.isVisible().catch(() => false);
      const freeStudyVisible = await freeStudy.isVisible().catch(() => false);
      expect(addBlockVisible || freeStudyVisible).toBeTruthy();
    });
  });

  test.describe('Week Tab', () => {
    test('shows timetable grid when clicked', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/schedule`);
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /week/i }).click();
      await page.waitForTimeout(1500);

      const hasGrid = await page.locator('[class*="timetable"], [class*="grid"]').first().isVisible().catch(() => false);
      const hasSetupWizard = await page.getByText(/set up your weekly/i).isVisible().catch(() => false);
      const hasTemplateSelector = await page.getByText(/template/i).isVisible().catch(() => false);

      expect(hasGrid || hasSetupWizard || hasTemplateSelector).toBeTruthy();
    });
  });

  test.describe('Calendar Tab', () => {
    test('shows placeholder with link to full calendar', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/schedule`);
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /calendar/i }).click();
      await page.waitForTimeout(1000);

      const calendarLink = page.getByRole('link', { name: /open full calendar/i });
      await expect(calendarLink).toBeVisible();
    });
  });

  test.describe('Study Flow', () => {
    test('can start and complete a schedule entry', async ({ page, request, projectConfig, cleanup }) => {
      const today = new Date().toISOString().slice(0, 10);
      const entryRes = await request.post(`${projectConfig.apiUrl}/api/v1/schedule/entries`, {
        data: {
          date: today,
          startTime: '08:00',
          endTime: '09:00',
          title: 'E2E Test Study Session',
          type: 'STUDY',
        },
      });
      expect(entryRes.ok()).toBeTruthy();
      const entryBody = await entryRes.json();
      const entryId = entryBody.data?.entry?.id;
      if (entryId) {
        cleanup.track({
          type: 'schedule-entry',
          id: entryId,
          name: 'E2E Test Study Session',
          deleteVia: 'api',
          deletePath: `${projectConfig.apiUrl}/api/v1/schedule/entries/${entryId}`,
          project: 'studytab',
          createdAt: new Date(),
        });
      }

      await page.goto(`${projectConfig.baseUrl}/schedule`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const entryCard = page.getByText('E2E Test Study Session').first();
      await expect(entryCard).toBeVisible({ timeout: 5000 });

      const startButton = page.getByRole('button', { name: /start/i }).first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(1000);

        const activeIndicator = page.getByText(/in progress/i).first();
        const sessionPanel = page.getByRole('button', { name: /complete session/i }).first();

        const isActive = await activeIndicator.isVisible().catch(() => false);
        const panelVisible = await sessionPanel.isVisible().catch(() => false);
        expect(isActive || panelVisible).toBeTruthy();

        if (panelVisible) {
          await sessionPanel.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test('can skip a schedule entry', async ({ page, request, projectConfig, cleanup }) => {
      const today = new Date().toISOString().slice(0, 10);
      const entryRes = await request.post(`${projectConfig.apiUrl}/api/v1/schedule/entries`, {
        data: {
          date: today,
          startTime: '14:00',
          endTime: '15:00',
          title: 'E2E Skip Test Session',
          type: 'STUDY',
        },
      });
      expect(entryRes.ok()).toBeTruthy();
      const entryBody = await entryRes.json();
      const entryId = entryBody.data?.entry?.id;
      if (entryId) {
        cleanup.track({
          type: 'schedule-entry',
          id: entryId,
          name: 'E2E Skip Test Session',
          deleteVia: 'api',
          deletePath: `${projectConfig.apiUrl}/api/v1/schedule/entries/${entryId}`,
          project: 'studytab',
          createdAt: new Date(),
        });
      }

      await page.goto(`${projectConfig.baseUrl}/schedule`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const entryCard = page.getByText('E2E Skip Test Session').first();
      await expect(entryCard).toBeVisible({ timeout: 5000 });

      // Use the skip API directly since the SkipForward button has no accessible name
      const skipRes = await request.post(`${projectConfig.apiUrl}/api/v1/schedule/entries/${entryId}/skip`);
      expect(skipRes.ok()).toBeTruthy();

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const skippedIndicator = page.getByText(/skipped/i).first();
      await expect(skippedIndicator).toBeVisible({ timeout: 3000 });
    });
  });
});
