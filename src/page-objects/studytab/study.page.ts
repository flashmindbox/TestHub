import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudyPage extends BasePage {
  readonly cardContainer: Locator;
  readonly cardFront: Locator;
  readonly cardBack: Locator;
  readonly showAnswerButton: Locator;
  readonly ratingButtons: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly exitButton: Locator;
  readonly completeMessage: Locator;
  readonly sessionStats: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.cardContainer = page.locator('[data-testid="study-card"], .study-card, .flashcard-container').first();
    this.cardFront = page.locator('[data-testid="card-front"], .card-front, .front').first();
    this.cardBack = page.locator('[data-testid="card-back"], .card-back, .back').first();
    this.showAnswerButton = page.locator('[data-testid="show-answer"], button:has-text("Show"), button:has-text("Reveal")').first();
    this.ratingButtons = page.locator('[data-testid="rating-button"], .rating-button, button[data-rating]');
    this.progressBar = page.locator('[data-testid="progress-bar"], .progress-bar, progress').first();
    this.progressText = page.locator('[data-testid="progress-text"], .progress-text').first();
    this.exitButton = page.locator('[data-testid="exit-study"], button:has-text("Exit"), button:has-text("End")').first();
    this.completeMessage = page.locator('[data-testid="study-complete"], .study-complete, .completion-message').first();
    this.sessionStats = page.locator('[data-testid="session-stats"], .session-stats').first();
  }

  async goto() {
    await super.goto('/study');
    await this.page.waitForLoadState('networkidle');
  }

  async getFrontText(): Promise<string> {
    return await this.getText(this.cardFront);
  }

  async getBackText(): Promise<string> {
    return await this.getText(this.cardBack);
  }

  async showAnswer() {
    await this.showAnswerButton.click();
    await this.cardBack.waitFor({ state: 'visible' });
  }

  /**
   * Rate card using SM-2 ratings (0-3)
   * 0 = Again (complete blackout)
   * 1 = Hard (incorrect but remembered after seeing answer)
   * 2 = Good (correct with difficulty)
   * 3 = Easy (correct with ease)
   */
  async rateCard(rating: 0 | 1 | 2 | 3) {
    const ratingButton = this.ratingButtons.nth(rating);
    await ratingButton.click();
  }

  async rateAgain() {
    await this.rateCard(0);
  }

  async rateHard() {
    await this.rateCard(1);
  }

  async rateGood() {
    await this.rateCard(2);
  }

  async rateEasy() {
    await this.rateCard(3);
  }

  async studyCard(rating: 0 | 1 | 2 | 3 = 2) {
    await this.showAnswer();
    await this.rateCard(rating);
  }

  async getProgress(): Promise<{ current: number; total: number }> {
    const text = await this.getText(this.progressText);
    const match = text.match(/(\d+)\s*[\/of]\s*(\d+)/);
    if (match) {
      return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
    }
    return { current: 0, total: 0 };
  }

  async isSessionComplete(): Promise<boolean> {
    return await this.completeMessage.isVisible();
  }

  async exitStudy() {
    await this.exitButton.click();
  }

  async completeSession() {
    while (!(await this.isSessionComplete())) {
      await this.studyCard(2); // Rate all as "Good"
      await this.page.waitForTimeout(300); // Brief wait between cards
    }
  }

  async expectSessionComplete() {
    await expect(this.completeMessage).toBeVisible({ timeout: 30000 });
  }
}
