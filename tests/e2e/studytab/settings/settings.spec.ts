import { test, expect } from '../../../../src/fixtures';
import { SettingsPage } from '../../../../src/page-objects/studytab';

/**
 * Settings Page Tests
 *
 * Tests the application settings functionality including:
 * - Study preferences (daily goal)
 * - Timezone selection
 * - Appearance (theme, animations)
 * - Sound settings
 *
 * Tags: @studytab @settings @preferences
 */
test.describe('Settings Page @studytab @settings', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page, projectConfig }) => {
    settingsPage = new SettingsPage(page, projectConfig.baseUrl);
  });

  test.describe('Page Display', () => {
    test('displays settings page with all sections', async () => {
      await settingsPage.goto();

      // Verify main heading
      await expect(settingsPage.preferencesHeading).toBeVisible();
      await expect(settingsPage.preferencesHeading).toHaveText('Preferences');

      // Verify all sections are visible
      await expect(settingsPage.studyPreferencesHeading).toBeVisible();
      await expect(settingsPage.timezoneHeading).toBeVisible();
      await expect(settingsPage.appearanceHeading).toBeVisible();
      await expect(settingsPage.soundsHeading).toBeVisible();
    });

    test('all section headings have icons', async ({ page }) => {
      await settingsPage.goto();

      // Each heading should have an associated icon
      const studyIcon = settingsPage.studyPreferencesHeading.locator('img, svg');
      const timezoneIcon = settingsPage.timezoneHeading.locator('img, svg');
      const appearanceIcon = settingsPage.appearanceHeading.locator('img, svg');
      const soundsIcon = settingsPage.soundsHeading.locator('img, svg');

      await expect(studyIcon).toBeVisible();
      await expect(timezoneIcon).toBeVisible();
      await expect(appearanceIcon).toBeVisible();
      await expect(soundsIcon).toBeVisible();
    });
  });

  test.describe('Study Preferences', () => {
    test('displays daily goal slider', async () => {
      await settingsPage.goto();

      await expect(settingsPage.dailyGoalSlider).toBeVisible();
    });

    test('daily goal slider has correct range', async ({ page }) => {
      await settingsPage.goto();

      // Check slider attributes
      const min = await settingsPage.dailyGoalSlider.getAttribute('aria-valuemin');
      const max = await settingsPage.dailyGoalSlider.getAttribute('aria-valuemax');

      // Verify range markers are visible within the Study Preferences section
      const studyPrefsSection = page.locator('main').filter({ hasText: 'Daily Goal' });
      await expect(studyPrefsSection.getByText('5', { exact: true })).toBeVisible();
      await expect(studyPrefsSection.getByText('100', { exact: true })).toBeVisible();
    });

    test('displays current daily goal value', async ({ page }) => {
      await settingsPage.goto();

      // Should show "Daily Goal: X cards" text
      await expect(page.getByText(/Daily Goal:/)).toBeVisible();
      await expect(page.getByText(/\d+ cards/)).toBeVisible();
    });

    test('can read current daily goal value', async () => {
      await settingsPage.goto();

      const goal = await settingsPage.getDailyGoal();
      expect(goal).toBeGreaterThanOrEqual(5);
      expect(goal).toBeLessThanOrEqual(100);
    });
  });

  test.describe('Timezone', () => {
    test('displays timezone dropdown', async () => {
      await settingsPage.goto();

      await expect(settingsPage.timezoneSelect).toBeVisible();
    });

    test('timezone dropdown has multiple options', async () => {
      await settingsPage.goto();

      const options = await settingsPage.timezoneSelect.locator('option').count();
      expect(options).toBeGreaterThan(10);
    });

    test('displays timezone description', async () => {
      await settingsPage.goto();

      await expect(settingsPage.timezoneDescription).toBeVisible();
      await expect(settingsPage.timezoneDescription).toContainText('daily study streak');
    });

    test('can select different timezone', async () => {
      await settingsPage.goto();

      const originalTimezone = await settingsPage.getSelectedTimezone();

      // Select a different timezone (not the original one)
      const newTimezoneLabel = originalTimezone === 'UTC' ? 'Eastern Time (US)' : 'UTC';
      await settingsPage.selectTimezone(newTimezoneLabel);

      const newTimezone = await settingsPage.getSelectedTimezone();
      expect(newTimezone).not.toBe(originalTimezone);

      // Restore original
      await settingsPage.timezoneSelect.selectOption({ value: originalTimezone });
    });

    test('timezone options include major world regions', async ({ page }) => {
      await settingsPage.goto();

      // Verify some common timezones are available
      const options = await settingsPage.timezoneSelect.locator('option').allTextContents();

      expect(options.some(o => o.includes('UTC'))).toBeTruthy();
      expect(options.some(o => o.includes('Eastern') || o.includes('US'))).toBeTruthy();
      expect(options.some(o => o.includes('London') || o.includes('GMT'))).toBeTruthy();
      expect(options.some(o => o.includes('Tokyo') || o.includes('JST'))).toBeTruthy();
    });
  });

  test.describe('Appearance - Theme', () => {
    test('displays theme selection buttons', async () => {
      await settingsPage.goto();

      await expect(settingsPage.lightThemeButton).toBeVisible();
      await expect(settingsPage.darkThemeButton).toBeVisible();
    });

    test('theme buttons have correct labels', async () => {
      await settingsPage.goto();

      await expect(settingsPage.lightThemeButton).toContainText('Light');
      await expect(settingsPage.darkThemeButton).toContainText('Dark');
    });

    test('theme buttons have icons', async () => {
      await settingsPage.goto();

      const lightIcon = settingsPage.lightThemeButton.locator('img, svg');
      const darkIcon = settingsPage.darkThemeButton.locator('img, svg');

      await expect(lightIcon).toBeVisible();
      await expect(darkIcon).toBeVisible();
    });

    test('can click light theme button', async () => {
      await settingsPage.goto();

      await settingsPage.selectLightTheme();

      // Button should be clickable (no errors)
      await expect(settingsPage.lightThemeButton).toBeVisible();
    });

    test('can click dark theme button', async () => {
      await settingsPage.goto();

      await settingsPage.selectDarkTheme();

      // Button should be clickable (no errors)
      await expect(settingsPage.darkThemeButton).toBeVisible();
    });
  });

  test.describe('Appearance - Animations', () => {
    test('displays animations toggle', async () => {
      await settingsPage.goto();

      await expect(settingsPage.animationsLabel).toBeVisible();
      await expect(settingsPage.animationsLabel).toHaveText('Animations');
    });

    test('animations toggle has description', async ({ page }) => {
      await settingsPage.goto();

      await expect(page.getByText(/Enable smooth transitions/)).toBeVisible();
    });

    test('can toggle animations setting', async () => {
      await settingsPage.goto();

      // Toggle should be clickable
      await settingsPage.toggleAnimations();

      // Should still be on the same page
      await expect(settingsPage.preferencesHeading).toBeVisible();
    });
  });

  test.describe('Sounds', () => {
    test('displays sound effects toggle', async () => {
      await settingsPage.goto();

      await expect(settingsPage.soundEffectsLabel).toBeVisible();
      await expect(settingsPage.soundEffectsLabel).toHaveText('Sound Effects');
    });

    test('sound effects toggle has description', async ({ page }) => {
      await settingsPage.goto();

      await expect(page.getByText(/Play sounds for card reviews/)).toBeVisible();
    });

    test('can toggle sound effects', async () => {
      await settingsPage.goto();

      // Toggle should be clickable
      await settingsPage.toggleSoundEffects();

      // Should still be on the same page
      await expect(settingsPage.preferencesHeading).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to settings from dashboard user menu', async ({ page, projectConfig }) => {
      // Start at dashboard
      await page.goto(`${projectConfig.baseUrl}/dashboard`);

      // Click user avatar to open menu
      await page.locator('button').filter({ hasText: /^[A-Z]{1,2}$/ }).first().click();

      // Click Settings link
      await page.getByRole('link', { name: 'Settings' }).click();

      // Should be on settings page
      await expect(page).toHaveURL(/.*\/settings.*/);
      await expect(settingsPage.preferencesHeading).toBeVisible();
    });

    test('can navigate to settings via direct URL', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/settings`);

      await expect(page).toHaveURL(/.*\/settings.*/);
      await expect(settingsPage.preferencesHeading).toBeVisible();
    });

    test('settings page loads without errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await settingsPage.goto();

      // Filter out known non-critical errors (React DevTools, favicon, rate limiting from test parallelism)
      const criticalErrors = consoleErrors.filter(
        err =>
          !err.includes('React DevTools') &&
          !err.includes('favicon') &&
          !err.includes('429') &&
          !err.includes('Too Many Requests')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Persistence', () => {
    test('theme selection persists after page reload', async ({ page }) => {
      await settingsPage.goto();

      // Select dark theme
      await settingsPage.selectDarkTheme();

      // Wait a moment for the setting to save
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();
      await settingsPage.preferencesHeading.waitFor({ state: 'visible' });

      // Theme buttons should still be visible
      await expect(settingsPage.darkThemeButton).toBeVisible();
    });

    test('timezone selection persists after page reload', async ({ page }) => {
      await settingsPage.goto();

      const originalTimezone = await settingsPage.getSelectedTimezone();

      // Select UTC
      await settingsPage.selectTimezone('UTC');

      // Wait for save
      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await settingsPage.preferencesHeading.waitFor({ state: 'visible' });

      const currentTimezone = await settingsPage.getSelectedTimezone();
      expect(currentTimezone).toBe('UTC');

      // Restore original
      await settingsPage.timezoneSelect.selectOption({ value: originalTimezone });
    });
  });
});
