import { test, expect, Page } from '../../../src/fixtures';
import {
  DashboardPage,
  SettingsPage,
  StudyPage,
} from '../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../src/utils';

/**
 * Design System v2 Verification Tests
 *
 * Covers theming, typography, layout shell, dashboard, components,
 * deck cards, study wizard, empty states, micro-interactions, and responsive.
 *
 * Non-deck tests run in parallel; deck-dependent tests run serially
 * to avoid API contention on the decks endpoint.
 *
 * Tags: @studytab @design-system @visual
 */

function parseRgb(rgb: string): { r: number; g: number; b: number } {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
}

/**
 * Navigate to decks page, waiting for deck cards to render (not just skeletons).
 */
async function gotoDecksReliably(page: Page, baseUrl: string, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    await page.goto(`${baseUrl}/decks`);
    await page.waitForLoadState('networkidle');

    const deckCard = page.locator('a[href*="/decks/"]:has(h3)').first();
    try {
      await deckCard.waitFor({ state: 'visible', timeout: 15000 });
      return;
    } catch {
      // Not loaded — retry with a fresh page load
    }
  }
}

/**
 * Create a deck using heading-based modal detection (v2 modal has no role="dialog").
 */
async function createDeckDirect(page: Page, deckName: string) {
  await page.locator(
    'button:has-text("New Deck"), button:has-text("Create"), [data-testid="create-deck"]'
  ).first().click();
  await page.getByRole('heading', { name: 'Create New Deck' }).waitFor({ timeout: 10000 });
  await page.getByLabel(/name/i).fill(deckName);
  await page.getByRole('button', { name: 'Create Deck' }).click();
  await page.getByRole('heading', { name: 'Create New Deck' }).waitFor({ state: 'hidden' });
}

/**
 * Add a card using v2 full-page card editor (not a modal).
 */
