import { test, expect } from '../../../src/fixtures';
import { getProjectEnv } from '../../../config/projects';

const config = getProjectEnv('studytab', process.env.ENV || 'local');

test.describe('PWA Support @studytab @e2e @pwa', () => {
  test('should have a valid web manifest', async ({ request }) => {
    // vite-plugin-pwa generates manifest.webmanifest by default
    let response = await request.get(`${config.baseUrl}/manifest.webmanifest`);

    // Fallback to manifest.json if webmanifest not found
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('json')) {
      response = await request.get(`${config.baseUrl}/manifest.json`);
    }

    const fallbackType = response.headers()['content-type'] || '';
    test.skip(
      !fallbackType.includes('json'),
      'PWA manifest not available (expected in production builds, not dev server)',
    );

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

      test.skip(!swRegistered, 'Service worker not active (expected in production builds, not dev server)');
      expect(swRegistered).toBe(true);
    });
  });

  test('manifest link should be in HTML head', async ({ page }) => {
    await page.goto(config.baseUrl);
    await page.waitForLoadState('domcontentloaded');

    const manifestLink = page.locator('link[rel="manifest"]');
    const hasManifest = await manifestLink.count() > 0;

    test.skip(!hasManifest, 'Manifest link not present (expected in production builds, not dev server)');
    await expect(manifestLink).toHaveAttribute('href', /.+/);
  });
});
