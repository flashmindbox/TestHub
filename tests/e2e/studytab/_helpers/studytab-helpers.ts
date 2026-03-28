/**
 * StudyTab E2E Test Helpers
 * Migrated from studytab/e2e/fixtures/test-setup.ts
 *
 * Usage: import { SELECTORS, goToTestDeck, ... } from '../_helpers/studytab-helpers';
 * Auth is handled by TestHub's storageState — no authenticatedPage fixture needed.
 */

import { Page } from '@playwright/test';

// ─── Selectors ───────────────────────────────────────────────────────────────

export const SELECTORS = {
  nav: {
    dashboard: 'link:has-text("Dashboard")',
    decks: 'link:has-text("Decks")',
    tools: 'link:has-text("Tools")',
    stats: 'link:has-text("Stats")',
  },

  decks: {
    newDeckButton: 'button:has-text("New Deck")',
    deckLink: 'a[href^="/decks/"]',
    studyButton: '[data-testid="study-button"]',
    deckEdit: '[data-testid="deck-edit"]',
    deckDelete: '[data-testid="deck-delete"]',
  },

  deckDetail: {
    studyButton: 'button:has-text("Study")',
    addCardButton: 'button:has-text("Add Card")',
    generateAiButton: 'button:has-text("Generate with AI")',
    filterDropdown: 'combobox >> nth=0',
    sortDropdown: 'combobox >> nth=1',
    cardItem: 'generic:has(paragraph)',
    suspendedBadge: 'text=Suspended',
    viewCardButton: 'button:has-text("View card")',
    editCardButton: 'button:has-text("Edit card")',
    deleteCardButton: 'button:has-text("Delete card")',
  },

  wizard: {
    container: '[data-testid="study-wizard"]',
    progress: 'text=/\\d+\\/\\d+/',
    modeToggle: '[data-testid="study-mode-trigger"]',
    cardOptions: 'button[title="Card options"]',
    showAnswer: '[data-testid="show-answer"]',
    hint: '[data-testid="hint-button"]',
    skip: '[data-testid="skip-button"]',
    next: '[data-testid="next-button"]',
    again: '[data-testid="rating-again"]',
    hard: '[data-testid="rating-hard"]',
    good: '[data-testid="rating-good"]',
    easy: '[data-testid="rating-easy"]',
  },

  cardOptionsMenu: {
    editNow: '[role="menuitem"]:has-text("Edit Now")',
    editLater: '[role="menuitem"]:has-text("Edit Later")',
    suspend1Hour: '[role="menuitem"]:has-text("Suspend 1 hour")',
    suspend1Day: '[role="menuitem"]:has-text("Suspend 1 day")',
    suspend1Week: '[role="menuitem"]:has-text("Suspend 1 week")',
    suspendPermanently: '[role="menuitem"]:has-text("Suspend Permanently")',
  },

  studyModes: {
    dueFirst: '[data-testid="mode-spaced-repetition"]',
    mixAll: '[data-testid="mode-random"]',
    newCardsOnly: '[data-testid="mode-new-only"]',
    quickRevise: '[data-testid="mode-review-all"]',
  },

  settings: {
    dailyGoalSlider: 'slider',
    themeLight: 'button:has-text("Light")',
    themeDark: 'button:has-text("Dark")',
  },

  toast: '[data-sonner-toast], [role="alert"]',
};

// ─── Navigation Helpers ──────────────────────────────────────────────────────

export async function goToTestDeck(page: Page): Promise<string | null> {
  await page.goto('/decks');
  await page.waitForSelector('h1', { timeout: 10000 });

  const deckLink = page.locator('a[href^="/decks/c"]').first();
  if (await deckLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    const href = await deckLink.getAttribute('href');
    await deckLink.click();
    await page.waitForSelector('h1', { timeout: 10000 });
    return href?.split('/decks/')[1] || null;
  }

  return null;
}

export async function goToSecondaryDeck(page: Page): Promise<string | null> {
  await page.goto('/decks');
  await page.waitForSelector('h1', { timeout: 10000 });

  const deckLinks = page.locator('a[href^="/decks/c"]');
  const count = await deckLinks.count();
  if (count >= 2) {
    const href = await deckLinks.nth(1).getAttribute('href');
    await deckLinks.nth(1).click();
    await page.waitForSelector('h1', { timeout: 10000 });
    return href?.split('/decks/')[1] || null;
  }

  return null;
}

