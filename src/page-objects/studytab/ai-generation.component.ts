import { Page, Locator, expect } from '@playwright/test';

/**
 * AI Generation Component
 *
 * Handles the AI card generation functionality within the deck detail page.
 * This component manages:
 * - Opening/closing the AI generation panel
 * - Input text for generation
 * - Card count and type selection
 * - Reviewing and managing generated cards
 * - Saving cards to deck
 */
export class AIGenerationComponent {
  readonly page: Page;

  // Panel controls
  readonly generateWithAIButton: Locator;
  readonly panel: Locator;
  readonly panelHeading: Locator;
  readonly closeButton: Locator;

  // Input section
  readonly textInput: Locator;
  readonly characterCount: Locator;

  // Options section
  readonly cardCountLabel: Locator;
  readonly cardCount3Button: Locator;
  readonly cardCount5Button: Locator;
  readonly cardCount10Button: Locator;
  readonly cardTypeLabel: Locator;
  readonly basicTypeButton: Locator;
  readonly clozeTypeButton: Locator;
  readonly mcqTypeButton: Locator;

  // Action buttons
  readonly generateButton: Locator;
  readonly regenerateButton: Locator;
  readonly saveCardsButton: Locator;

  // Generated cards section
  readonly generatedCardsMessage: Locator;
  readonly generatedCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Panel controls
    this.generateWithAIButton = page.getByRole('button', { name: 'Generate with AI' });
    this.panel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Generate Cards with AI' }) });
    this.panelHeading = page.getByRole('heading', { name: 'Generate Cards with AI' });
    // Close button is in the panel header section - navigate from heading to its sibling button
    // Structure: header container > (logo+heading container, close button)
    // From heading (e111) -> parent (e107) -> parent (e106) -> button (e112)
    this.closeButton = this.panelHeading.locator('xpath=../../button');

    // Input section
    this.textInput = page.getByRole('textbox', { name: /Paste notes, textbook content/i });
    this.characterCount = page.getByText(/\d+ \/ 50,000 characters/);

    // Options section
    this.cardCountLabel = page.getByText('Card count');
    this.cardCount3Button = page.getByRole('button', { name: '3', exact: true });
    this.cardCount5Button = page.getByRole('button', { name: '5', exact: true });
    this.cardCount10Button = page.getByRole('button', { name: '10', exact: true });
    this.cardTypeLabel = page.getByText('Card type');
    this.basicTypeButton = page.getByRole('button', { name: 'Basic' });
    this.clozeTypeButton = page.getByRole('button', { name: 'Cloze' });
    this.mcqTypeButton = page.getByRole('button', { name: 'MCQ' });

    // Action buttons
    this.generateButton = page.getByRole('button', { name: 'Generate', exact: true });
    this.regenerateButton = page.getByRole('button', { name: 'Regenerate' });
    this.saveCardsButton = page.getByRole('button', { name: /Save \d+ Cards?/ });

