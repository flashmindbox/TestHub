import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ModalComponent } from '../_common';

export class DecksPage extends BasePage {
  readonly modal: ModalComponent;
  readonly decksList: Locator;
  readonly deckCards: Locator;
  readonly createDeckButton: Locator;
  readonly searchInput: Locator;
  readonly sortDropdown: Locator;
  readonly emptyState: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.modal = new ModalComponent(page);
    this.decksList = page.locator('main');
    // Deck cards are links with /decks/ URLs containing an h3 heading
    this.deckCards = page.locator('a[href*="/decks/"]:has(h3)');
    this.createDeckButton = page.locator('button:has-text("New Deck"), button:has-text("Create"), [data-testid="create-deck"]').first();
    this.searchInput = page.locator('[data-testid="search-decks"], input[placeholder*="Search"], input[type="search"]').first();
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"], select, [role="combobox"]').first();
    this.emptyState = page.locator('button:has-text("Create Your First Deck")');
  }

  async goto() {
    await super.goto('/decks');
    await this.page.waitForLoadState('networkidle');
  }

  async getDecksCount(): Promise<number> {
    return await this.deckCards.count();
  }

  getDeckByName(name: string): Locator {
    // Find the link containing an h3 with this exact deck name
    return this.page.locator(`a[href*="/decks/"]:has(h3:text-is("${name}"))`).first();
  }

  async clickDeck(name: string) {
    const deck = this.getDeckByName(name);
    await deck.click();
    await this.page.waitForURL('**/decks/**');
  }

  async createDeck(name: string, description?: string) {
    await this.createDeckButton.click();
    await this.modal.waitForOpen();

    const nameInput = this.page.locator('[data-testid="deck-name"], input[name="name"]').first();
    await nameInput.fill(name);

    if (description) {
      const descInput = this.page.locator('[data-testid="deck-description"], textarea[name="description"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill(description);
      }
    }

    await this.modal.confirmAndClose();
    return name;
  }

  async searchDecks(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async deleteDeck(name: string) {
    // Find the delete button near the deck card
    const deleteButton = this.page.locator('button:has-text("Delete deck")').first();
    await deleteButton.click();

    // Confirm deletion in modal
    await this.modal.waitForOpen();
    await this.modal.confirmAndClose();
  }

  async expectDeckExists(name: string) {
    const deck = this.getDeckByName(name);
    await expect(deck).toBeVisible();
  }

  async expectDeckNotExists(name: string) {
    const deck = this.getDeckByName(name);
    await expect(deck).not.toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }
}
