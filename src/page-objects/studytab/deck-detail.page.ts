import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ModalComponent } from '../_common';

export class DeckDetailPage extends BasePage {
  readonly modal: ModalComponent;
  readonly deckTitle: Locator;
  readonly deckDescription: Locator;
  readonly cardsList: Locator;
  readonly cardItems: Locator;
  readonly addCardButton: Locator;
  readonly studyButton: Locator;
  readonly editDeckButton: Locator;
  readonly deleteDeckButton: Locator;
  readonly cardCount: Locator;
  readonly backButton: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.modal = new ModalComponent(page);
    this.deckTitle = page.locator('[data-testid="deck-title"], h1, .deck-title').first();
    this.deckDescription = page.locator('[data-testid="deck-description"], .deck-description, .description').first();
    this.cardsList = page.locator('[data-testid="cards-list"], .cards-list, .card-grid');
    this.cardItems = page.locator('[data-testid="card-item"], .card-item, .flashcard');
    this.addCardButton = page.locator('[data-testid="add-card"], button:has-text("Add Card"), button:has-text("New Card")').first();
    this.studyButton = page.locator('[data-testid="study-deck"], button:has-text("Study"), a:has-text("Study")').first();
    this.editDeckButton = page.locator('[data-testid="edit-deck"], button:has-text("Edit"), button[aria-label="Edit"]').first();
    this.deleteDeckButton = page.locator('[data-testid="delete-deck"], button:has-text("Delete"), button[aria-label="Delete"]').first();
    this.cardCount = page.locator('[data-testid="card-count"], .card-count').first();
    this.backButton = page.locator('[data-testid="back-button"], a:has-text("Back"), button:has-text("Back")').first();
  }

  async goto(deckId: string) {
    await super.goto(`/decks/${deckId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getDeckTitle(): Promise<string> {
    return await this.getText(this.deckTitle);
  }

  async getCardsCount(): Promise<number> {
    return await this.cardItems.count();
  }

  async addBasicCard(front: string, back: string) {
    await this.addCardButton.click();
    await this.modal.waitForOpen();

    const frontInput = this.page.locator('[data-testid="card-front"], textarea[name="front"], input[name="front"]').first();
    const backInput = this.page.locator('[data-testid="card-back"], textarea[name="back"], input[name="back"]').first();

    await frontInput.fill(front);
    await backInput.fill(back);

    await this.modal.confirmAndClose();
  }

  async editCard(index: number, front: string, back: string) {
    const card = this.cardItems.nth(index);
    const editButton = card.locator('[data-testid="edit-card"], button[aria-label="Edit"]').first();
    await editButton.click();

    await this.modal.waitForOpen();

    const frontInput = this.page.locator('[data-testid="card-front"], textarea[name="front"]').first();
    const backInput = this.page.locator('[data-testid="card-back"], textarea[name="back"]').first();

    await frontInput.clear();
    await frontInput.fill(front);
    await backInput.clear();
    await backInput.fill(back);

    await this.modal.confirmAndClose();
  }

  async deleteCard(index: number) {
    const card = this.cardItems.nth(index);
    const deleteButton = card.locator('[data-testid="delete-card"], button[aria-label="Delete"]').first();
    await deleteButton.click();

    await this.modal.waitForOpen();
    await this.modal.confirmAndClose();
  }

  async startStudy() {
    await this.studyButton.click();
    await this.page.waitForURL('**/study**');
  }

  async goBack() {
    await this.backButton.click();
    await this.page.waitForURL('**/decks');
  }
}
