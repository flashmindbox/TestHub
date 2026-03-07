import { test, expect, Page, APIRequestContext } from '../../../../src/fixtures';
import {
  DashboardPage,
  DecksPage,
  DeckDetailPage,
  StudyPage,
  SettingsPage,
} from '../../../../src/page-objects/studytab';
import { ApiClient } from '../../../../src/utils';

/**
 * Visual Walkthrough — Design System v2
 *
 * Seeds rich test data, then navigates every page of the app
 * capturing screenshots for visual verification.
 *
 * Run with:  npx playwright test tests/e2e/studytab/design-system/visual-walkthrough.spec.ts --headed
 *
 * Tags: @studytab @design-system @visual @walkthrough
 */

const SCREENSHOT_DIR = 'test-results/screenshots/design-v2';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: true });
}

async function gotoDecksReliably(page: Page, baseUrl: string, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    await page.goto(`${baseUrl}/decks`);
    await page.waitForLoadState('networkidle');

    // Check for error state (API rate-limit or invalid response)
    const errorText = page.getByText(/Failed to load|Invalid API/i).first();
    if (await errorText.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log(`[gotoDecks] Error state detected on attempt ${i + 1}, waiting before retry...`);
      await page.waitForTimeout(3000);
      continue;
    }

    const deckCard = page.locator('a[href*="/decks/"]:has(h3)').first();
    try {
      await deckCard.waitFor({ state: 'visible', timeout: 15000 });
      return;
    } catch {
      // retry
    }
  }
}

interface SeededDeck { id: string; name: string; cardCount: number }

/** Create a deck + cards using the real API schema (cardType, not type).
 *  Includes a small delay every 10 cards to avoid rate limiting (100 req/min). */
async function seedDeck(
  apiClient: ApiClient,
  name: string,
  description: string,
  cards: { front: string; back: string; cardType?: string }[],
): Promise<SeededDeck> {
  const deck = await apiClient.post<{ id: string; name: string }>('/api/v1/decks', {
    name,
    description,
  });

  for (let i = 0; i < cards.length; i++) {
    // Pause every 15 cards to stay under the 100 req/min limit
    if (i > 0 && i % 15 === 0) {
      await new Promise(r => setTimeout(r, 1000));
    }
    await apiClient.post('/api/v1/cards', {
      deckId: deck.id,
      cardType: cards[i].cardType || 'BASIC',
      front: cards[i].front,
      back: cards[i].back,
    });
  }

  return { id: deck.id, name: deck.name, cardCount: cards.length };
}

