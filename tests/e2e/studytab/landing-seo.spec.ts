import { test, expect } from '@playwright/test';
import { getProjectEnv } from '../../../config/projects';

const config = getProjectEnv('studytab', process.env.ENV || 'local');

test.describe('Landing Page & SEO @studytab @e2e @seo', () => {
  test('landing page should load without auth', async ({ page }) => {
    await page.goto(config.baseUrl);

    await expect(page).toHaveTitle(/StudyTab/i);
    await expect(
      page.getByText(/AI|Learning|Study/i).first(),
    ).toBeVisible();
  });

  test('should have Open Graph meta tags', async ({ page }) => {
    await page.goto(config.baseUrl);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', /.+/);

    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'website');
  });

  test('should have Twitter Card meta tags', async ({ page }) => {
    await page.goto(config.baseUrl);

    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto(config.baseUrl);

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#6C5CE7');
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    await page.goto(config.baseUrl);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toBeAttached();

    const raw = await jsonLd.textContent();
    expect(raw).toBeTruthy();

    const data = JSON.parse(raw!);
    expect(data['@type']).toBe('WebApplication');
    expect(data.name).toBe('StudyTab');
  });

  test('robots.txt should be accessible', async ({ request }) => {
    const response = await request.get(`${config.baseUrl}/robots.txt`);

    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('Sitemap');
  });

  test('sitemap.xml should be accessible', async ({ request }) => {
    const response = await request.get(`${config.baseUrl}/sitemap.xml`);

    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('<urlset');
  });

  test('404 page should show for invalid routes', async ({ page }) => {
    await page.goto(`${config.baseUrl}/this-page-does-not-exist-12345`);

    await expect(
      page.getByText(/404|not found/i).first(),
    ).toBeVisible();

    // Should have a link/button to go back to dashboard
    const homeLink = page.getByRole('link', { name: /dashboard|home|go back/i })
      .or(page.getByRole('button', { name: /dashboard|home|go back/i }));
    await expect(homeLink.first()).toBeVisible();
  });
});