export async function hasMultipleDecks(page: Page): Promise<boolean> {
  await page.goto('/decks');
  await page.waitForSelector('h1', { timeout: 10000 });
  const count = await page.locator('a[href^="/decks/c"]').count();
  return count >= 2;
}

// ─── Study Wizard Helpers ────────────────────────────────────────────────────

export async function selectQuickReviseMode(page: Page): Promise<boolean> {
  const alreadyQuickRevise = page.locator('button:has-text("Quick Revise")').first();
  if (await alreadyQuickRevise.isVisible({ timeout: 500 }).catch(() => false)) {
    const buttonText = await alreadyQuickRevise.textContent();
    if (buttonText?.includes('Quick Revise')) return true;
  }

  const studyButtonContainer = page.locator('div:has(> button:has-text("Study"))').first();
  const chevronButton = studyButtonContainer.locator('button:has(svg)').last();

  if (await chevronButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    const isDisabled = await chevronButton.isDisabled().catch(() => true);
    if (!isDisabled) {
      await chevronButton.click();
      await page.waitForTimeout(300);
      const quickReviseOption = page
        .locator('[role="menuitem"]:has-text("Quick Revise"), button:has-text("Quick Revise")')
        .first();
      if (await quickReviseOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await quickReviseOption.click();
        await page.waitForTimeout(300);
        return true;
      }
    }
  }

  const modeToggle = page
    .locator('button:has-text("Due First"), button:has-text("Mix All"), button:has-text("New Cards")')
    .first();
  if (await modeToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    await modeToggle.click();
    await page.waitForTimeout(300);
    const quickReviseOption = page.locator('[role="menuitem"]:has-text("Quick Revise")').first();
    if (await quickReviseOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await quickReviseOption.click();
      await page.waitForTimeout(300);
      return true;
    }
    await page.keyboard.press('Escape');
  }

  return false;
}

export async function switchToFullSession(page: Page) {
  await page.click(SELECTORS.wizard.modeToggle);
  await page.waitForTimeout(200);
  await page.click(SELECTORS.studyModes.dueFirst);
  await page.waitForTimeout(300);
}

export async function openStudyWizard(page: Page) {
  await page.click(SELECTORS.deckDetail.studyButton);
  await page.waitForSelector(SELECTORS.wizard.showAnswer, { timeout: 5000 });
}

export async function closeStudyWizard(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

export async function revealAndRate(
  page: Page,
  rating: 'again' | 'hard' | 'good' | 'easy' = 'good'
) {
  await page.click(SELECTORS.wizard.showAnswer);
  await page.waitForTimeout(200);
  await page.click(SELECTORS.wizard[rating]);
  await page.waitForTimeout(200);
}

export async function openWizardWithCards(page: Page): Promise<boolean> {
  const studyButton = page.locator(SELECTORS.deckDetail.studyButton).first();
  if (await studyButton.isDisabled().catch(() => true)) return false;

  await studyButton.click();
  await page.waitForTimeout(500);

  let hasCards = await page
    .locator(SELECTORS.wizard.showAnswer)
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (!hasCards) {
    const modeToggle = page.locator(SELECTORS.wizard.modeToggle).first();
    if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modeToggle.click();
      await page.waitForTimeout(200);
      const quickReviseOption = page
        .locator('[role="menuitem"]:has-text("Quick Revise"), button:has-text("Quick Revise")')
        .first();
      if (await quickReviseOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await quickReviseOption.click();
        await page.waitForTimeout(500);
      }
    }
    hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
  }

  return hasCards;
}

// ─── Data Creation Helpers ───────────────────────────────────────────────────

export async function createTestDeck(page: Page, name: string = `Test Deck ${Date.now()}`) {
  await page.goto('/decks');
  await page.click(SELECTORS.decks.newDeckButton);
  await page.waitForSelector('[role="dialog"]');
  await page.fill('input[name="name"]', name);
  await page.click('button:has-text("Create")');
  await page.waitForSelector(`text=${name}`);
  return name;
}

export async function addBasicCard(page: Page, front: string, back: string) {
  await page.click(SELECTORS.deckDetail.addCardButton);
  await page.waitForSelector('[role="dialog"]');
  await page.fill('textarea >> nth=0', front);
  await page.fill('textarea >> nth=1', back);
  await page.click('button:has-text("Save")');
  await page.waitForSelector(`text=${front}`, { timeout: 5000 });
}