    // Generated cards section
    this.generatedCardsMessage = page.getByText(/\d+ cards? generated/);
    this.generatedCards = this.panel.locator('div').filter({ has: page.locator('p') }).filter({ has: page.locator('button') });
  }

  /**
   * Open the AI generation panel
   */
  async open() {
    await this.generateWithAIButton.click();
    await this.panelHeading.waitFor({ state: 'visible' });
  }

  /**
   * Close the AI generation panel
   */
  async close() {
    await this.closeButton.click();
    await this.panelHeading.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Check if panel is open
   */
  async isOpen(): Promise<boolean> {
    return await this.panelHeading.isVisible();
  }

  /**
   * Enter text for card generation
   */
  async enterText(text: string) {
    await this.textInput.fill(text);
  }

  /**
   * Get the current character count
   */
  async getCharacterCount(): Promise<number> {
    const text = await this.characterCount.textContent() || '0';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Select card count (3, 5, or 10)
   */
  async selectCardCount(count: 3 | 5 | 10) {
    switch (count) {
      case 3:
        await this.cardCount3Button.click();
        break;
      case 5:
        await this.cardCount5Button.click();
        break;
      case 10:
        await this.cardCount10Button.click();
        break;
    }
  }

  /**
   * Select card type (Basic, Cloze, or MCQ)
   */
  async selectCardType(type: 'Basic' | 'Cloze' | 'MCQ') {
    switch (type) {
      case 'Basic':
        await this.basicTypeButton.click();
        break;
      case 'Cloze':
        await this.clozeTypeButton.click();
        break;
      case 'MCQ':
        await this.mcqTypeButton.click();
        break;
    }
  }

  /**
   * Generate cards with current settings
   * Returns the number of cards generated
   * Throws an error if rate limited
   */
  async generate(timeout: number = 30000): Promise<number> {
    await this.generateButton.click();
    // Wait for generation to complete (either cards appear, error, or rate limit)
    await this.page.waitForSelector('text=/\\d+ cards? generated|error|failed|too many requests/i', { timeout });

    // Check for rate limit error
    const rateLimitError = this.page.getByText(/too many requests/i);
    if (await rateLimitError.isVisible({ timeout: 500 }).catch(() => false)) {
      throw new Error('Rate limited: Too many requests. Please try again later.');
    }

    // Wait a brief moment for the UI to fully stabilize
    await this.page.waitForTimeout(500);
    return await this.getGeneratedCardCount();
  }

  /**
   * Regenerate cards
   * Note: Regeneration may take longer than initial generation as the AI processes again
   */
  async regenerate(timeout: number = 45000): Promise<number> {
    await this.regenerateButton.click();
    // Wait for either new cards generated or an error
    await this.page.waitForSelector('text=/\\d+ cards? generated|error|failed/i', { timeout });
    return await this.getGeneratedCardCount();
  }

  /**
   * Get the number of generated cards
   */
  async getGeneratedCardCount(): Promise<number> {
    const message = await this.generatedCardsMessage.textContent() || '0';
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get generated card content
   */
  async getGeneratedCardContent(index: number): Promise<{ front: string; back: string }> {
    const cardContainer = this.panel.locator('> div').nth(1).locator('> div').nth(index + 1);
    const paragraphs = cardContainer.locator('p');
    const front = await paragraphs.nth(0).textContent() || '';
    const back = await paragraphs.nth(1).textContent() || '';
    return { front, back };
  }

  /**
   * Delete a generated card by index
   */
  async deleteGeneratedCard(index: number) {
    // Find delete buttons by navigating the DOM structure:
    // "cards generated" message (p) -> parent (content area) -> card containers (div) -> delete button
    // Structure: content area > card container > [content div, delete button]
    const contentArea = this.page.getByText(/\d+ cards? generated/i).locator('xpath=..');
    // Get direct div children (card containers), then get the button inside each
    const deleteButtons = contentArea.locator('> div > button');
    await deleteButtons.nth(index).click();
  }

  /**
   * Save all generated cards to deck
   */
  async saveCards() {
    await this.saveCardsButton.click();
    // Wait for panel to close or success message
    await this.panelHeading.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Check if generate button is enabled
   */
  async isGenerateButtonEnabled(): Promise<boolean> {
    return await this.generateButton.isEnabled();
  }

  /**
   * Quick generate: enter text and generate with defaults
   */
  async quickGenerate(text: string, options?: {
    cardCount?: 3 | 5 | 10;
    cardType?: 'Basic' | 'Cloze' | 'MCQ';
    timeout?: number;
  }): Promise<number> {
    await this.enterText(text);

    if (options?.cardCount) {
      await this.selectCardCount(options.cardCount);
    }

    if (options?.cardType) {
      await this.selectCardType(options.cardType);
    }

    return await this.generate(options?.timeout);
  }

  /**
   * Full flow: open panel, generate cards, and save
   */
  async generateAndSave(text: string, options?: {
    cardCount?: 3 | 5 | 10;
    cardType?: 'Basic' | 'Cloze' | 'MCQ';
    timeout?: number;
  }): Promise<number> {
    await this.open();
    const count = await this.quickGenerate(text, options);
    await this.saveCards();
    return count;
  }

  /**
   * Assert panel shows validation error for empty input
   */
  async expectGenerateButtonDisabled() {
    await expect(this.generateButton).toBeDisabled();
  }

  /**
   * Assert cards were generated successfully
   */
  async expectCardsGenerated(expectedCount?: number) {
    await expect(this.generatedCardsMessage).toBeVisible();
    if (expectedCount !== undefined) {
      await expect(this.generatedCardsMessage).toContainText(`${expectedCount} card`);
    }
  }

  /**
   * Assert regenerate and save buttons are visible
   */
  async expectReviewState() {
    await expect(this.regenerateButton).toBeVisible();
    await expect(this.saveCardsButton).toBeVisible();
  }
}
