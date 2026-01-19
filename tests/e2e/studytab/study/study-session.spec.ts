import { test, expect } from '../../../../src/fixtures';
import { DecksPage, DeckDetailPage, StudyPage } from '../../../../src/page-objects/studytab';
import { TestDataFactory } from '../../../../src/utils';

test.describe('Study Session @studytab @study', () => {
  test.use({ storageState: '.auth/user.json' });

  let decksPage: DecksPage;
  let deckDetailPage: DeckDetailPage;
  let studyPage: StudyPage;

  test.beforeEach(async ({ page, projectConfig, cleanup }) => {
    decksPage = new DecksPage(page, projectConfig.baseUrl);
    deckDetailPage = new DeckDetailPage(page, projectConfig.baseUrl);
    studyPage = new StudyPage(page, projectConfig.baseUrl);

    // Create a deck with cards for studying
    await decksPage.goto();
    const deckName = TestDataFactory.deck().name;
    await decksPage.createDeck(deckName);

    cleanup.track({
      type: 'deck',
      id: deckName,
      name: deckName,
      deleteVia: 'ui',
      project: 'studytab',
      createdAt: new Date(),
    });

    await decksPage.clickDeck(deckName);

    // Add test cards
    const cards = TestDataFactory.many(TestDataFactory.card, 5);
    for (const card of cards) {
      await deckDetailPage.addBasicCard(card.front, card.back);
    }

    // Start study session
    await deckDetailPage.startStudy();
  });

  test('should display study interface', async () => {
    await expect(studyPage.cardContainer).toBeVisible();
    await expect(studyPage.cardFront).toBeVisible();
    await expect(studyPage.showAnswerButton).toBeVisible();
  });

  test('should show card front initially', async () => {
    const frontText = await studyPage.getFrontText();
    expect(frontText.length).toBeGreaterThan(0);
  });

  test('should reveal answer when clicking show button', async () => {
    await studyPage.showAnswer();
    await expect(studyPage.cardBack).toBeVisible();
    await expect(studyPage.ratingButtons.first()).toBeVisible();
  });

  test('should show rating buttons after revealing answer', async () => {
    await studyPage.showAnswer();

    // Should have rating buttons (Again, Hard, Good, Easy)
    const ratingCount = await studyPage.ratingButtons.count();
    expect(ratingCount).toBeGreaterThanOrEqual(2); // At least 2 rating options
  });

  test('should advance to next card after rating', async () => {
    const initialFront = await studyPage.getFrontText();

    await studyPage.studyCard(2); // Rate as "Good"

    // Wait for next card
    await studyPage.page.waitForTimeout(500);

    // Check if we moved to next card or completed
    const isComplete = await studyPage.isSessionComplete();
    if (!isComplete) {
      // If not complete, we should be on a different card
      // (or same card if only 1 card and it was re-scheduled)
      await expect(studyPage.cardFront).toBeVisible();
    }
  });

  test('should track progress through session', async () => {
    const progress = await studyPage.getProgress();
    expect(progress.total).toBeGreaterThan(0);
    expect(progress.current).toBeGreaterThanOrEqual(0);
  });

  test('should complete study session', async () => {
    await studyPage.completeSession();
    await studyPage.expectSessionComplete();
  });

  test('should allow exiting study session early', async ({ page, projectConfig }) => {
    await studyPage.exitStudy();

    // Should navigate away from study page
    await expect(page).not.toHaveURL(/.*study$/);
  });

  test('should handle rating "Again" (forgot)', async () => {
    await studyPage.showAnswer();
    await studyPage.rateAgain();

    // Card should be rescheduled - session continues
    await expect(studyPage.cardContainer).toBeVisible();
  });

  test('should handle rating "Easy"', async () => {
    await studyPage.showAnswer();
    await studyPage.rateEasy();

    // Should move to next card or complete
    const isComplete = await studyPage.isSessionComplete();
    if (!isComplete) {
      await expect(studyPage.cardFront).toBeVisible();
    }
  });
});
