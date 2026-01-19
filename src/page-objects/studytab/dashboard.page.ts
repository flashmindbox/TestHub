import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { NavigationComponent } from '../_common';

export class DashboardPage extends BasePage {
  readonly navigation: NavigationComponent;
  readonly welcomeHeading: Locator;
  readonly statsSection: Locator;
  readonly recentDecks: Locator;
  readonly studyButton: Locator;
  readonly createDeckButton: Locator;
  readonly streakCounter: Locator;
  readonly dueCardsCount: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.navigation = new NavigationComponent(page);
    this.welcomeHeading = page.getByRole('heading', { name: /welcome back/i });
    this.statsSection = page.locator('main').getByText(/Due Today|Streak|Total Cards|Total Decks/);
    this.recentDecks = page.locator('[data-testid="recent-decks"], .recent-decks, .deck-list');
    this.studyButton = page.locator('button:has-text("Start Study Session"), a:has-text("Start Study Session"), button:has-text("Study"), a:has-text("Study")').first();
    this.createDeckButton = page.locator('button:has-text("Create New Deck"), a:has-text("Create New Deck"), button:has-text("Create"), button:has-text("New Deck")').first();
    this.streakCounter = page.getByText(/\d+\s*days?\s*Streak/i).or(page.getByText(/Streak/i));
    this.dueCardsCount = page.getByText(/\d+\s*Due Today/i).or(page.getByText(/Due Today/i));
  }

  async goto() {
    await super.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async getWelcomeText(): Promise<string> {
    return await this.getText(this.welcomeHeading);
  }

  async getStatsCount(): Promise<number> {
    return await this.statsSection.count();
  }

  async getStreak(): Promise<number> {
    const text = await this.getText(this.streakCounter);
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  async getDueCardsCount(): Promise<number> {
    const text = await this.getText(this.dueCardsCount);
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  async startStudySession() {
    await this.studyButton.click();
    await this.page.waitForURL('**/study**');
  }

  async goToCreateDeck() {
    await this.createDeckButton.click();
  }

  async expectLoaded() {
    await expect(this.welcomeHeading).toBeVisible();
    // Verify stats loaded by checking for common stat text
    await expect(this.page.getByText('Due Today')).toBeVisible();
  }
}