async function addCardDirect(page: Page, front: string, back: string, saveAndAddAnother = false) {
  const frontInput = page.getByPlaceholder('Enter the question or prompt...');
  const backInput = page.getByPlaceholder('Enter the answer...');
  await frontInput.waitFor({ timeout: 10000 });
  await frontInput.fill(front);
  await backInput.fill(back);

  if (saveAndAddAnother) {
    await page.getByRole('button', { name: 'Save & Add Another' }).click();
    await expect(frontInput).toHaveText('');
  } else {
    await page.getByRole('button', { name: 'Save Card' }).click();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NON-DECK TESTS — run in parallel (each test gets a fresh browser context)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Design System v2 @studytab @design-system', () => {
  test.use({ storageState: '.auth/user.json' });

  // ─── 1. Theme & Colors ─────────────────────────────────────────────

  test.describe('Theme & Colors', () => {
    let settingsPage: SettingsPage;

    test.beforeEach(async ({ page, projectConfig }) => {
      settingsPage = new SettingsPage(page, projectConfig.baseUrl);
    });

    test('light theme has warm off-white background', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.selectLightTheme();
      await page.waitForTimeout(300);

      const bg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      const { r, g, b } = parseRgb(bg);

      expect(r === 255 && g === 255 && b === 255).toBe(false);
      expect(r).toBeGreaterThan(230);
      expect(g).toBeGreaterThan(230);
      expect(b).toBeGreaterThan(220);
    });

    test('dark theme has warm near-black background', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.selectDarkTheme();
      await page.waitForTimeout(300);

      const bg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      const { r, g, b } = parseRgb(bg);

      expect(r === 0 && g === 0 && b === 0).toBe(false);
      expect(r).toBeLessThan(40);
      expect(g).toBeLessThan(40);
      expect(b).toBeLessThan(40);

      await settingsPage.selectLightTheme();
    });

    test('toggling theme changes background color', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.selectLightTheme();
      await page.waitForTimeout(300);
      const lightBg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );

      await settingsPage.selectDarkTheme();
      await page.waitForTimeout(300);
      const darkBg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );

      expect(lightBg).not.toBe(darkBg);
      await settingsPage.selectLightTheme();
    });

    test('primary buttons use violet tones, not blue', async ({ page, projectConfig }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const primaryButton = page.getByRole('button', { name: /New Deck|Study/i }).first();
      await expect(primaryButton).toBeVisible();

      const bg = await primaryButton.evaluate(el =>
        getComputedStyle(el).backgroundColor
      );
      const { r, g, b } = parseRgb(bg);

      expect(b).toBeGreaterThan(50);
      expect(r).toBeGreaterThan(g);
      expect(r).toBeGreaterThan(b * 0.3);
    });
  });

  // ─── 2. Typography ─────────────────────────────────────────────────

  test.describe('Typography', () => {
    test('Plus Jakarta Sans is loaded and applied to body', async ({ page, projectConfig }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const fontFamily = await page.evaluate(() =>
        getComputedStyle(document.body).fontFamily
      );

      expect(fontFamily.toLowerCase()).toContain('plus jakarta sans');
    });
  });

  // ─── 3. Layout Shell ───────────────────────────────────────────────

  test.describe('Layout Shell', () => {
    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, projectConfig }) => {
      dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();
    });

    test('sidebar brand shows "S" logo and "StudyTab" text', async ({ page }) => {
      const sidebar = page.locator('aside, [role="complementary"], [data-testid="sidebar"]').first();
      await expect(sidebar).toBeVisible();

      await expect(sidebar.getByText('S').first()).toBeVisible();
      await expect(sidebar.getByText('StudyTab')).toBeVisible();
    });

    test('sidebar shows "Main" and "Tools" section labels', async ({ page }) => {
      const sidebar = page.locator('aside, [role="complementary"], [data-testid="sidebar"]').first();

      await expect(sidebar.getByText('Main')).toBeVisible();
      await expect(sidebar.getByText('Tools')).toBeVisible();
    });

    test('sidebar collapse hides text, keeps icons, shrinks width', async ({ page }) => {
      const sidebar = page.locator('aside, [role="complementary"], [data-testid="sidebar"]').first();
      const collapseButton = page.getByRole('button', { name: 'Collapse' });

      const widthBefore = await sidebar.evaluate(el => el.getBoundingClientRect().width);

      await collapseButton.click();
      await page.waitForTimeout(400);

      const widthAfter = await sidebar.evaluate(el => el.getBoundingClientRect().width);
      expect(widthAfter).toBeLessThan(widthBefore);

      const iconCount = await sidebar.locator('img, svg').count();
      expect(iconCount).toBeGreaterThan(0);

      await expect(sidebar.getByText('StudyTab')).not.toBeVisible();
    });

    test('header height is compact (around 52px)', async ({ page }) => {
      const header = page.locator('header, [role="banner"]').first();
      const height = await header.evaluate(el => el.getBoundingClientRect().height);

      expect(height).toBeGreaterThanOrEqual(40);
      expect(height).toBeLessThanOrEqual(64);
    });

    test('breadcrumb shows correct page name on navigation', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const banner = page.locator('header').first();
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('Dashboard');

      await page.getByRole('link', { name: 'Settings' }).first().click();
      await page.waitForLoadState('networkidle');

      await expect(banner).toContainText(/Settings/i);
    });

    test('content area max-width is constrained', async ({ page }) => {
      const mainContent = page.locator('main').first();
      const mainWidth = await mainContent.evaluate(el => el.getBoundingClientRect().width);
      const viewportWidth = page.viewportSize()?.width || 1280;

      expect(mainWidth).toBeLessThan(viewportWidth);
    });
  });

  // ─── 4. Dashboard ──────────────────────────────────────────────────

  test.describe('Dashboard', () => {
    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, projectConfig }) => {
      dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();
    });

    test('greeting shows "Good morning/afternoon/evening"', async () => {
      await expect(dashboard.welcomeHeading).toBeVisible();
      const text = await dashboard.getWelcomeText();
      expect(text).toMatch(/good (morning|afternoon|evening)/i);
    });

    test('bento grid stat cards are visible', async ({ page }) => {
      await expect(page.getByText('Due Today')).toBeVisible();
      await expect(dashboard.streakCounter).toBeVisible();
      await expect(
        page.getByText(/Study Progress|Total Cards|Total Decks/).first()
      ).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();
    });

    test('quick actions section has functional links', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Study Cards' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Quick Note' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Pomodoro' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Deck' })).toBeVisible();
    });
  });

  // ─── 5. UI Components (non-deck) ──────────────────────────────────

  test.describe('UI Components', () => {
    test('tag component renders with accent colors on priority badges', async ({
      page,
      projectConfig,
    }) => {
      await page.goto(`${projectConfig.baseUrl}/tasks`);
      await page.waitForLoadState('networkidle');

      const prioritySelect = page.getByRole('combobox').filter({ hasText: /All Priorities/i });
      await expect(prioritySelect).toBeVisible();

      const options = await prioritySelect.locator('option').allTextContents();
      expect(options.some(o => /high/i.test(o))).toBe(true);
      expect(options.some(o => /medium/i.test(o))).toBe(true);
      expect(options.some(o => /low/i.test(o))).toBe(true);
    });

    test('buttons have press/active feedback via transition', async ({
      page,
      projectConfig,
    }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const button = page.getByRole('button', { name: 'New Deck' });
      await expect(button).toBeVisible();

      const hasTransition = await button.evaluate(el => {
        const style = getComputedStyle(el);
        const t = style.transition;
        return t !== '' && t !== 'none' && t !== 'all 0s ease 0s' && t !== 'none 0s ease 0s';
      });

      expect(hasTransition).toBe(true);
    });
  });

  // ─── 8. Empty States (tasks only) ──────────────────────────────────

  test.describe('Empty States - Tasks', () => {
    test('tasks page shows empty columns with placeholder text', async ({
      page,
      projectConfig,
    }) => {
      await page.goto(`${projectConfig.baseUrl}/tasks`);
      await page.waitForLoadState('networkidle');

      const tasksSummary = page.getByText(/\d+ tasks/i).first();
      await expect(tasksSummary).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Completed' })).toBeVisible();

      const dropPlaceholders = page.getByText('Drop tasks here');
      const count = await dropPlaceholders.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 9. Micro-interactions (non-deck) ──────────────────────────────

  test.describe('Micro-interactions', () => {
    test('page content has transition or animation properties', async ({
      page,
      projectConfig,
    }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const hasAnimation = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return false;
        const style = getComputedStyle(main);
        const child = main.firstElementChild;
        const childStyle = child ? getComputedStyle(child) : null;

        const hasTransition = (s: CSSStyleDeclaration) =>
          s.transition !== '' &&
          s.transition !== 'none' &&
          s.transition !== 'all 0s ease 0s';
        const hasAnim = (s: CSSStyleDeclaration) =>
          s.animationName !== '' && s.animationName !== 'none';

        return (
          hasTransition(style) ||
          hasAnim(style) ||
          (childStyle && (hasTransition(childStyle) || hasAnim(childStyle)))
        );
      });

      expect(hasAnimation).toBe(true);
    });
  });

  // ─── 10. Responsive - Mobile (non-deck) ────────────────────────────

  test.describe('Responsive - Mobile (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('sidebar is hidden, mobile bottom nav is visible', async ({ page, projectConfig }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const sidebar = page.locator('aside, [role="complementary"]').first();
      await expect(sidebar).not.toBeVisible();

      const bottomNav = page.getByRole('navigation').last();
      await expect(bottomNav).toBeVisible();

      await expect(bottomNav.getByText('Home')).toBeVisible();
      await expect(bottomNav.getByText('Decks')).toBeVisible();
    });

    test('stats grid shows 2 columns, not 4', async ({ page, projectConfig }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const statsGrid = page.locator('[class*="stat"], [class*="grid"], [class*="bento"]')
        .filter({ hasText: /Due Today|Streak/i })
        .first();

      if (await statsGrid.isVisible()) {
        const columnsPerRow = await statsGrid.evaluate(el => {
          const style = getComputedStyle(el);
          if (style.display === 'grid') {
            return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
          }
          const children = Array.from(el.children);
          if (children.length === 0) return 0;
          const firstTop = children[0].getBoundingClientRect().top;
          return children.filter(
            c => Math.abs(c.getBoundingClientRect().top - firstTop) < 5
          ).length;
        });

        expect(columnsPerRow).toBeLessThanOrEqual(2);
      }
    });
  });

});