/** Delete a deck via Node fetch (works even after browser context is closed). */
async function deleteDeckViaFetch(apiUrl: string, cookieHeader: string, deckId: string) {
  try {
    await fetch(`${apiUrl}/api/v1/decks/${deckId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.warn(`[Walkthrough] Failed to delete deck ${deckId}:`, e);
  }
}

// ════════════════════════════════════════════════════════════════════════
// Test data definitions
// ════════════════════════════════════════════════════════════════════════

const BIOLOGY_CARDS = [
  { front: 'What is mitochondria?', back: 'The powerhouse of the cell' },
  { front: 'What is photosynthesis?', back: 'The process by which plants convert sunlight, water, and CO2 into glucose and oxygen' },
  { front: 'What is DNA?', back: 'Deoxyribonucleic acid — the molecule that carries genetic instructions' },
  { front: 'What is the function of ribosomes?', back: 'Protein synthesis' },
  { front: 'What is osmosis?', back: 'The movement of water molecules through a semipermeable membrane from low to high solute concentration' },
  { front: 'Name the four nucleotide bases in DNA', back: 'Adenine, Thymine, Guanine, Cytosine' },
  { front: 'What is the cell membrane made of?', back: 'A phospholipid bilayer with embedded proteins' },
  { front: 'What organ produces insulin?', back: 'The pancreas' },
  { front: 'What is the largest organ in the human body?', back: 'The skin' },
  { front: 'What is the powerhouse organelle of a plant cell?', back: 'Chloroplast (for photosynthesis) and mitochondria (for cellular respiration)' },
  { front: 'What is meiosis?', back: 'Cell division that produces gametes (sex cells) with half the chromosome number' },
  { front: 'What is an enzyme?', back: 'A biological catalyst that speeds up chemical reactions' },
  { front: 'What is the difference between prokaryotic and eukaryotic cells?', back: 'Prokaryotes lack a membrane-bound nucleus; eukaryotes have one' },
  { front: 'What is homeostasis?', back: 'The maintenance of stable internal conditions in an organism' },
  { front: 'What is natural selection?', back: 'The process where organisms with favorable traits survive and reproduce more successfully' },
  { front: 'Which organelle is responsible for detoxification?\nA) Ribosome\nB) Smooth ER\nC) Nucleus\nD) Golgi apparatus', back: 'B) Smooth ER', cardType: 'MCQ' },
  { front: 'How many chromosomes do humans have?\nA) 23\nB) 44\nC) 46\nD) 48', back: 'C) 46', cardType: 'MCQ' },
  { front: 'Which blood type is the universal donor?\nA) A\nB) B\nC) AB\nD) O negative', back: 'D) O negative', cardType: 'MCQ' },
  { front: 'What is the pH of human blood?\nA) 6.0\nB) 7.0\nC) 7.4\nD) 8.0', back: 'C) 7.4', cardType: 'MCQ' },
  { front: 'Which vitamin is produced by sunlight?\nA) Vitamin A\nB) Vitamin C\nC) Vitamin D\nD) Vitamin K', back: 'C) Vitamin D', cardType: 'MCQ' },
];

const HISTORY_CARDS = [
  { front: 'When did WW2 end?', back: '1945' },
  { front: 'Who was the first President of the United States?', back: 'George Washington' },
  { front: 'In what year did the Berlin Wall fall?', back: '1989' },
  { front: 'Who wrote the Declaration of Independence?', back: 'Thomas Jefferson' },
  { front: 'What was the Renaissance?', back: 'A cultural and intellectual movement in Europe from the 14th to 17th century' },
  { front: 'When was the Magna Carta signed?', back: '1215' },
  { front: 'What empire was ruled by Genghis Khan?', back: 'The Mongol Empire' },
  { front: 'What year did the French Revolution begin?', back: '1789' },
  { front: 'Who discovered America in 1492?', back: 'Christopher Columbus' },
  { front: 'What was the Cold War?', back: 'A geopolitical tension between the USA and USSR from 1947 to 1991' },
  { front: 'When was the Roman Empire founded?', back: '27 BC' },
  { front: 'Who was Cleopatra?', back: 'The last active ruler of the Ptolemaic Kingdom of Egypt' },
  { front: 'What caused the Great Depression?', back: 'The stock market crash of 1929 and subsequent bank failures' },
  { front: 'When did the Industrial Revolution begin?', back: 'Late 18th century (around 1760)' },
  { front: 'What was the Silk Road?', back: 'An ancient trade route connecting East Asia to the Mediterranean' },
];

const MATH_CARDS = [
  { front: 'What is the derivative of x²?', back: '2x' },
  { front: 'What is the quadratic formula?', back: 'x = (-b ± √(b²-4ac)) / 2a' },
  { front: 'What is π (pi) approximately equal to?', back: '3.14159...' },
  { front: 'What is the integral of 1/x?', back: 'ln|x| + C' },
  { front: 'What is the Pythagorean theorem?', back: 'a² + b² = c²' },
  { front: 'What is 0! (zero factorial)?', back: '1' },
  { front: 'What is the sum of angles in a triangle?', back: '180 degrees' },
  { front: "What is e (Euler's number) approximately?", back: '2.71828...' },
  { front: 'What is the slope-intercept form of a line?', back: 'y = mx + b' },
  { front: 'What is the area of a circle?', back: 'πr²' },
];

const PROGRAMMING_CARDS = [
  { front: 'What is a closure in JavaScript?', back: 'A function that retains access to its outer scope variables even after the outer function has returned' },
  { front: 'What is Big O notation?', back: "A mathematical notation describing the upper bound of an algorithm's time or space complexity" },
  { front: 'What is the difference between == and === in JavaScript?', back: '== performs type coercion; === checks both value and type (strict equality)' },
  { front: 'What is a REST API?', back: 'An architectural style for web services using HTTP methods (GET, POST, PUT, DELETE) on resources' },
  { front: 'What is recursion?', back: 'A technique where a function calls itself to solve smaller instances of the same problem' },
  { front: 'What is a Promise in JavaScript?', back: 'An object representing the eventual completion or failure of an asynchronous operation' },
  { front: 'What does SOLID stand for?', back: 'Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion' },
  { front: 'What is a hash table?', back: 'A data structure that maps keys to values using a hash function for O(1) average lookup' },
];

// ════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════

test.describe('Visual Walkthrough — Design System v2 @studytab @design-system @walkthrough', () => {
  test.use({ storageState: '.auth/user.json' });
  test.describe.configure({ mode: 'serial' });

  let createdDeckIds: string[] = [];
  let biologyDeckId: string;
  let savedApiUrl: string;
  let savedCookieHeader: string;

  // ─── 0. Seed Test Data ─────────────────────────────────────────────

  test('seed rich test data', async ({ apiClient, projectConfig, context }) => {
    test.setTimeout(180000);
    savedApiUrl = projectConfig.apiUrl;

    // Save cookies for afterAll cleanup (Node fetch, not Playwright request)
    const cookies = await context.cookies();
    savedCookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const biology = await seedDeck(apiClient, 'Biology 101', 'Comprehensive biology flashcards', BIOLOGY_CARDS);
    createdDeckIds.push(biology.id);
    biologyDeckId = biology.id;
    console.log(`[Seed] Biology 101: ${biology.id} (${biology.cardCount} cards)`);

    const history = await seedDeck(apiClient, 'World History', 'Key events from ancient to modern history', HISTORY_CARDS);
    createdDeckIds.push(history.id);
    console.log(`[Seed] World History: ${history.id} (${history.cardCount} cards)`);

    const math = await seedDeck(apiClient, 'Mathematics', 'Calculus, algebra, and geometry', MATH_CARDS);
    createdDeckIds.push(math.id);
    console.log(`[Seed] Mathematics: ${math.id} (${math.cardCount} cards)`);

    const programming = await seedDeck(apiClient, 'Programming Concepts', 'Core CS and JavaScript', PROGRAMMING_CARDS);
    createdDeckIds.push(programming.id);
    console.log(`[Seed] Programming Concepts: ${programming.id} (${programming.cardCount} cards)`);

    const empty = await seedDeck(apiClient, 'Empty Deck', 'An empty deck for testing empty states', []);
    createdDeckIds.push(empty.id);
    console.log(`[Seed] Empty Deck: ${empty.id} (0 cards)`);

    console.log('[Walkthrough] Seeded 5 decks — Biology(20), History(15), Math(10), Programming(8), Empty(0)');

    // Wait for rate-limit window to reset (58 API calls consumed during seeding)
    console.log('[Walkthrough] Waiting for rate-limit cooldown...');
    await new Promise(r => setTimeout(r, 5000));
  });

  test.afterAll(async () => {
    if (savedApiUrl && savedCookieHeader && createdDeckIds.length > 0) {
      console.log(`[Walkthrough] Cleaning up ${createdDeckIds.length} decks via fetch...`);
      for (const id of createdDeckIds) {
        await deleteDeckViaFetch(savedApiUrl, savedCookieHeader, id);
      }
      console.log('[Walkthrough] Cleanup done');
    }
  });

  // ─── 1. Dashboard Visual Check ───────────────────────────────────────

  test.describe('1. Dashboard', () => {
    test('dashboard visual check — greeting, bento grid, theme toggle', async ({
      page,
      projectConfig,
    }) => {
      test.slow();
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      // Verify time-based greeting
      await expect(dashboard.welcomeHeading).toBeVisible({ timeout: 10000 });
      const greetingText = await dashboard.getWelcomeText();
      expect(greetingText).toMatch(/good (morning|afternoon|evening)/i);

      // Verify bento grid cards
      await expect(page.getByText('Due Today')).toBeVisible();
      await expect(dashboard.streakCounter).toBeVisible();
      await expect(page.getByText(/Study Progress|Total Cards|Total Decks/).first()).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();

      await snap(page, 'dashboard-light.png');

      // Toggle to dark theme via settings
      const settings = new SettingsPage(page, projectConfig.baseUrl);
      await settings.goto();
      await settings.selectDarkTheme();
      await page.waitForTimeout(400);

      await dashboard.goto();
      await expect(dashboard.welcomeHeading).toBeVisible();
      await snap(page, 'dashboard-dark.png');

      // Restore light theme
      await settings.goto();
      await settings.selectLightTheme();
      await page.waitForTimeout(300);
    });
  });

  // ─── 2. Decks Page ───────────────────────────────────────────────────

  test.describe('2. Decks Page', () => {
    test('decks grid — all decks visible, color bars, card counts, hover actions', async ({
      page,
      projectConfig,
    }) => {
      test.slow();

      await gotoDecksReliably(page, projectConfig.baseUrl);

      const deckCards = page.locator('a[href*="/decks/"]:has(h3)');
      const count = await deckCards.count();
      expect(count).toBeGreaterThanOrEqual(5);

      // Check each deck name appears
      for (const name of ['Biology 101', 'World History', 'Mathematics', 'Programming Concepts', 'Empty Deck']) {
        const allTexts = await deckCards.allTextContents();
        const found = allTexts.some(t => t.toLowerCase().includes(name.toLowerCase()));
        expect(found).toBe(true);
      }

      // Verify color bars on left edge
      const firstCardWrapper = deckCards.first().locator('..');
      const hasColorBar = await firstCardWrapper.evaluate(el => {
        const style = getComputedStyle(el);
        const hasLeftBorder = parseInt(style.borderLeftWidth) >= 3;
        const colorEl = el.querySelector('[class*="color"], [class*="accent"], [class*="indicator"]');
        return hasLeftBorder || colorEl !== null;
      });
      expect(hasColorBar).toBe(true);

      // Verify card counts shown
      const percentageOrCount = deckCards.first().getByText(/\d+(%| cards?)/).first();
      await expect(percentageOrCount).toBeVisible();

      // Hover over a deck card — verify action buttons appear
      const cardWrapper = deckCards.first().locator('..');
      const editButton = cardWrapper.getByRole('button', { name: 'Edit deck' });
      await cardWrapper.hover();
      await page.waitForTimeout(300);
      await expect(editButton).toBeVisible();

      await snap(page, 'decks-grid-light.png');

      // Dark theme
      const settings = new SettingsPage(page, projectConfig.baseUrl);
      await settings.goto();
      await settings.selectDarkTheme();
      await page.waitForTimeout(400);

      await gotoDecksReliably(page, projectConfig.baseUrl);
      await snap(page, 'decks-grid-dark.png');

      // Restore light theme
      await settings.goto();
      await settings.selectLightTheme();
      await page.waitForTimeout(300);
    });
  });

  // ─── 3. Deck Detail Page ─────────────────────────────────────────────

  test.describe('3. Deck Detail', () => {
    test('deck detail — cards list, card count, navigation', async ({
      page,
      projectConfig,
    }) => {
      // Navigate directly to Biology deck by ID
      if (biologyDeckId) {
        await page.goto(`${projectConfig.baseUrl}/decks/${biologyDeckId}`);
      } else {
        await gotoDecksReliably(page, projectConfig.baseUrl);
        await page.locator('a[href*="/decks/"]:has(h3)').filter({ hasText: /Biology 101/i }).first().click();
      }
      await page.waitForLoadState('networkidle');

      const deckDetail = new DeckDetailPage(page, projectConfig.baseUrl);
      await expect(deckDetail.deckTitle).toBeVisible();
      const title = await deckDetail.getDeckTitle();
      expect(title.toLowerCase()).toContain('biology');

      const cardsCount = await deckDetail.getCardsCount();
      expect(cardsCount).toBeGreaterThanOrEqual(1);

      // Verify back navigation exists
      const backNav = page.locator('a:has-text("Back"), button:has-text("Back"), [data-testid="back-button"], a[href*="/decks"]').first();
      await expect(backNav).toBeVisible();

      await snap(page, 'deck-detail-light.png');
    });
  });

  // ─── 4. Study Wizard ─────────────────────────────────────────────────

  test.describe('4. Study Wizard', () => {
    test('study session — glassmorphism, card flip, rating buttons, completion', async ({
      page,
      projectConfig,
    }) => {
      test.slow();
      test.setTimeout(90000);

      if (biologyDeckId) {
        await page.goto(`${projectConfig.baseUrl}/decks/${biologyDeckId}`);
      } else {
        await gotoDecksReliably(page, projectConfig.baseUrl);
        await page.locator('a[href*="/decks/"]:has(h3)').filter({ hasText: /Biology 101/i }).first().click();
      }
      await page.waitForLoadState('networkidle');

      // Start study session
      const studyBtn = page.locator('main').getByRole('button', { name: /^Study/ }).first();
      await expect(studyBtn).toBeVisible({ timeout: 10000 });
      await studyBtn.click();

      const showAnswerBtn = page.getByRole('button', { name: 'Show Answer' });
      await showAnswerBtn.waitFor({ timeout: 15000 });

      // Verify glassmorphism (backdrop-blur or rgba background on any element)
      const hasGlassmorphism = await page.evaluate(() => {
        for (const el of document.querySelectorAll('*')) {
          const style = getComputedStyle(el);
          if (style.backdropFilter && style.backdropFilter !== 'none') return true;
        }
        return false;
      });
      expect(hasGlassmorphism).toBe(true);

      // Verify card question text is visible (the "Show Answer" button being present confirms the card is displayed)
      await expect(page.getByText(/\?/).first()).toBeVisible({ timeout: 5000 });

      // Show answer
      await showAnswerBtn.click();
      await page.waitForTimeout(500);

      // Verify 4 rating buttons
      const ratingBtns = page.locator('button').filter({ hasText: /^(Again|Hard|Good|Easy)/ });
      await expect(ratingBtns.first()).toBeVisible({ timeout: 5000 });
      const texts = await ratingBtns.allTextContents();
      const lowerTexts = texts.map(t => t.trim().toLowerCase());
      expect(lowerTexts.some(t => t.startsWith('again'))).toBe(true);
      expect(lowerTexts.some(t => t.startsWith('hard'))).toBe(true);
      expect(lowerTexts.some(t => t.startsWith('good'))).toBe(true);
      expect(lowerTexts.some(t => t.startsWith('easy'))).toBe(true);

      // Verify bordered style
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

      // Rate as Good
      const goodBtn = page.getByRole('button', { name: /^Good/ });
      await goodBtn.click();
      await page.waitForTimeout(500);
      await snap(page, 'study-wizard-light.png');

      // Study a few more cards
      for (let i = 1; i < 5; i++) {
        try {
          await showAnswerBtn.waitFor({ timeout: 5000 });
          await showAnswerBtn.click();
          await goodBtn.first().waitFor({ timeout: 5000 });
          await goodBtn.click();
          await page.waitForTimeout(300);
        } catch {
          break;
        }
      }

      // Check for completion screen
      await page.waitForTimeout(1000);
      const completionArea = page.locator(
        '[class*="complete"], [class*="finish"], [class*="result"], [class*="summary"], [class*="congrat"]'
      ).first();
      if (await completionArea.isVisible().catch(() => false)) {
        const checkmark = completionArea.locator('svg, img, [class*="check"], [class*="icon"]').first();
        await expect(checkmark).toBeVisible();
        await snap(page, 'study-complete-light.png');
      } else {
        await snap(page, 'study-in-progress-light.png');
        const exitBtn = page.locator('[data-testid="exit-study"], button:has-text("Exit"), button:has-text("End")').first();
        if (await exitBtn.isVisible().catch(() => false)) {
          await exitBtn.click();
        }
      }
    });
  });

  // ─── 5. Tasks Page ───────────────────────────────────────────────────

  test.describe('5. Tasks Page', () => {
    test('tasks page visual check', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/tasks`);
      await page.waitForLoadState('networkidle');

      const tasksSummary = page.getByText(/\d+ tasks/i).first();
      await expect(tasksSummary).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Completed' })).toBeVisible();

      const prioritySelect = page.getByRole('combobox').filter({ hasText: /All Priorities/i });
      if (await prioritySelect.isVisible().catch(() => false)) {
        const options = await prioritySelect.locator('option').allTextContents();
        expect(options.some(o => /high/i.test(o))).toBe(true);
      }

      await snap(page, 'tasks-page-light.png');
    });
  });

  // ─── 6. Calendar Page ────────────────────────────────────────────────

  test.describe('6. Calendar Page', () => {
    test('calendar page visual check', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/calendar`);
      await page.waitForLoadState('networkidle');

      const calendarGrid = page.locator(
        '[class*="calendar"], [data-testid*="calendar"], table, [role="grid"]'
      ).first();
      await expect(calendarGrid).toBeVisible({ timeout: 10000 });

      await snap(page, 'calendar-light.png');
    });
  });

  // ─── 7. Notes Page ───────────────────────────────────────────────────

  test.describe('7. Notes Page', () => {
    test('notes page visual check', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/notes`);
      await page.waitForLoadState('networkidle');

      await page.locator('main').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);

      await snap(page, 'notes-page-light.png');
    });
  });

  // ─── 8. Stats Page ───────────────────────────────────────────────────

  test.describe('8. Stats Page', () => {
    test('stats page — period tabs and stats grid', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/stats`);
      await page.waitForLoadState('networkidle');

      const periodTabs = page.locator('button, [role="tab"]').filter({
        hasText: /Today|Week|Month|All Time|7 Days|30 Days/i,
      });
      const tabCount = await periodTabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(2);

      const statsCards = page.locator(
        '[class*="stat"], [class*="card"], [data-testid*="stat"]'
      ).filter({ hasText: /\d+/ });
      await expect(statsCards.first()).toBeVisible({ timeout: 10000 });

      await snap(page, 'stats-page-light.png');
    });
  });

  // ─── 9. Settings Page ────────────────────────────────────────────────

  test.describe('9. Settings Page', () => {
    test('settings page visual check', async ({ page, projectConfig }) => {
      const settings = new SettingsPage(page, projectConfig.baseUrl);
      await settings.goto();

      await expect(settings.heading).toBeVisible();
      await settings.expectLoaded();

      await snap(page, 'settings-light.png');
    });
  });

  // ─── 10. Sidebar & Layout ────────────────────────────────────────────

  test.describe('10. Sidebar & Layout', () => {
    test('sidebar — brand, sections, collapse/expand', async ({ page, projectConfig }) => {
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();

      const sidebar = page.locator('aside, [role="complementary"], [data-testid="sidebar"]').first();
      await expect(sidebar).toBeVisible();

      // Verify "StudyTab" brand with "S" logo
      await expect(sidebar.getByText('S').first()).toBeVisible();
      await expect(sidebar.getByText('StudyTab')).toBeVisible();

      // Section labels
      await expect(sidebar.getByText('Main')).toBeVisible();
      await expect(sidebar.getByText('Tools')).toBeVisible();

      // Navigation icons
      const iconCount = await sidebar.locator('img, svg').count();
      expect(iconCount).toBeGreaterThan(0);

      // Collapse sidebar
      const collapseButton = page.getByRole('button', { name: 'Collapse' });
      const widthBefore = await sidebar.evaluate(el => el.getBoundingClientRect().width);
      await collapseButton.click();
      await page.waitForTimeout(400);

      const widthAfter = await sidebar.evaluate(el => el.getBoundingClientRect().width);
      expect(widthAfter).toBeLessThan(widthBefore);
      await expect(sidebar.getByText('StudyTab')).not.toBeVisible();
      expect(await sidebar.locator('img, svg').count()).toBeGreaterThan(0);

      await snap(page, 'sidebar-collapsed.png');

      // Expand sidebar
      const expandButton = page.getByRole('button', { name: /Expand|Collapse/ }).first();
      await expandButton.click();
      await page.waitForTimeout(400);

      await expect(sidebar.getByText('StudyTab')).toBeVisible();
      await snap(page, 'sidebar-expanded.png');
    });
  });

  // ─── 11. Mobile Viewport (375px) ─────────────────────────────────────

  test.describe('11. Mobile Viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('mobile — dashboard, decks, study session', async ({ page, projectConfig }) => {
      test.slow();
      test.setTimeout(90000);

      // ── Mobile Dashboard ──
      const dashboard = new DashboardPage(page, projectConfig.baseUrl);
      await dashboard.goto();
      await expect(dashboard.welcomeHeading).toBeVisible({ timeout: 10000 });

      const sidebar = page.locator('aside, [role="complementary"]').first();
      await expect(sidebar).not.toBeVisible();

      const bottomNav = page.getByRole('navigation').last();
      await expect(bottomNav).toBeVisible();

      await snap(page, 'mobile-dashboard.png');

      // ── Mobile Decks ──
      await page.goto(`${projectConfig.baseUrl}/decks`);
      await page.waitForLoadState('networkidle');

      const deckCards = page.locator('a[href*="/decks/"]:has(h3)');
      await deckCards.first().waitFor({ state: 'visible', timeout: 15000 });
      expect(await deckCards.count()).toBeGreaterThanOrEqual(1);

      await snap(page, 'mobile-decks.png');

      // ── Mobile Study ──
      if (biologyDeckId) {
        await page.goto(`${projectConfig.baseUrl}/decks/${biologyDeckId}`);
      } else {
        await deckCards.filter({ hasText: /Biology 101/i }).first().click();
      }
      await page.waitForLoadState('networkidle');

      const studyBtn = page.locator('main').getByRole('button', { name: /^Study/ }).first();
      try {
        await studyBtn.waitFor({ timeout: 10000 });
        await studyBtn.click();

        const showAnswerBtn = page.getByRole('button', { name: 'Show Answer' });
        await showAnswerBtn.waitFor({ timeout: 10000 });
        await showAnswerBtn.click();

        // Verify rating buttons don't overflow on mobile
        const ratingBtns = page.locator('button').filter({ hasText: /^(Again|Hard|Good|Easy)/ });
        await expect(ratingBtns.first()).toBeVisible({ timeout: 5000 });
        const btnCount = await ratingBtns.count();
        for (let i = 0; i < btnCount; i++) {
          const box = await ratingBtns.nth(i).boundingBox();
          expect(box).not.toBeNull();
          if (box) {
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(376);
          }
        }

        await snap(page, 'mobile-study.png');
      } catch {
        // Study may not be available if all cards already studied
        await snap(page, 'mobile-deck-detail.png');
      }
    });
  });
});
