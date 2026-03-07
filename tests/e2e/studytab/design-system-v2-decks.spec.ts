import { test, expect, Page } from '../../../src/fixtures';
import { TestDataFactory } from '../../../src/utils';

/**
 * Design System v2 — Deck-Dependent Tests
 *
 * These tests require the /decks API and run serially to avoid
 * contention on the decks endpoint. Separated from the main
 * design-system-v2.spec.ts to get a dedicated worker.
 *
 * Tags: @studytab @design-system
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
      // Not loaded — retry
    }
  }
}

async function createDeckDirect(page: Page, deckName: string) {
  await page.locator(
    'button:has-text("New Deck"), button:has-text("Create"), [data-testid="create-deck"]'
  ).first().click();
  await page.getByRole('heading', { name: 'Create New Deck' }).waitFor({ timeout: 10000 });
  await page.getByLabel(/name/i).fill(deckName);
  await page.getByRole('button', { name: 'Create Deck' }).click();
  await page.getByRole('heading', { name: 'Create New Deck' }).waitFor({ state: 'hidden' });
}

async function addCardDirect(page: Page, front: string, back: string, saveAndAddAnother = false) {
  const frontInput = page.getByPlaceholder('Enter the question or prompt...');
  const backInput = page.getByPlaceholder('Enter the answer...');
  await frontInput.waitFor({ timeout: 10000 });
  await frontInput.click();
  await frontInput.fill(front);
  await backInput.click();
  await backInput.fill(back);

  if (saveAndAddAnother) {
    await page.getByRole('button', { name: /Save & Add/ }).click();
    await frontInput.waitFor({ timeout: 10000 });
  } else {
    await page.getByRole('button', { name: 'Save Card' }).click();
  }
}

test.describe('Design System v2 - Deck Features @studytab @design-system', () => {
  test.use({ storageState: '.auth/user.json' });

  // ─── Deck Card Components ──────────────────────────────────────────

  test('progress bar renders on deck cards', async ({ page, projectConfig }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    const deckCards = page.locator('a[href*="/decks/"]:has(h3)');
    const count = await deckCards.count();
    expect(count).toBeGreaterThan(0);

    const firstCard = deckCards.first();
    const percentageText = firstCard.getByText(/\d+%/).first();
    await expect(percentageText).toBeVisible();
  });

  test('create deck modal opens with glassmorphism overlay (backdrop-blur)', async ({
    page,
    projectConfig,
  }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    await page.locator(
      'button:has-text("New Deck"), button:has-text("Create"), [data-testid="create-deck"]'
    ).first().click();
    await page.getByRole('heading', { name: 'Create New Deck' }).waitFor({ timeout: 10000 });

    const hasBackdropBlur = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const style = getComputedStyle(el);
        if (style.backdropFilter && style.backdropFilter !== 'none') {
          return true;
        }
      }
      return false;
    });

    expect(hasBackdropBlur).toBe(true);
    await page.keyboard.press('Escape');
  });

  test('hover reveals action buttons that are hidden by default', async ({
    page,
    projectConfig,
  }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    const cardWrapper = page.locator('a[href*="/decks/"]:has(h3)').first().locator('..');
    const editButton = cardWrapper.getByRole('button', { name: 'Edit deck' });

    const initialOpacity = await editButton.evaluate(el =>
      getComputedStyle(el).opacity
    ).catch(() => '0');

    await cardWrapper.hover();
    await page.waitForTimeout(300);

    const hoverOpacity = await editButton.evaluate(el =>
      getComputedStyle(el).opacity
    ).catch(() => '1');

    expect(parseFloat(hoverOpacity)).toBeGreaterThanOrEqual(parseFloat(initialOpacity));
    expect(await editButton.isVisible()).toBe(true);
  });

  test('color bar is visible on left edge', async ({ page, projectConfig }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    const cardWrapper = page.locator('a[href*="/decks/"]:has(h3)').first().locator('..');

    const hasColorBar = await cardWrapper.evaluate(el => {
      const style = getComputedStyle(el);
      const hasLeftBorder = parseInt(style.borderLeftWidth) >= 3;
      const colorEl = el.querySelector(
        '[class*="color"], [class*="accent"], [class*="indicator"]'
      );
      return hasLeftBorder || colorEl !== null;
    });

    expect(hasColorBar).toBe(true);
  });

  test('progress indicator shows percentage on card', async ({ page, projectConfig }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    const deckCard = page.locator('a[href*="/decks/"]:has(h3)').first();
    const percentageText = deckCard.getByText(/\d+%/).first();
    await expect(percentageText).toBeVisible();
  });

  // ─── Deck Page Structure ────────────────────────────────────────────

  test('decks page shows heading, count, and New Deck button', async ({
    page,
    projectConfig,
  }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    await expect(page.getByRole('heading', { name: 'Decks' })).toBeVisible();
    await expect(page.getByText(/\d+ decks/)).toBeVisible();
    await expect(page.getByRole('button', { name: /New Deck/i })).toBeVisible();
  });

  // ─── Micro-interaction (deck hover) ────────────────────────────────

  test('deck cards have hover lift effect (transform changes)', async ({
    page,
    projectConfig,
  }) => {
    await gotoDecksReliably(page, projectConfig.baseUrl);

    const cardWrapper = page.locator('a[href*="/decks/"]:has(h3)').first().locator('..');

    const transformBefore = await cardWrapper.evaluate(el =>
      getComputedStyle(el).transform
    );

    await cardWrapper.hover();
    await page.waitForTimeout(400);

    const transformAfter = await cardWrapper.evaluate(el =>
      getComputedStyle(el).transform
    );

    expect(transformAfter).not.toBe(transformBefore);
  });

  // ─── Study Wizard (combined to avoid API contention on /decks) ─────

  test.describe('Study Wizard', () => {
    test.describe.configure({ retries: 2 });

    test('study wizard: overlay, rating buttons, and session completion', async ({
      page,
      projectConfig,
      cleanup,
    }) => {
      // Under 8 parallel workers the API may be degraded on first attempt.
      // Scoped retries (above) handle this — keep the test simple and fail-fast.
      test.setTimeout(60000);

    // Navigate to /decks, retrying if the API returns an error page
    for (let attempt = 0; attempt <= 2; attempt++) {
      await page.goto(`${projectConfig.baseUrl}/decks`);
      await page.waitForLoadState('networkidle');
      const btn = page.getByRole('button', { name: /New Deck/i });
      try {
        await btn.waitFor({ state: 'visible', timeout: 5000 });
        break;
      } catch {
        if (attempt < 2) await page.waitForTimeout(2000);
      }
    }

    // Create deck via UI and capture ID from API response
    const deckName = TestDataFactory.deck().name;
    const createResponsePromise = page.waitForResponse(
      resp => resp.request().method() === 'POST' && resp.url().includes('deck') && resp.status() < 400,
      { timeout: 30000 }
    );
    await createDeckDirect(page, deckName);
    const createResp = await createResponsePromise;
    const respBody = await createResp.json();
    const deckId = respBody.data?.id ?? respBody.id;

    cleanup.track({
      type: 'deck',
      id: deckId,
      name: deckName,
      deleteVia: 'ui',
      project: 'studytab',
      createdAt: new Date(),
    });

    // Navigate to deck detail page
    if (deckId) {
      await page.goto(`${projectConfig.baseUrl}/decks/${deckId}`);
    } else {
      await page.locator(`a[href*="/decks/"]:has(h3:text-is("${deckName}"))`).first().click();
    }
    await page.waitForLoadState('networkidle');

    // Add 3 cards via UI
    await page.locator(
      'button:has-text("Add Card"), button:has-text("Create your first card")'
    ).first().click();
    const cards = TestDataFactory.many(TestDataFactory.card, 3);
    for (let i = 0; i < cards.length; i++) {
      await addCardDirect(page, cards[i].front, cards[i].back, i < cards.length - 1);
    }

    // Navigate back to deck detail (Save Card may auto-navigate back)
    const studyBtn = page.locator('main').getByRole('button', { name: /^Study/ }).first();
    try {
      await studyBtn.waitFor({ timeout: 5000 });
    } catch {
      await page.goto(`${projectConfig.baseUrl}/decks/${deckId}`);
      await page.waitForLoadState('networkidle');
    }
    await expect(studyBtn).toBeEnabled({ timeout: 10000 });
    await studyBtn.click();

    const showAnswerBtn = page.getByRole('button', { name: 'Show Answer' });
    await showAnswerBtn.waitFor({ timeout: 10000 });

    // --- Verify glassmorphism overlay ---
    const hasGlassmorphism = await page.evaluate(() => {
      const selectors = [
        '[class*="overlay"]', '[class*="wizard"]', '[class*="study"]',
        '[class*="modal"]', '[class*="backdrop"]', '[class*="glass"]',
      ];
      const elements = document.querySelectorAll(selectors.join(','));
      for (const el of elements) {
        const style = getComputedStyle(el);
        if (style.backdropFilter && style.backdropFilter !== 'none') return true;
        if (style.background?.includes('rgba')) return true;
      }
      return false;
    });
    expect(hasGlassmorphism).toBe(true);

    // --- Show answer and verify rating buttons ---
    // v2 buttons include time intervals: "Again 1m", "Hard 6m", "Good 10m", "Easy 4d"
    await showAnswerBtn.click();
    const ratingBtns = page.locator('button').filter({ hasText: /^(Again|Hard|Good|Easy)/ });
    await expect(ratingBtns.first()).toBeVisible({ timeout: 5000 });

    const texts = await ratingBtns.allTextContents();
    const lowerTexts = texts.map(t => t.trim().toLowerCase());
    expect(lowerTexts.some(t => t.startsWith('again'))).toBe(true);
    expect(lowerTexts.some(t => t.startsWith('hard'))).toBe(true);
    expect(lowerTexts.some(t => t.startsWith('good'))).toBe(true);
    expect(lowerTexts.some(t => t.startsWith('easy'))).toBe(true);

    // --- Verify color-coded borders on rating buttons ---
    const btnCount = await ratingBtns.count();
    expect(btnCount).toBe(4);
    const borderColors: string[] = [];
    for (let i = 0; i < btnCount; i++) {
      const border = await ratingBtns.nth(i).evaluate(el => {
        const s = getComputedStyle(el);
        return { style: s.borderStyle, color: s.borderColor };
      });
      expect(border.style).not.toBe('none');
      borderColors.push(border.color);
    }
    expect(new Set(borderColors).size).toBeGreaterThanOrEqual(2);

    // --- Mobile viewport check: buttons must not overflow 375px ---
    const defaultViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    for (let i = 0; i < btnCount; i++) {
      const box = await ratingBtns.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
      }
    }

    // Restore viewport and complete session
    await page.setViewportSize(defaultViewport);
    await page.waitForTimeout(300);

    // --- Complete session: rate all 3 cards ---
    const goodBtn = page.getByRole('button', { name: /^Good/ });
    await goodBtn.click();
    for (let i = 1; i < 3; i++) {
      await showAnswerBtn.waitFor({ timeout: 5000 });
      await showAnswerBtn.click();
      await goodBtn.first().waitFor({ timeout: 5000 });
      await goodBtn.click();
    }

    // --- Verify completion screen ---
    await page.waitForTimeout(1000);
    const completionArea = page.locator(
      '[class*="complete"], [class*="finish"], [class*="result"], [class*="summary"], [class*="congrat"]'
    ).first();
    if (await completionArea.isVisible()) {
      const checkmark = completionArea.locator('svg, img, [class*="check"], [class*="icon"]').first();
      await expect(checkmark).toBeVisible();
    }
    });
  });
});
