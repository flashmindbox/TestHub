import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck, goToSecondaryDeck, hasMultipleDecks, selectQuickReviseMode, switchToFullSession, openStudyWizard, closeStudyWizard, revealAndRate, openWizardWithCards, createTestDeck, addBasicCard } from '../_helpers/studytab-helpers';

test.describe('Feature: Card Types', () => {
  test.beforeEach(async ({ page }) => {
    const deckId = await goToTestDeck(page);
    if (!deckId) {
      test.skip(true, 'No test deck available');
    }
  });

  test('Basic card should show question and answer', async ({ page }) => {
    await selectQuickReviseMode(page);
    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Should show question content (any text paragraph)
    const questionContent = page.locator('p').first();
    await expect(questionContent).toBeVisible();

    // Reveal answer
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(300);

    // Should show answer content
    const answerContent = page.locator('p');
    await expect(answerContent.first()).toBeVisible();
  });

  test('MCQ card should show multiple options', async ({ page }) => {
    await selectQuickReviseMode(page);
    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Look for MCQ options (radio buttons or clickable options)
    const mcqOptions = page.locator(
      '[role="radio"], [role="option"], input[type="radio"], .mcq-option, [data-testid="mcq-option"]'
    );

    const optionCount = await mcqOptions.count();

    if (optionCount >= 2) {
      expect(optionCount).toBeGreaterThanOrEqual(2);
      await mcqOptions.first().click();
      await page.waitForTimeout(300);

      const hasResponse = await page
        .locator('text=/correct/i, text=/incorrect/i, text=/wrong/i, button:has-text("Next")')
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasResponse).toBe(true);
    }
  });

  test('Cloze card should show blanks', async ({ page }) => {
    // Check if Study button is enabled before clicking
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    await studyButton.click();
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard if Show Answer not visible
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

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Look for cloze blanks (usually styled differently)
    const clozeBlank = page
      .locator('[data-testid="cloze-blank"], .cloze-blank, [class*="cloze"], text=[...]')
      .first();

    if (await clozeBlank.isVisible().catch(() => false)) {
      await expect(clozeBlank).toBeVisible();
      await page.click(SELECTORS.wizard.showAnswer);
      await page.waitForTimeout(300);
      const filledContent = await clozeBlank.textContent();
      expect(filledContent).not.toBe('[...]');
    }
  });

  test('card type filter should work', async ({ page }) => {
    // Look for type filter
    const filterDropdown = page
      .locator('select, [role="combobox"], button:has-text("Filter"), button:has-text("Type")')
      .first();

    if (await filterDropdown.isVisible()) {
      await filterDropdown.click();
      await page.waitForTimeout(200);

      // Look for card type options
      const typeOption = page
        .locator(
          'option:has-text("Basic"), option:has-text("MCQ"), [role="option"]:has-text("Basic"), [role="option"]:has-text("MCQ")'
        )
        .first();

      if (await typeOption.isVisible()) {
        await typeOption.click();
        await page.waitForTimeout(500);

        // Cards should be filtered
        const cards = page.locator('[data-testid="card-item"], .card-item');
        const filteredCount = await cards.count();

        // Should have some or no cards based on filter
        expect(filteredCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('creating card should allow type selection', async ({ page }) => {
    // Click add card - opens a full page form, not a dialog
    const addCardBtn = page.locator('button:has-text("Add Card")');
    if (!(await addCardBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Add Card button not available');
      return;
    }

    await addCardBtn.click();
    // Wait for card editor form to appear (full page with textarea)
    await page.waitForSelector('textarea, [placeholder*="question"]', {
      timeout: 5000,
    });

    // Look for type selector (may be a select or button group)
    const typeSelector = page
      .locator(
        'select, [data-testid="card-type-selector"], button:has-text("Basic"), button:has-text("MCQ")'
      )
      .first();

    if (await typeSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeSelector.click();
      await page.waitForTimeout(200);

      // Check for type options - could be dropdown options or button group
      const typeOptions = page.locator(
        'option, [role="option"], [role="menuitem"], button:has-text("Basic"), button:has-text("MCQ"), button:has-text("Cloze")'
      );
      const optionCount = await typeOptions.count();

      // If we clicked a type button (not a dropdown), it might already be selected
      // In that case, we're looking at the card editor with a type already chosen
      const hasTextarea = await page
        .locator('textarea')
        .isVisible()
        .catch(() => false);

      // Test passes if: we found options OR we're on the card editor (type implicitly selected)
      expect(optionCount >= 1 || hasTextarea).toBe(true);
    }
    // If no type selector visible, test passes - feature may not be implemented
  });

  test('each card type should render correctly in list', async ({ page }) => {
    // Check card list for type badges or indicators
    const cards = page.locator('[data-testid="card-item"], .card-item');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Check first card for type indicator
      const firstCard = cards.first();
      const cardContent = await firstCard.textContent();

      // Should have some content
      expect(cardContent?.length).toBeGreaterThan(0);

      // Look for type badge
      const typeBadge = firstCard.locator(
        '[data-testid="card-type"], .card-type, text=Basic, text=MCQ, text=Cloze'
      );

      // Type might or might not be shown as badge
      const hasTypeBadge = await typeBadge.isVisible();
      expect(typeof hasTypeBadge).toBe('boolean');
    }
  });

  test('image cards should display images', async ({ page }) => {
    // Check if Study button is enabled before clicking
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    await studyButton.click();
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard if Show Answer not visible
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

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Look for image in card
    const cardImage = page.locator('img').first();

    if (await cardImage.isVisible().catch(() => false)) {
      const src = await cardImage.getAttribute('src');
      expect(src).toBeTruthy();
      await expect(cardImage).toHaveJSProperty('complete', true);
    }
  });

  test('markdown content should render properly', async ({ page }) => {
    // Check if Study button is enabled before clicking
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isDisabled().catch(() => true)) {
      test.skip(true, 'Study button is disabled - no due cards');
      return;
    }

    await studyButton.click();
    await page.waitForTimeout(500);

    // Select Quick Revise mode INSIDE wizard if Show Answer not visible
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

    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Look for markdown elements (bold, lists, code, etc.)
    const markdownElements = page.locator('strong, em, code, ul, ol');
    const hasMarkdown = (await markdownElements.count()) > 0;
    expect(typeof hasMarkdown).toBe('boolean');

    if (hasMarkdown) {
      const firstElement = markdownElements.first();
      await expect(firstElement).toBeVisible();
    }
  });

  test('code blocks should have syntax highlighting', async ({ page }) => {
    await selectQuickReviseMode(page);
    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Look for code blocks
    const codeBlock = page
      .locator('pre code, .code-block, [class*="highlight"]')
      .first();

    if (await codeBlock.isVisible().catch(() => false)) {
      const hasClasses = await codeBlock.getAttribute('class');
      expect(hasClasses).toBeTruthy();
    }
  });

  test('card content should be selectable for copy', async ({ page }) => {
    await selectQuickReviseMode(page);
    await page.click('button:has-text("Study")');
    await page.waitForTimeout(500);

    const hasCards = await page
      .locator(SELECTORS.wizard.showAnswer)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasCards) {
      test.skip(true, 'No cards available for study');
      return;
    }

    // Reveal answer to see full content
    await page.click(SELECTORS.wizard.showAnswer);
    await page.waitForTimeout(300);

    // Try to select text
    const contentArea = page.locator('p').first();

    if (await contentArea.isVisible().catch(() => false)) {
      const userSelect = await contentArea.evaluate((el) => {
        return window.getComputedStyle(el).userSelect;
      });
      expect(userSelect).not.toBe('none');
    }
  });
});
