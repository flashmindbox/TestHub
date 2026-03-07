/**
 * StudyWizard Component Tests
 *
 * Tests for the StudyTab study wizard including card display, flip mechanics,
 * rating buttons, keyboard shortcuts, progress tracking, and session completion.
 *
 * @module tests/components/studytab/study-wizard
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { StudyWizard, type WizardCard } from './study-wizard.source';

// =============================================================================
// TEST DATA HELPERS
// =============================================================================

function createWizardCard(overrides: Partial<WizardCard> = {}): WizardCard {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'BASIC',
    front: { text: 'What is the capital of France?' },
    back: { text: 'Paris' },
    deck: { id: 'deck-1', name: 'Geography', color: '#3b82f6' },
    state: 'NEW',
    interval: 0,
    easeFactor: 2.5,
    hint: '',
    ...overrides,
  };
}

function createCardSet(count: number): WizardCard[] {
  const questions = [
    { front: { text: 'What is 2 + 2?' }, back: { text: '4' } },
    { front: { text: 'What color is the sky?' }, back: { text: 'Blue' } },
    { front: { text: 'What is H2O?' }, back: { text: 'Water' } },
    { front: { text: 'Capital of Japan?' }, back: { text: 'Tokyo' } },
    { front: { text: 'Largest planet?' }, back: { text: 'Jupiter' } },
  ];

  return Array.from({ length: count }, (_, i) => {
    const q = questions[i % questions.length];
    return createWizardCard({
      id: `card-${i + 1}`,
      front: q.front,
      back: q.back,
    });
  });
}

// =============================================================================
// RENDERING TESTS
// =============================================================================

test.describe('StudyWizard - Rendering', () => {
  test('renders without crashing', async ({ mount }) => {
    const cards = createCardSet(3);

    const component = await mount(<StudyWizard cards={cards} />);

    await expect(component).toBeVisible();
    await expect(component.getByTestId('card-front')).toBeVisible();
  });

  test('shows card front content', async ({ mount }) => {
    const cards = [createWizardCard({ front: { text: 'What is the speed of light?' } })];

    const component = await mount(<StudyWizard cards={cards} />);

    await expect(component.getByTestId('front-text')).toContainText('What is the speed of light?');
  });

  test('card type renders correctly with Basic card data', async ({ mount }) => {
    const card = createWizardCard({
      type: 'BASIC',
      front: { text: 'Define photosynthesis' },
      back: { text: 'The process by which plants convert sunlight to energy' },
      state: 'REVIEW',
      interval: 7,
      easeFactor: 2.5,
    });

    const component = await mount(<StudyWizard cards={[card]} />);

    await expect(component.getByTestId('front-text')).toContainText('Define photosynthesis');
    await expect(component.getByTestId('card-back')).not.toBeVisible();
  });
});

// =============================================================================
// FLIP MECHANICS TESTS
// =============================================================================

test.describe('StudyWizard - Card Flip', () => {
  test('flips card on click', async ({ mount }) => {
    const cards = [
      createWizardCard({
        front: { text: 'Question' },
        back: { text: 'Answer revealed' },
      }),
    ];

    const component = await mount(<StudyWizard cards={cards} />);

    await expect(component.getByTestId('card-back')).not.toBeVisible();
    await component.getByTestId('show-answer').click();
    await expect(component.getByTestId('card-back')).toBeVisible();
    await expect(component.getByTestId('back-text')).toContainText('Answer revealed');
  });

  test('flips card on Space key', async ({ mount, page }) => {
    const cards = [createWizardCard({ back: { text: 'Space answer' } })];

    const component = await mount(<StudyWizard cards={cards} />);

    await expect(component.getByTestId('card-back')).not.toBeVisible();
    await page.keyboard.press('Space');
    await expect(component.getByTestId('card-back')).toBeVisible();
  });

  test('flips card on Enter key', async ({ mount, page }) => {
    const cards = [createWizardCard({ back: { text: 'Enter answer' } })];

    const component = await mount(<StudyWizard cards={cards} />);

    await expect(component.getByTestId('card-back')).not.toBeVisible();
    await page.keyboard.press('Enter');
    await expect(component.getByTestId('card-back')).toBeVisible();
  });

  test('shows back content after flip', async ({ mount }) => {
    const cards = [
      createWizardCard({
        front: { text: 'What is DNA?' },
        back: { text: 'Deoxyribonucleic acid' },
      }),
    ];

    const component = await mount(<StudyWizard cards={cards} />);

    await component.getByTestId('show-answer').click();

    await expect(component.getByTestId('back-text')).toContainText('Deoxyribonucleic acid');
    await expect(component.getByTestId('card-front')).toBeVisible();
  });
});

// =============================================================================
// RATING BUTTONS TESTS
// =============================================================================

test.describe('StudyWizard - Rating', () => {
  test('rating buttons appear after flip (4 buttons: Again, Hard, Good, Easy)', async ({
    mount,
  }) => {
    const cards = createCardSet(3);

    const component = await mount(<StudyWizard cards={cards} />);

    // Before flip - no rating buttons
    await expect(component.getByTestId('rating-buttons')).not.toBeVisible();

    // Flip
    await component.getByTestId('show-answer').click();

    // After flip - rating buttons visible
    await expect(component.getByTestId('rating-buttons')).toBeVisible();
    await expect(component.getByTestId('rating-again')).toContainText('Again');
    await expect(component.getByTestId('rating-hard')).toContainText('Hard');
    await expect(component.getByTestId('rating-good')).toContainText('Good');
    await expect(component.getByTestId('rating-easy')).toContainText('Easy');
  });

  test('keyboard shortcuts 1-4 select ratings', async ({ mount, page }) => {
    const cards = createCardSet(4);

    const component = await mount(<StudyWizard cards={cards} />);

    // Flip and rate with key 3 (Good)
    await page.keyboard.press('Space');
    await page.keyboard.press('3');

    // Should advance to next card (answer hidden again)
    await expect(component.getByTestId('card-back')).not.toBeVisible();
    await expect(component.getByTestId('card-counter')).toContainText('2 / 4');
  });
});

// =============================================================================
// PROGRESS BAR TESTS
// =============================================================================

test.describe('StudyWizard - Progress', () => {
  test('progress bar updates after rating', async ({ mount }) => {
    const cards = createCardSet(4);

    const component = await mount(<StudyWizard cards={cards} />);

    // Initially 0%
    const fill = component.getByTestId('progress-bar-fill');
    await expect(fill).toHaveAttribute('style', 'width: 0%;');

    // Complete first card
    await component.getByTestId('show-answer').click();
    await component.getByTestId('rating-good').click();

    // Should be 25% (1/4)
    await expect(fill).toHaveAttribute('style', 'width: 25%;');
  });
});

// =============================================================================
// SKIP & HINT TESTS
// =============================================================================

test.describe('StudyWizard - Skip & Hint', () => {
  test('skip button works', async ({ mount }) => {
    const cards = createCardSet(3);

    const component = await mount(<StudyWizard cards={cards} />);

    await expect(component.getByTestId('card-counter')).toContainText('1 / 3');
    await component.getByTestId('skip-button').click();
    await expect(component.getByTestId('card-counter')).toContainText('2 / 3');
  });

  test('hint button shows hint text when available', async ({ mount }) => {
    const cards = [
      createWizardCard({
        front: { text: 'Capital of France?', hint: 'City of Lights' },
        hint: 'City of Lights',
      }),
    ];

    const component = await mount(<StudyWizard cards={cards} />);

    // Hint not visible initially
    await expect(component.getByTestId('hint-text')).not.toBeVisible();

    // Click hint button
    await component.getByTestId('hint-button').click();

    // Hint visible
    await expect(component.getByTestId('hint-text')).toContainText('City of Lights');
  });
});

// =============================================================================
// KEYBOARD CLOSE TEST
// =============================================================================

test.describe('StudyWizard - Keyboard Close', () => {
  test('ESC key triggers close callback', async ({ mount, page }) => {
    const cards = createCardSet(2);
    let closed = false;

    await mount(<StudyWizard cards={cards} onClose={() => (closed = true)} />);

    await page.keyboard.press('Escape');

    expect(closed).toBe(true);
  });
});

// =============================================================================
// SESSION COMPLETION TESTS
// =============================================================================

test.describe('StudyWizard - Completion', () => {
  test('session completion screen shows when all cards reviewed', async ({ mount }) => {
    const cards = [createWizardCard()];

    const component = await mount(<StudyWizard cards={cards} />);

    // Flip and rate
    await component.getByTestId('show-answer').click();
    await component.getByTestId('rating-good').click();

    // Completion screen should appear
    await expect(component.getByTestId('completion-screen')).toBeVisible();
    await expect(component.getByTestId('completion-summary')).toContainText('1 card');
  });

  test('completion shows weighted score', async ({ mount }) => {
    const cards = createCardSet(2);

    const component = await mount(<StudyWizard cards={cards} />);

    // Rate first card Easy (3 points)
    await component.getByTestId('show-answer').click();
    await component.getByTestId('rating-easy').click();

    // Rate second card Good (2 points)
    await component.getByTestId('show-answer').click();
    await component.getByTestId('rating-good').click();

    // Weighted score: (3+2)/(2*3) = 5/6 = 83%
    await expect(component.getByTestId('weighted-score')).toContainText('83%');
  });

  test('"Study Again" button triggers restart callback', async ({ mount }) => {
    const cards = [createWizardCard()];
    let restarted = false;

    const component = await mount(
      <StudyWizard cards={cards} onRestart={() => (restarted = true)} />
    );

    // Complete the session
    await component.getByTestId('show-answer').click();
    await component.getByTestId('rating-good').click();

    // Click Study Again
    await component.getByTestId('study-again-btn').click();

    expect(restarted).toBe(true);
  });
});

// =============================================================================
// UNDO / BACK TESTS
// =============================================================================

test.describe('StudyWizard - Undo', () => {
  test('back arrow triggers undo callback', async ({ mount }) => {
    const cards = createCardSet(3);
    let undoCalled = false;

    const component = await mount(
      <StudyWizard cards={cards} onUndo={() => (undoCalled = true)} />
    );

    // No back button initially
    await expect(component.getByTestId('back-button')).not.toBeVisible();

    // Rate first card to create history
    await component.getByTestId('show-answer').click();
    await component.getByTestId('rating-good').click();

    // Now on card 2, back button should appear
    await expect(component.getByTestId('back-button')).toBeVisible();
    await expect(component.getByTestId('card-counter')).toContainText('2 / 3');

    // Go back
    await component.getByTestId('back-button').click();

    expect(undoCalled).toBe(true);
    await expect(component.getByTestId('card-counter')).toContainText('1 / 3');
  });
});
