import { test, expect } from '../../../src/fixtures';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - WCAG 2.1 AA @studytab @a11y', () => {
  test.use({ storageState: '.auth/user.json' });

  test('login page should have no accessibility violations', async ({ page, projectConfig }) => {
    // Use fresh context for login page
    const context = await page.context().browser()!.newContext();
    const freshPage = await context.newPage();

    await freshPage.goto(`${projectConfig.baseUrl}/auth/login`);
    await freshPage.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: freshPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);

    await context.close();
  });

  test('dashboard should have no accessibility violations', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Dashboard a11y violations:', JSON.stringify(results.violations, null, 2));
    }

    expect(results.violations).toEqual([]);
  });

  test('decks page should have no accessibility violations', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/decks`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('settings page should have no accessibility violations', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/settings`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Tab through focusable elements
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });

    expect(focusedElement).not.toBeNull();
    expect(focusedElement).not.toBe('BODY');
  });

  test('should have proper focus indicators', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Tab to a focusable element
    await page.keyboard.press('Tab');

    // Check for visible focus indicator
    const focusedElement = page.locator(':focus');
    const outline = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        border: styles.border,
      };
    });

    // Should have some form of visible focus indicator
    const hasFocusIndicator =
      outline.outline !== 'none' ||
      outline.boxShadow !== 'none' ||
      outline.border.includes('px');

    expect(hasFocusIndicator).toBeTruthy();
  });

  test('images should have alt text', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text OR be marked as decorative
      const hasAlt = alt !== null && alt !== '';
      const isDecorative = role === 'presentation' || alt === '';

      expect(hasAlt || isDecorative).toBeTruthy();
    }
  });

  test('form inputs should have labels', async ({ page, projectConfig }) => {
    // Use fresh context for login page (has forms)
    const context = await page.context().browser()!.newContext();
    const freshPage = await context.newPage();

    await freshPage.goto(`${projectConfig.baseUrl}/auth/login`);
    await freshPage.waitForLoadState('networkidle');

    const inputs = await freshPage.locator('input:not([type="hidden"]):not([type="submit"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Check for associated label
      let hasLabel = false;
      if (id) {
        const label = freshPage.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      // Input should have some form of accessible name
      const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
      expect(hasAccessibleName).toBeTruthy();
    }

    await context.close();
  });
});
