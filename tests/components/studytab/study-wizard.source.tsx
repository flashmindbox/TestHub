/**
 * Mock StudyWizard component for Playwright CT testing.
 *
 * Mirrors the behavior of the real StudyWizard from
 * StudyTab/apps/web-vite/src/components/study-wizard/
 * without any external dependencies (zustand, router, API hooks).
 */

import React, { useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface WizardCard {
  id: string;
  type: string;
  front: { text?: string; hint?: string; image?: string };
  back: { text?: string; image?: string };
  deck: { id: string; name: string; color: string };
  state?: string;
  interval?: number;
  easeFactor?: number;
  hint?: string;
}

interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
  attempted: number;
  skipped: number;
  correct: number;
  incorrect: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface StudyWizardProps {
  cards: WizardCard[];
  deckName?: string;
  onClose?: () => void;
  onRestart?: () => void;
  onUndo?: () => void;
}

export function StudyWizard({
  cards,
  deckName = 'Test Deck',
  onClose,
  onRestart,
  onUndo,
}: StudyWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    attempted: 0,
    skipped: 0,
    correct: 0,
    incorrect: 0,
  });
  const [history, setHistory] = useState<
    Array<{ index: number; rating?: 1 | 2 | 3 | 4; skipped?: boolean }>
  >([]);

  const currentCard = cards[currentIndex] ?? null;
  const isComplete = completedCount >= cards.length && cards.length > 0;
  const progress = cards.length > 0 ? (completedCount / cards.length) * 100 : 0;
  const canGoBack = history.length > 0;

  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const submitRating = useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      const statKey =
        rating === 1 ? 'again' : rating === 2 ? 'hard' : rating === 3 ? 'good' : 'easy';
      setSessionStats((prev) => ({
        ...prev,
        [statKey]: prev[statKey] + 1,
        attempted: prev.attempted + 1,
      }));
      setHistory((prev) => [...prev, { index: currentIndex, rating }]);
      setCompletedCount((prev) => prev + 1);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
      setShowAnswer(false);
      setShowHint(false);
    },
    [currentIndex, cards.length]
  );

  const skipCard = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setSessionStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
      setHistory((prev) => [...prev, { index: currentIndex, skipped: true }]);
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
      setShowHint(false);
    }
  }, [currentIndex, cards.length]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const lastEntry = newHistory.pop()!;
    setHistory(newHistory);
    setCurrentIndex(lastEntry.index);
    setShowAnswer(false);
    setShowHint(false);

    if (lastEntry.rating) {
      const statKey =
        lastEntry.rating === 1
          ? 'again'
          : lastEntry.rating === 2
            ? 'hard'
            : lastEntry.rating === 3
              ? 'good'
              : 'easy';
      setSessionStats((prev) => ({
        ...prev,
        [statKey]: Math.max(0, prev[statKey] - 1),
        attempted: Math.max(0, prev.attempted - 1),
      }));
      setCompletedCount((prev) => Math.max(0, prev - 1));
    } else if (lastEntry.skipped) {
      setSessionStats((prev) => ({
        ...prev,
        skipped: Math.max(0, prev.skipped - 1),
      }));
    }
    onUndo?.();
  }, [history, onUndo]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      if (e.key === 'Escape') {
        onClose?.();
        return;
      }

      if (!showAnswer) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          revealAnswer();
        }
      } else {
        switch (e.key) {
          case '1':
            submitRating(1);
            break;
          case '2':
            submitRating(2);
            break;
          case '3':
            submitRating(3);
            break;
          case '4':
            submitRating(4);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComplete, showAnswer, revealAnswer, submitRating, onClose]);

  // Completion screen
  if (isComplete) {
    const { again, hard, good, easy } = sessionStats;
    const total = cards.length;
    const score =
      total > 0
        ? Math.round(((again * 0 + hard * 1 + good * 2 + easy * 3) / (total * 3)) * 100)
        : 0;

    const getMessage = () => {
      if (score >= 90) return 'Outstanding!';
      if (score >= 75) return 'Great job!';
      if (score >= 50) return 'Good progress!';
      return 'Keep practicing!';
    };

    return (
      <div data-testid="study-wizard" tabIndex={0}>
        <div data-testid="completion-screen" className="text-center p-8">
          <h2 className="text-xl font-semibold mb-2" data-testid="completion-message">
            {getMessage()}
          </h2>
          <p className="text-sm text-muted-foreground mb-4" data-testid="completion-summary">
            You completed {total} card{total !== 1 ? 's' : ''}
          </p>
          <div data-testid="weighted-score" className="mb-6">
            <span className="text-muted-foreground">Session Score</span>
            <span className="font-semibold ml-2">{score}%</span>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => onRestart?.()}
              data-testid="study-again-btn"
              className="px-4 py-2 rounded-md border"
            >
              Study Again
            </button>
            <button
              onClick={() => onClose?.()}
              data-testid="done-btn"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Done
            </button>
          </div>
        </div>
        <div className="h-1 bg-secondary" data-testid="progress-bar-track">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar-fill"
          />
        </div>
      </div>
    );
  }

  // No cards
  if (!currentCard) {
    return (
      <div data-testid="study-wizard">
        <p data-testid="no-cards">No cards due for review</p>
      </div>
    );
  }

  const frontText =
    typeof currentCard.front === 'string'
      ? currentCard.front
      : currentCard.front?.text ?? '';
  const backText =
    typeof currentCard.back === 'string'
      ? currentCard.back
      : currentCard.back?.text ?? '';
  const hintText = currentCard.hint || currentCard.front?.hint || '';

  return (
    <div data-testid="study-wizard" tabIndex={0}>
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        data-testid="wizard-header"
      >
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              onClick={goBack}
              data-testid="back-button"
              aria-label="Go back"
              className="p-2 rounded-md text-muted-foreground hover:bg-surface-hover"
            >
              ←
            </button>
          )}
          <span className="text-xs text-muted-foreground" data-testid="card-counter">
            {currentIndex + 1} / {cards.length}
          </span>
          <span
            className="rounded-full bg-secondary px-3 py-1 text-xs font-medium"
            data-testid="deck-name-badge"
          >
            {deckName}
          </span>
        </div>
        <button
          onClick={() => onClose?.()}
          data-testid="close-button"
          aria-label="Close"
          className="p-2 rounded-md text-muted-foreground hover:bg-surface-hover"
        >
          ×
        </button>
      </div>

      {/* Card content */}
      <div className="p-6 min-h-[200px]" data-testid="card-content">
        <div data-testid="card-front" className="mb-4">
          <div className="text-sm text-muted-foreground mb-1">Question</div>
          <div className="text-lg" data-testid="front-text">
            {frontText}
          </div>
        </div>

        {showAnswer && (
          <div data-testid="card-back" className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-1">Answer</div>
            <div className="text-lg" data-testid="back-text">
              {backText}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t px-5 py-4 space-y-3" data-testid="wizard-footer">
        {showHint && hintText && !showAnswer && (
          <p
            className="text-center text-sm text-muted-foreground italic"
            data-testid="hint-text"
          >
            {hintText}
          </p>
        )}

        {!showAnswer && (
          <div className="flex gap-3" data-testid="pre-answer-actions">
            <button
              onClick={() => setShowHint(true)}
              disabled={!hintText || showHint}
              data-testid="hint-button"
              className="flex flex-col items-center gap-1 rounded-md border px-4 py-2 text-muted-foreground disabled:opacity-40"
            >
              <span className="text-xs">Hint</span>
            </button>
            <button
              onClick={revealAnswer}
              data-testid="show-answer"
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-primary-foreground"
            >
              Show Answer
            </button>
            <button
              onClick={skipCard}
              data-testid="skip-button"
              className="flex flex-col items-center gap-1 rounded-md border px-4 py-2 text-muted-foreground"
            >
              <span className="text-xs">Skip</span>
            </button>
          </div>
        )}

        {showAnswer && (
          <div className="flex justify-center gap-2" data-testid="rating-buttons">
            <button
              onClick={() => submitRating(1)}
              data-testid="rating-again"
              className="flex flex-col items-center px-4 py-2 rounded-md border border-red-500/50 text-red-500"
            >
              <span className="text-sm font-semibold">Again</span>
            </button>
            <button
              onClick={() => submitRating(2)}
              data-testid="rating-hard"
              className="flex flex-col items-center px-4 py-2 rounded-md border border-orange-500/50 text-orange-500"
            >
              <span className="text-sm font-semibold">Hard</span>
            </button>
            <button
              onClick={() => submitRating(3)}
              data-testid="rating-good"
              className="flex flex-col items-center px-4 py-2 rounded-md border border-green-500/50 text-green-500"
            >
              <span className="text-sm font-semibold">Good</span>
            </button>
            <button
              onClick={() => submitRating(4)}
              data-testid="rating-easy"
              className="flex flex-col items-center px-4 py-2 rounded-md border border-blue-500/50 text-blue-500"
            >
              <span className="text-sm font-semibold">Easy</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary" data-testid="progress-bar-track">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
          data-testid="progress-bar-fill"
        />
      </div>
    </div>
  );
}
