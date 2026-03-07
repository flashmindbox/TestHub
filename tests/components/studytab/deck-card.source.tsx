/**
 * Mock DeckCard component for Playwright CT testing.
 *
 * Mirrors the real DeckCard from StudyTab's dashboard
 * without external dependencies.
 */

import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface Deck {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  cardCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

interface DeckCardProps {
  deck: Deck;
  onEdit?: (deck: Deck) => void;
  onDelete?: (deck: Deck) => void;
  onStudy?: (deck: Deck) => void;
  onClick?: (deck: Deck) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DeckCard({ deck, onEdit, onDelete, onStudy, onClick }: DeckCardProps) {
  const dueCount = deck.newCount + deck.learningCount + deck.reviewCount;
  const hasDueCards = dueCount > 0;
  const progressPercent = deck.cardCount > 0
    ? Math.round((deck.reviewCount / deck.cardCount) * 100)
    : 0;

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
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid="action-buttons"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onStudy?.(deck); }}
              className="p-1 rounded hover:bg-muted"
              aria-label="Study deck"
              data-testid="deck-study-btn"
            >
              S
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(deck); }}
              className="p-1 rounded hover:bg-muted"
              aria-label="Edit deck"
              data-testid="deck-edit-btn"
            >
              E
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(deck); }}
              className="p-1 rounded hover:bg-destructive/10 text-destructive"
              aria-label="Delete deck"
              data-testid="deck-delete-btn"
            >
              D
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

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden" data-testid="progress-bar-track">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
              data-testid="progress-bar-fill"
            />
          </div>
        </div>

        {/* Due count badge */}
        {hasDueCards && (
          <div className="flex flex-wrap gap-2 mb-3" data-testid="due-badge">
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
              {dueCount} due
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground" data-testid="card-count">
            {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
          </span>

          {hasDueCards ? (
            <button
              onClick={(e) => { e.stopPropagation(); onStudy?.(deck); }}
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
