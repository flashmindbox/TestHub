/**
 * DeckCard Component Tests
 *
 * Tests for the StudyTab DeckCard component that displays deck information
 * with statistics, color bar, progress, actions, and navigation.
 *
 * @module tests/components/studytab/deck-card
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { DeckCard, type Deck } from './deck-card.source';

// =============================================================================
// TEST DATA HELPERS
// =============================================================================

function createDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: `deck-${Date.now()}`,
    name: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    color: '#3b82f6',
    cardCount: 42,
    newCount: 5,
    learningCount: 3,
    reviewCount: 7,
    ...overrides,
  };
}

// =============================================================================
// RENDERING TESTS
// =============================================================================

test.describe('DeckCard - Rendering', () => {
  test('renders deck name and description', async ({ mount }) => {
    const deck = createDeck({
      name: 'Organic Chemistry',
      description: 'Reactions and mechanisms for OChem II',
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-name')).toContainText('Organic Chemistry');
    await expect(component.getByTestId('deck-description')).toContainText('Reactions and mechanisms');
  });

  test('shows card count', async ({ mount }) => {
    const deck = createDeck({ cardCount: 42 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('card-count')).toContainText('42 cards');
  });

  test('displays color bar with deck color', async ({ mount }) => {
    const deck = createDeck({ color: '#ef4444' });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-color-bar')).toHaveCSS(
      'background-color',
      'rgb(239, 68, 68)'
    );
  });
});

// =============================================================================
// PROGRESS BAR TESTS
// =============================================================================

test.describe('DeckCard - Progress', () => {
  test('progress bar shows correct percentage', async ({ mount }) => {
    // 10 review out of 40 total = 25%
    const deck = createDeck({ cardCount: 40, reviewCount: 10 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('progress-bar-fill')).toHaveAttribute(
      'style',
      'width: 25%;'
    );
  });
});

// =============================================================================
// ACTION BUTTONS TESTS
// =============================================================================

test.describe('DeckCard - Actions', () => {
  test('action buttons are hidden by default', async ({ mount }) => {
    const deck = createDeck();

    const component = await mount(<DeckCard deck={deck} />);

    // The container has opacity-0 by default (group-hover:opacity-100)
    await expect(component.getByTestId('action-buttons')).toHaveClass(/opacity-0/);
  });

  test('hover reveals action buttons', async ({ mount }) => {
    const deck = createDeck();

    const component = await mount(<DeckCard deck={deck} />);

    await component.hover();

    // group-hover:opacity-100 triggers on parent hover
    await expect(component.getByTestId('action-buttons')).toHaveClass(/group-hover:opacity-100/);
  });
});

// =============================================================================
// CALLBACK TESTS
// =============================================================================

test.describe('DeckCard - Callbacks', () => {
  test('click on deck triggers navigation callback', async ({ mount }) => {
    const deck = createDeck({ id: 'deck-nav-1' });
    let clickedId: string | null = null;

    const component = await mount(
      <DeckCard deck={deck} onClick={(d) => (clickedId = d.id)} />
    );

    await component.click();

    expect(clickedId).toBe('deck-nav-1');
  });

  test('study button triggers study callback', async ({ mount }) => {
    const deck = createDeck({ id: 'deck-study-1', newCount: 5 });
    let studiedId: string | null = null;

    const component = await mount(
      <DeckCard deck={deck} onStudy={(d) => (studiedId = d.id)} />
    );

    await component.getByTestId('study-btn').click();

    expect(studiedId).toBe('deck-study-1');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

test.describe('DeckCard - Edge Cases', () => {
  test('empty deck shows "0 cards" state', async ({ mount }) => {
    const deck = createDeck({
      cardCount: 0,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('card-count')).toContainText('0 cards');
    await expect(component.getByTestId('no-due-cards')).toContainText('No cards due');
  });

  test('due count badge shows when cards are due', async ({ mount }) => {
    const deck = createDeck({ newCount: 3, learningCount: 2, reviewCount: 5 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('due-badge')).toBeVisible();
    await expect(component.getByTestId('due-badge')).toContainText('10 due');
  });
});
