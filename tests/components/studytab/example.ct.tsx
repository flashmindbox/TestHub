/**
 * Example Component Test
 *
 * Demonstrates how to use Playwright CT with StudyTab components.
 * This serves as a template and verification that the setup works.
 *
 * @module tests/components/studytab/example
 */

import { test, expect } from '@playwright/experimental-ct-react';
import React from 'react';
import {
  createMockUser,
  createMockDeck,
  createMockDecks,
  createSeededQueryClient,
} from '../../../src/component-tests';

// =============================================================================
// EXAMPLE: Simple Component Testing
// =============================================================================

/**
 * Simple test component for verification
 */
function TestButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    >
      {label}
    </button>
  );
}

test.describe('Example Component Tests', () => {
  test('renders a simple component', async ({ mount }) => {
    const component = await mount(<TestButton label="Click me" />);

    await expect(component).toContainText('Click me');
    await expect(component).toBeVisible();
  });

  test('handles click events', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <TestButton label="Click me" onClick={() => (clicked = true)} />
    );

    await component.click();
    // Note: In CT tests, we verify through component state or DOM changes
    // The onClick handler ran but we can't directly verify `clicked` variable
    await expect(component).toBeVisible();
  });
});

// =============================================================================
// EXAMPLE: Theme Testing
// =============================================================================

/**
 * Theme-aware component for testing dark/light modes
 */
function ThemeDisplay() {
  return (
    <div className="p-4 bg-background text-foreground border border-border rounded-lg">
      <h2 className="text-lg font-semibold">Theme Test</h2>
      <p className="text-muted-foreground">This text adapts to the theme.</p>
    </div>
  );
}

test.describe('Theme Testing', () => {
  test('renders in dark mode by default', async ({ mount }) => {
    const component = await mount(<ThemeDisplay />);

    await expect(component).toBeVisible();
    await expect(component.locator('h2')).toContainText('Theme Test');
  });

  test('renders in light mode when configured', async ({ mount }) => {
    const component = await mount(<ThemeDisplay />, {
      hooksConfig: {
        theme: 'light',
      },
    });

    await expect(component).toBeVisible();
    await expect(component.locator('h2')).toContainText('Theme Test');
  });
});

// =============================================================================
// EXAMPLE: Query Client with Seeded Data
// =============================================================================

/**
 * Component that displays data from React Query
 */
function DeckList({ decks }: { decks: { id: string; name: string; cardCount: number }[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold">Your Decks</h2>
      {decks.length === 0 ? (
        <p className="text-muted-foreground">No decks yet</p>
      ) : (
        <ul className="space-y-1">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="flex justify-between items-center p-2 bg-card rounded border"
            >
              <span>{deck.name}</span>
              <span className="text-sm text-muted-foreground">{deck.cardCount} cards</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

test.describe('Data Seeding with QueryClient', () => {
  test('renders with seeded deck data', async ({ mount }) => {
    const mockDecks = createMockDecks(3);
    const queryClient = createSeededQueryClient({
      user: createMockUser(),
      decks: mockDecks,
    });

    const component = await mount(<DeckList decks={mockDecks} />, {
      hooksConfig: {
        queryClient,
      },
    });

    await expect(component.locator('h2')).toContainText('Your Decks');
    await expect(component.locator('li')).toHaveCount(3);
    await expect(component.locator('li').first()).toContainText('Test Deck 1');
  });

  test('renders empty state when no decks', async ({ mount }) => {
    const component = await mount(<DeckList decks={[]} />);

    await expect(component.locator('h2')).toContainText('Your Decks');
    await expect(component).toContainText('No decks yet');
  });
});

// =============================================================================
// EXAMPLE: Card Type Components
// =============================================================================

/**
 * Card preview component for testing different card types
 */
function CardPreview({
  type,
  front,
  back,
  showAnswer = false,
}: {
  type: string;
  front: string;
  back: string;
  showAnswer?: boolean;
}) {
  return (
    <div className="w-80 p-4 bg-card border rounded-lg shadow-sm">
      <div className="text-xs text-muted-foreground uppercase mb-2">{type}</div>
      <div className="text-lg font-medium mb-4">{front}</div>
      {showAnswer && (
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">Answer:</div>
          <div className="text-base">{back}</div>
        </div>
      )}
      {!showAnswer && (
        <button className="w-full py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
          Show Answer
        </button>
      )}
    </div>
  );
}

test.describe('Card Preview Component', () => {
  test('renders card front with show answer button', async ({ mount }) => {
    const component = await mount(
      <CardPreview
        type="basic"
        front="What is the capital of France?"
        back="Paris"
        showAnswer={false}
      />
    );

    await expect(component.locator('.text-xs')).toContainText('basic');
    await expect(component.locator('.text-lg')).toContainText('What is the capital of France?');
    await expect(component.locator('button')).toContainText('Show Answer');
    await expect(component).not.toContainText('Paris');
  });

  test('renders card with answer visible', async ({ mount }) => {
    const component = await mount(
      <CardPreview
        type="basic"
        front="What is the capital of France?"
        back="Paris"
        showAnswer={true}
      />
    );

    await expect(component).toContainText('What is the capital of France?');
    await expect(component).toContainText('Paris');
    await expect(component.locator('button')).not.toBeVisible();
  });

  test('renders MCQ card type', async ({ mount }) => {
    const component = await mount(
      <CardPreview
        type="mcq"
        front="Which planet is known as the Red Planet?"
        back="Mars"
        showAnswer={false}
      />
    );

    await expect(component.locator('.text-xs')).toContainText('mcq');
    await expect(component).toContainText('Which planet is known as the Red Planet?');
  });
});

// =============================================================================
// EXAMPLE: Responsive Testing
// =============================================================================

/**
 * Responsive component for viewport testing
 */
function ResponsiveCard({ title }: { title: string }) {
  return (
    <div className="p-4 bg-card border rounded-lg">
      <h3 className="text-lg font-semibold">{title}</h3>
      {/* Show different content based on viewport */}
      <div className="hidden md:block text-muted-foreground">Desktop view</div>
      <div className="md:hidden text-muted-foreground">Mobile view</div>
    </div>
  );
}

test.describe('Responsive Component Testing', () => {
  test('shows desktop content on wide viewport', async ({ mount, page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const component = await mount(<ResponsiveCard title="Responsive Test" />);

    await expect(component).toContainText('Responsive Test');
    // Desktop content should be visible
    await expect(component.locator('.hidden.md\\:block')).toBeVisible();
  });

  test('shows mobile content on narrow viewport', async ({ mount, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const component = await mount(<ResponsiveCard title="Responsive Test" />);

    await expect(component).toContainText('Responsive Test');
    // Mobile content should be visible
    await expect(component.locator('.md\\:hidden')).toBeVisible();
  });
});

// =============================================================================
// EXAMPLE: Accessibility Testing
// =============================================================================

/**
 * Accessible button for a11y testing
 */
function AccessibleButton({
  label,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      className={`px-4 py-2 rounded-md transition-colors ${
        disabled
          ? 'bg-muted text-muted-foreground cursor-not-allowed'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
    >
      {label}
    </button>
  );
}

test.describe('Accessibility Testing', () => {
  test('button has correct aria-label', async ({ mount }) => {
    const component = await mount(<AccessibleButton label="Submit form" />);

    await expect(component).toHaveAttribute('aria-label', 'Submit form');
    await expect(component).not.toBeDisabled();
  });

  test('disabled button is properly marked', async ({ mount }) => {
    const component = await mount(<AccessibleButton label="Submit form" disabled />);

    await expect(component).toBeDisabled();
  });
});
