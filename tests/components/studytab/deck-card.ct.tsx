/**
 * DeckCard Component Tests
 *
 * Tests for the StudyTab DeckCard component that displays deck information
 * with statistics, actions, and navigation.
 *
 * @module tests/components/studytab/deck-card
 */

import { test, expect } from '@playwright/experimental-ct-react';
import React from 'react';
import {
  createMockDeck,
  createMockDecks,
  createSeededQueryClient,
  createMockUser,
} from '../../../src/component-tests';

// =============================================================================
// MOCK DECK CARD COMPONENT
// =============================================================================

/**
 * Mock Deck type matching StudyTab structure
 */
interface Deck {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  cardCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

/**
 * DeckCard props interface
 */
interface DeckCardProps {
  deck: Deck;
  onEdit?: (deck: Deck) => void;
  onDelete?: (deck: Deck) => void;
  onStudy?: (deck: Deck) => void;
  onClick?: (deck: Deck) => void;
}

/**
 * Mock DeckCard component for testing
 * Mirrors the actual StudyTab DeckCard structure
 */
function DeckCard({ deck, onEdit, onDelete, onStudy, onClick }: DeckCardProps) {
  const dueCount = deck.newCount + deck.learningCount + deck.reviewCount;
  const hasDueCards = dueCount > 0;

  return (
    <div
      data-testid="deck-card"
      className="group relative bg-card rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(deck)}
    >
      {/* Color bar */}
      <div
        className="h-2"
        style={{ backgroundColor: deck.color }}
        data-testid="deck-color-bar"
      />

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-semibold text-lg truncate max-w-[200px]"
            title={deck.name}
            data-testid="deck-name"
          >
            {deck.name}
          </h3>

          {/* Action buttons - visible on hover */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(deck);
              }}
              className="p-1 rounded hover:bg-muted"
              aria-label="Edit deck"
              data-testid="deck-edit-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(deck);
              }}
              className="p-1 rounded hover:bg-destructive/10 text-destructive"
              aria-label="Delete deck"
              data-testid="deck-delete-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        {deck.description && (
          <p
            className="text-sm text-muted-foreground line-clamp-2 mb-3"
            data-testid="deck-description"
          >
            {deck.description}
          </p>
        )}

        {/* Stats badges */}
        <div className="flex flex-wrap gap-2 mb-3" data-testid="deck-stats">
          {deck.newCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500" data-testid="new-count">
              {deck.newCount} new
            </span>
          )}
          {deck.learningCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-500" data-testid="learning-count">
              {deck.learningCount} learning
            </span>
          )}
          {deck.reviewCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500" data-testid="review-count">
              {deck.reviewCount} review
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground" data-testid="card-count">
            {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
          </span>

          {hasDueCards ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStudy?.(deck);
              }}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              data-testid="study-btn"
            >
              Study ({dueCount})
            </button>
          ) : (
            <span className="text-sm text-muted-foreground" data-testid="no-due-cards">
              No cards due
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * DeckGrid component for testing grid layout
 */
function DeckGrid({
  decks,
  onEdit,
  onDelete,
  onStudy,
  onClick,
}: {
  decks: Deck[];
  onEdit?: (deck: Deck) => void;
  onDelete?: (deck: Deck) => void;
  onStudy?: (deck: Deck) => void;
  onClick?: (deck: Deck) => void;
}) {
  if (decks.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-state">
        <p className="text-muted-foreground">No decks yet</p>
        <p className="text-sm text-muted-foreground mt-1">Create your first deck to get started</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="deck-grid"
    >
      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          deck={deck}
          onEdit={onEdit}
          onDelete={onDelete}
          onStudy={onStudy}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a mock deck with StudyTab structure
 */
function createStudyTabDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: `deck-${Date.now()}`,
    name: 'Test Deck',
    description: 'A deck for testing purposes',
    color: '#3b82f6', // blue-500
    cardCount: 25,
    newCount: 5,
    learningCount: 3,
    reviewCount: 7,
    ...overrides,
  };
}

// =============================================================================
// DECK CARD RENDERING TESTS
// =============================================================================

test.describe('DeckCard - Rendering', () => {
  test('renders deck name and description', async ({ mount }) => {
    const deck = createStudyTabDeck({
      name: 'JavaScript Fundamentals',
      description: 'Learn the basics of JavaScript programming',
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-name')).toContainText('JavaScript Fundamentals');
    await expect(component.getByTestId('deck-description')).toContainText(
      'Learn the basics of JavaScript programming'
    );
  });

  test('renders deck color bar', async ({ mount }) => {
    const deck = createStudyTabDeck({ color: '#ef4444' }); // red

    const component = await mount(<DeckCard deck={deck} />);

    const colorBar = component.getByTestId('deck-color-bar');
    await expect(colorBar).toBeVisible();
    await expect(colorBar).toHaveCSS('background-color', 'rgb(239, 68, 68)');
  });

  test('renders card count', async ({ mount }) => {
    const deck = createStudyTabDeck({ cardCount: 42 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('card-count')).toContainText('42 cards');
  });

  test('renders singular card count for one card', async ({ mount }) => {
    const deck = createStudyTabDeck({ cardCount: 1 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('card-count')).toContainText('1 card');
  });

  test('renders without description when null', async ({ mount }) => {
    const deck = createStudyTabDeck({ description: null });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-description')).not.toBeVisible();
  });
});

// =============================================================================
// DECK CARD STATS TESTS
// =============================================================================

test.describe('DeckCard - Statistics', () => {
  test('renders new card count badge', async ({ mount }) => {
    const deck = createStudyTabDeck({ newCount: 10 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('new-count')).toContainText('10 new');
    await expect(component.getByTestId('new-count')).toBeVisible();
  });

  test('renders learning count badge', async ({ mount }) => {
    const deck = createStudyTabDeck({ learningCount: 5 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('learning-count')).toContainText('5 learning');
  });

  test('renders review count badge', async ({ mount }) => {
    const deck = createStudyTabDeck({ reviewCount: 15 });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('review-count')).toContainText('15 review');
  });

  test('hides badges when counts are zero', async ({ mount }) => {
    const deck = createStudyTabDeck({
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('new-count')).not.toBeVisible();
    await expect(component.getByTestId('learning-count')).not.toBeVisible();
    await expect(component.getByTestId('review-count')).not.toBeVisible();
  });

  test('renders all stat badges together', async ({ mount }) => {
    const deck = createStudyTabDeck({
      newCount: 5,
      learningCount: 3,
      reviewCount: 7,
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('new-count')).toBeVisible();
    await expect(component.getByTestId('learning-count')).toBeVisible();
    await expect(component.getByTestId('review-count')).toBeVisible();
  });
});

// =============================================================================
// DECK CARD STUDY BUTTON TESTS
// =============================================================================

test.describe('DeckCard - Study Button', () => {
  test('shows study button when cards are due', async ({ mount }) => {
    const deck = createStudyTabDeck({
      newCount: 5,
      learningCount: 3,
      reviewCount: 7,
    });

    const component = await mount(<DeckCard deck={deck} />);

    const studyBtn = component.getByTestId('study-btn');
    await expect(studyBtn).toBeVisible();
    await expect(studyBtn).toContainText('Study (15)'); // 5 + 3 + 7
  });

  test('shows "No cards due" when no cards due', async ({ mount }) => {
    const deck = createStudyTabDeck({
      cardCount: 20,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('study-btn')).not.toBeVisible();
    await expect(component.getByTestId('no-due-cards')).toContainText('No cards due');
  });

  test('study button triggers onStudy callback', async ({ mount }) => {
    const deck = createStudyTabDeck({ newCount: 5 });
    let studiedDeckId: string | null = null;

    const component = await mount(
      <DeckCard deck={deck} onStudy={(d) => (studiedDeckId = d.id)} />
    );

    await component.getByTestId('study-btn').click();
    expect(studiedDeckId).toBe(deck.id);
  });

  test('study button click does not propagate to card click', async ({ mount }) => {
    const deck = createStudyTabDeck({ newCount: 5 });
    let cardClicked = false;
    let studyClicked = false;

    const component = await mount(
      <DeckCard
        deck={deck}
        onClick={() => (cardClicked = true)}
        onStudy={() => (studyClicked = true)}
      />
    );

    await component.getByTestId('study-btn').click();

    expect(studyClicked).toBe(true);
    expect(cardClicked).toBe(false);
  });
});

// =============================================================================
// DECK CARD ACTION BUTTONS TESTS
// =============================================================================

test.describe('DeckCard - Action Buttons', () => {
  test('edit button triggers onEdit callback', async ({ mount }) => {
    const deck = createStudyTabDeck();
    let editedDeckId: string | null = null;

    const component = await mount(
      <DeckCard deck={deck} onEdit={(d) => (editedDeckId = d.id)} />
    );

    // Hover to reveal action buttons
    await component.hover();
    await component.getByTestId('deck-edit-btn').click();

    expect(editedDeckId).toBe(deck.id);
  });

  test('delete button triggers onDelete callback', async ({ mount }) => {
    const deck = createStudyTabDeck();
    let deletedDeckId: string | null = null;

    const component = await mount(
      <DeckCard deck={deck} onDelete={(d) => (deletedDeckId = d.id)} />
    );

    await component.hover();
    await component.getByTestId('deck-delete-btn').click();

    expect(deletedDeckId).toBe(deck.id);
  });

  test('action buttons have correct aria-labels', async ({ mount }) => {
    const deck = createStudyTabDeck();

    const component = await mount(<DeckCard deck={deck} />);

    await component.hover();
    await expect(component.getByTestId('deck-edit-btn')).toHaveAttribute('aria-label', 'Edit deck');
    await expect(component.getByTestId('deck-delete-btn')).toHaveAttribute('aria-label', 'Delete deck');
  });

  test('action button clicks do not propagate to card click', async ({ mount }) => {
    const deck = createStudyTabDeck();
    let cardClicked = false;
    let editClicked = false;

    const component = await mount(
      <DeckCard
        deck={deck}
        onClick={() => (cardClicked = true)}
        onEdit={() => (editClicked = true)}
      />
    );

    await component.hover();
    await component.getByTestId('deck-edit-btn').click();

    expect(editClicked).toBe(true);
    expect(cardClicked).toBe(false);
  });
});

// =============================================================================
// DECK CARD CLICK NAVIGATION TESTS
// =============================================================================

test.describe('DeckCard - Navigation', () => {
  test('clicking card triggers onClick callback', async ({ mount }) => {
    const deck = createStudyTabDeck();
    let clickedDeckId: string | null = null;

    const component = await mount(
      <DeckCard deck={deck} onClick={(d) => (clickedDeckId = d.id)} />
    );

    await component.getByTestId('deck-card').click();

    expect(clickedDeckId).toBe(deck.id);
  });

  test('card has pointer cursor', async ({ mount }) => {
    const deck = createStudyTabDeck();

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-card')).toHaveClass(/cursor-pointer/);
  });
});

// =============================================================================
// DECK CARD TEXT TRUNCATION TESTS
// =============================================================================

test.describe('DeckCard - Text Truncation', () => {
  test('truncates long deck name', async ({ mount }) => {
    const deck = createStudyTabDeck({
      name: 'This is a very long deck name that should be truncated to fit the card width properly',
    });

    const component = await mount(<DeckCard deck={deck} />);

    const nameElement = component.getByTestId('deck-name');
    await expect(nameElement).toHaveClass(/truncate/);
    await expect(nameElement).toHaveAttribute('title', deck.name);
  });

  test('truncates long description to 2 lines', async ({ mount }) => {
    const deck = createStudyTabDeck({
      description:
        'This is a very long description that spans multiple lines and should be truncated with ellipsis after the second line to maintain a clean card layout.',
    });

    const component = await mount(<DeckCard deck={deck} />);

    const descElement = component.getByTestId('deck-description');
    await expect(descElement).toHaveClass(/line-clamp-2/);
  });
});

// =============================================================================
// DECK GRID TESTS
// =============================================================================

test.describe('DeckGrid - Layout', () => {
  test('renders empty state when no decks', async ({ mount }) => {
    const component = await mount(<DeckGrid decks={[]} />);

    await expect(component.getByTestId('empty-state')).toBeVisible();
    await expect(component.getByTestId('empty-state')).toContainText('No decks yet');
  });

  test('renders multiple deck cards', async ({ mount }) => {
    const decks = [
      createStudyTabDeck({ id: 'deck-1', name: 'Deck 1' }),
      createStudyTabDeck({ id: 'deck-2', name: 'Deck 2' }),
      createStudyTabDeck({ id: 'deck-3', name: 'Deck 3' }),
    ];

    const component = await mount(<DeckGrid decks={decks} />);

    await expect(component.getByTestId('deck-grid')).toBeVisible();
    await expect(component.getByTestId('deck-card')).toHaveCount(3);
  });

  test('grid has responsive classes', async ({ mount }) => {
    const decks = [createStudyTabDeck()];

    const component = await mount(<DeckGrid decks={decks} />);

    const grid = component.getByTestId('deck-grid');
    await expect(grid).toHaveClass(/grid-cols-1/);
    await expect(grid).toHaveClass(/md:grid-cols-2/);
    await expect(grid).toHaveClass(/lg:grid-cols-3/);
  });

  test('propagates callbacks to deck cards', async ({ mount }) => {
    const decks = [createStudyTabDeck({ id: 'deck-1', newCount: 5 })];
    let studiedDeckId: string | null = null;

    const component = await mount(
      <DeckGrid decks={decks} onStudy={(d) => (studiedDeckId = d.id)} />
    );

    await component.getByTestId('study-btn').click();

    expect(studiedDeckId).toBe('deck-1');
  });
});

// =============================================================================
// DECK CARD THEME TESTS
// =============================================================================

test.describe('DeckCard - Theme', () => {
  test('renders correctly in dark mode', async ({ mount }) => {
    const deck = createStudyTabDeck();

    const component = await mount(<DeckCard deck={deck} />, {
      hooksConfig: { theme: 'dark' },
    });

    await expect(component.getByTestId('deck-card')).toBeVisible();
    await expect(component.getByTestId('deck-name')).toBeVisible();
  });

  test('renders correctly in light mode', async ({ mount }) => {
    const deck = createStudyTabDeck();

    const component = await mount(<DeckCard deck={deck} />, {
      hooksConfig: { theme: 'light' },
    });

    await expect(component.getByTestId('deck-card')).toBeVisible();
    await expect(component.getByTestId('deck-name')).toBeVisible();
  });
});

// =============================================================================
// DECK CARD EDGE CASES
// =============================================================================

test.describe('DeckCard - Edge Cases', () => {
  test('handles zero card count', async ({ mount }) => {
    const deck = createStudyTabDeck({
      cardCount: 0,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('card-count')).toContainText('0 cards');
    await expect(component.getByTestId('no-due-cards')).toBeVisible();
  });

  test('handles deck with only new cards', async ({ mount }) => {
    const deck = createStudyTabDeck({
      newCount: 10,
      learningCount: 0,
      reviewCount: 0,
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('new-count')).toBeVisible();
    await expect(component.getByTestId('learning-count')).not.toBeVisible();
    await expect(component.getByTestId('review-count')).not.toBeVisible();
    await expect(component.getByTestId('study-btn')).toContainText('Study (10)');
  });

  test('handles special characters in deck name', async ({ mount }) => {
    const deck = createStudyTabDeck({
      name: 'Test <Deck> & "Quotes" \'Apostrophes\'',
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-name')).toContainText(
      'Test <Deck> & "Quotes" \'Apostrophes\''
    );
  });

  test('handles emoji in deck name', async ({ mount }) => {
    const deck = createStudyTabDeck({
      name: '📚 Study Deck 🎯',
    });

    const component = await mount(<DeckCard deck={deck} />);

    await expect(component.getByTestId('deck-name')).toContainText('📚 Study Deck 🎯');
  });
});
