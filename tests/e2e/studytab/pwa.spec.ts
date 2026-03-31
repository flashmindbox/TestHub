import { test, expect } from '../../../src/fixtures';
import { getProjectEnv } from '../../../config/projects';

const config = getProjectEnv('studytab', process.env.ENV || 'local');

test.describe('PWA Support @studytab @e2e @pwa', () => {
  test('should have a valid web manifest', async ({ request }) => {
    // vite-plugin-pwa generates manifest.webmanifest by default
    let response = await request.get(`${config.baseUrl}/manifest.webmanifest`);

    if (response.status() === 404) {
      response = await request.get(`${config.baseUrl}/manifest.json`);
    }

    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toContain('StudyTab');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.theme_color).toBe('#6C5CE7');
  });

  test.describe('Service Worker (authenticated)', () => {
    test.use({ storageState: '.auth/user.json' });

    test('should have service worker registration', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Service worker may take a moment to register — wait up to 5 seconds
      const swRegistered = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false;

        const controller = navigator.serviceWorker.controller;
        if (controller) return true;

        // Wait for the service worker to become ready
        try {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]);
          return true;
        } catch {
          return false;
        }
      });

      expect(swRegistered).toBe(true);
    });
  });

  test('manifest link should be in HTML head', async ({ page }) => {
    await page.goto(config.baseUrl);

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();
    await expect(manifestLink).toHaveAttribute('href', /.+/);
  });
});
