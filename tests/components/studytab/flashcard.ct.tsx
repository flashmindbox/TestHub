/**
 * Flashcard/StudyCard Component Tests
 *
 * Tests for StudyTab card display components including BasicCard, McqCard,
 * ClozeCard, and TrueFalseCard with flip mechanics, interactions, and accessibility.
 *
 * @module tests/components/studytab/flashcard
 */

import { test, expect } from '@playwright/experimental-ct-react';
import React, { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Card type enum matching StudyTab
 */
type CardType =
  | 'BASIC'
  | 'BASIC_REVERSED'
  | 'CLOZE'
  | 'MCQ'
  | 'TRUE_FALSE'
  | 'ORDERING'
  | 'MATCHING';

/**
 * MCQ Option type
 */
interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

/**
 * Study Card type matching StudyTab structure
 */
interface StudyCard {
  id: string;
  type: CardType;
  front: {
    text?: string;
    image?: string;
    audio?: string;
    hint?: string;
    options?: McqOption[];
    clozeText?: string;
    isTrue?: boolean;
    explanation?: string;
  };
  back: {
    text?: string;
    image?: string;
  };
}

// =============================================================================
// MOCK BASIC CARD COMPONENT
// =============================================================================

interface BasicCardProps {
  card: StudyCard;
  isFlipped: boolean;
  reversed?: boolean;
  onFlip?: () => void;
}

/**
 * Mock BasicCard component mirroring StudyTab structure
 */
function BasicCard({ card, isFlipped, reversed = false, onFlip }: BasicCardProps) {
  const frontContent = reversed ? card.back.text : card.front.text;
  const backContent = reversed ? card.front.text : card.back.text;

  return (
    <div
      className="w-full max-w-lg mx-auto"
      data-testid="basic-card"
      role="article"
      aria-label="Flashcard"
    >
      {/* Question Face */}
      <div
        className="p-6 bg-card border rounded-lg mb-4"
        data-testid="card-front"
      >
        <div className="text-sm text-muted-foreground mb-2">Question</div>
        {frontContent ? (
          <div className="text-lg" data-testid="front-content">
            {frontContent}
          </div>
        ) : (
          <div className="text-muted-foreground italic">No content</div>
        )}
        {card.front.image && (
          <img
            src={card.front.image}
            alt="Card image"
            className="mt-4 max-h-48 mx-auto rounded"
            data-testid="front-image"
          />
        )}
        {card.front.hint && !isFlipped && (
          <div className="mt-4 text-sm text-muted-foreground" data-testid="hint">
            Hint: {card.front.hint}
          </div>
        )}
      </div>

      {/* Answer Face */}
      {isFlipped && (
        <div
          className="p-6 bg-card border rounded-lg border-primary animate-fade-in"
          data-testid="card-back"
        >
          <div className="text-sm text-muted-foreground mb-2">Answer</div>
          {backContent ? (
            <div className="text-lg" data-testid="back-content">
              {backContent}
            </div>
          ) : (
            <div className="text-muted-foreground italic">No content</div>
          )}
          {card.back.image && (
            <img
              src={card.back.image}
              alt="Answer image"
              className="mt-4 max-h-48 mx-auto rounded"
              data-testid="back-image"
            />
          )}
        </div>
      )}

      {/* Flip Button */}
      {!isFlipped && (
        <button
          onClick={onFlip}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          data-testid="flip-button"
          aria-label="Show answer"
        >
          Show Answer
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MOCK MCQ CARD COMPONENT
// =============================================================================

interface McqCardProps {
  card: StudyCard;
  onAnswerSubmit?: (isCorrect: boolean) => void;
  multiSelect?: boolean;
}

function McqCard({ card, onAnswerSubmit, multiSelect = false }: McqCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);

  const options = card.front.options || [];

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (isAnswered) return;

      if (multiSelect) {
        setSelectedOptions((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      } else {
        setSelectedOptions([optionId]);
        // Auto-submit for single select
        const option = options.find((o) => o.id === optionId);
        if (option) {
          setIsAnswered(true);
          onAnswerSubmit?.(option.isCorrect);
        }
      }
    },
    [isAnswered, multiSelect, options, onAnswerSubmit]
  );

  const handleCheckAnswer = useCallback(() => {
    if (selectedOptions.length === 0) return;

    const correctOptions = options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect =
      selectedOptions.length === correctOptions.length &&
      selectedOptions.every((id) => correctOptions.includes(id));

    setIsAnswered(true);
    onAnswerSubmit?.(isCorrect);
  }, [selectedOptions, options, onAnswerSubmit]);

  const getOptionStyle = (option: McqOption) => {
    if (!isAnswered) {
      return selectedOptions.includes(option.id)
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/50';
    }

    if (option.isCorrect) {
      return 'border-green-500 bg-green-500/10';
    }

    if (selectedOptions.includes(option.id) && !option.isCorrect) {
      return 'border-red-500 bg-red-500/10';
    }

    return 'border-border opacity-50';
  };

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="mcq-card" role="form">
      {/* Question */}
      <div className="p-6 bg-card border rounded-lg mb-4" data-testid="mcq-question">
        <div className="text-lg">{card.front.text}</div>
      </div>

      {/* Options */}
      <div className="space-y-2" role="listbox" aria-label="Answer options">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option.id)}
            disabled={isAnswered}
            className={`w-full p-4 text-left border rounded-lg transition-colors ${getOptionStyle(option)}`}
            data-testid={`option-${index}`}
            role="option"
            aria-selected={selectedOptions.includes(option.id)}
            aria-disabled={isAnswered}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border">
                {multiSelect ? (
                  selectedOptions.includes(option.id) ? '✓' : ''
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>
              <span>{option.text}</span>
            </div>
            {isAnswered && option.explanation && (
              <div className="mt-2 text-sm text-muted-foreground" data-testid={`explanation-${index}`}>
                {option.explanation}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Check Answer Button (multi-select only) */}
      {multiSelect && !isAnswered && (
        <button
          onClick={handleCheckAnswer}
          disabled={selectedOptions.length === 0}
          className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="check-answer-btn"
        >
          Check Answer
        </button>
      )}

      {/* Result indicator */}
      {isAnswered && (
        <div
          className={`mt-4 p-3 rounded-lg text-center ${
            options.some((o) => o.isCorrect && selectedOptions.includes(o.id))
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500'
          }`}
          data-testid="result-indicator"
        >
          {options.some((o) => o.isCorrect && selectedOptions.includes(o.id))
            ? 'Correct!'
            : 'Incorrect'}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MOCK CLOZE CARD COMPONENT
// =============================================================================

interface ClozeCardProps {
  card: StudyCard;
  isFlipped: boolean;
  onAnswerSubmit?: (isCorrect: boolean) => void;
}

function ClozeCard({ card, isFlipped, onAnswerSubmit }: ClozeCardProps) {
  const [revealedBlanks, setRevealedBlanks] = useState<Set<number>>(new Set());

  const clozeText = card.front.clozeText || '';

  // Parse cloze text: {{c1::answer}} format
  const parseCloze = (text: string) => {
    const regex = /\{\{c(\d+)::([^}]+)\}\}/g;
    const parts: Array<{ type: 'text' | 'blank'; content: string; index: number }> = [];
    let lastIndex = 0;
    let match;
    let blankIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
          index: -1,
        });
      }
      parts.push({
        type: 'blank',
        content: match[2],
        index: blankIndex++,
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        index: -1,
      });
    }

    return parts;
  };

  const parts = parseCloze(clozeText);
  const totalBlanks = parts.filter((p) => p.type === 'blank').length;

  const handleBlankClick = (index: number) => {
    if (isFlipped) return;

    setRevealedBlanks((prev) => {
      const next = new Set(prev);
      next.add(index);

      // Check if all blanks revealed
      if (next.size === totalBlanks) {
        onAnswerSubmit?.(true);
      }

      return next;
    });
  };

  const allRevealed = isFlipped || revealedBlanks.size === totalBlanks;

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="cloze-card">
      <div className="p-6 bg-card border rounded-lg">
        <div className="text-lg leading-relaxed" data-testid="cloze-content">
          {parts.map((part, i) => {
            if (part.type === 'text') {
              return <span key={i}>{part.content}</span>;
            }

            const isRevealed = isFlipped || revealedBlanks.has(part.index);

            return (
              <button
                key={i}
                onClick={() => handleBlankClick(part.index)}
                disabled={isRevealed}
                className={`inline-block px-2 py-0.5 mx-1 rounded border-2 border-dashed transition-colors ${
                  isRevealed
                    ? 'border-green-500 bg-green-500/10 text-green-600'
                    : 'border-primary/50 bg-primary/5 hover:bg-primary/10 cursor-pointer'
                }`}
                data-testid={`blank-${part.index}`}
                aria-label={isRevealed ? part.content : 'Click to reveal'}
              >
                {isRevealed ? part.content : '[ ? ]'}
              </button>
            );
          })}
        </div>

        {/* Progress indicator */}
        {totalBlanks > 1 && !allRevealed && (
          <div className="mt-4 text-sm text-muted-foreground" data-testid="progress">
            {revealedBlanks.size} of {totalBlanks} revealed
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MOCK TRUE/FALSE CARD COMPONENT
// =============================================================================

interface TrueFalseCardProps {
  card: StudyCard;
  onAnswerSubmit?: (isCorrect: boolean) => void;
}

function TrueFalseCard({ card, onAnswerSubmit }: TrueFalseCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const isAnswered = selectedAnswer !== null;
  const correctAnswer = card.front.isTrue;

  const handleAnswer = (answer: boolean) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    onAnswerSubmit?.(answer === correctAnswer);
  };

  const getButtonStyle = (value: boolean) => {
    if (!isAnswered) {
      return 'border-border hover:border-primary';
    }

    if (value === correctAnswer) {
      return 'border-green-500 bg-green-500/10';
    }

    if (value === selectedAnswer && value !== correctAnswer) {
      return 'border-red-500 bg-red-500/10';
    }

    return 'border-border opacity-50';
  };

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="true-false-card">
      {/* Statement */}
      <div className="p-6 bg-card border rounded-lg mb-4" data-testid="statement">
        <div className="text-lg">{card.front.text}</div>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswer(true)}
          disabled={isAnswered}
          className={`p-6 text-lg font-semibold border rounded-lg transition-colors ${getButtonStyle(true)}`}
          data-testid="true-btn"
          aria-pressed={selectedAnswer === true}
        >
          True
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={isAnswered}
          className={`p-6 text-lg font-semibold border rounded-lg transition-colors ${getButtonStyle(false)}`}
          data-testid="false-btn"
          aria-pressed={selectedAnswer === false}
        >
          False
        </button>
      </div>

      {/* Explanation */}
      {isAnswered && card.front.explanation && (
        <div
          className="mt-4 p-4 bg-muted rounded-lg text-sm"
          data-testid="explanation"
        >
          {card.front.explanation}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INTERACTIVE CARD WRAPPER FOR KEYBOARD NAVIGATION TESTS
// =============================================================================

interface InteractiveCardProps {
  card: StudyCard;
  onRate?: (rating: 1 | 2 | 3 | 4) => void;
}

function InteractiveCard({ card, onRate }: InteractiveCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (!isFlipped) {
        setIsFlipped(true);
      }
    }

    // Rating shortcuts (only when flipped)
    if (isFlipped && onRate) {
      switch (e.key) {
        case '1':
          onRate(1);
          break;
        case '2':
          onRate(2);
          break;
        case '3':
          onRate(3);
          break;
        case '4':
          onRate(4);
          break;
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none focus:ring-2 focus:ring-primary rounded-lg"
      data-testid="interactive-card-wrapper"
      role="application"
      aria-label="Flashcard study area"
    >
      <BasicCard
        card={card}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(true)}
      />

      {/* Rating buttons */}
      {isFlipped && onRate && (
        <div className="mt-4 grid grid-cols-4 gap-2" data-testid="rating-buttons">
          <button
            onClick={() => onRate(1)}
            className="py-2 bg-red-500 text-white rounded hover:bg-red-600"
            data-testid="rating-again"
            aria-label="Again (1)"
          >
            Again
          </button>
          <button
            onClick={() => onRate(2)}
            className="py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            data-testid="rating-hard"
            aria-label="Hard (2)"
          >
            Hard
          </button>
          <button
            onClick={() => onRate(3)}
            className="py-2 bg-green-500 text-white rounded hover:bg-green-600"
            data-testid="rating-good"
            aria-label="Good (3)"
          >
            Good
          </button>
          <button
            onClick={() => onRate(4)}
            className="py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            data-testid="rating-easy"
            aria-label="Easy (4)"
          >
            Easy
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createBasicCard(overrides: Partial<StudyCard> = {}): StudyCard {
  return {
    id: `card-${Date.now()}`,
    type: 'BASIC',
    front: {
      text: 'What is the capital of France?',
      ...overrides.front,
    },
    back: {
      text: 'Paris',
      ...overrides.back,
    },
    ...overrides,
  };
}

function createMcqCard(overrides: Partial<StudyCard> = {}): StudyCard {
  return {
    id: `card-${Date.now()}`,
    type: 'MCQ',
    front: {
      text: 'Which planet is known as the Red Planet?',
      options: [
        { id: '1', text: 'Venus', isCorrect: false },
        { id: '2', text: 'Mars', isCorrect: true, explanation: 'Mars appears red due to iron oxide.' },
        { id: '3', text: 'Jupiter', isCorrect: false },
        { id: '4', text: 'Saturn', isCorrect: false },
      ],
      ...overrides.front,
    },
    back: { text: 'Mars' },
    ...overrides,
  };
}

function createClozeCard(overrides: Partial<StudyCard> = {}): StudyCard {
  return {
    id: `card-${Date.now()}`,
    type: 'CLOZE',
    front: {
      clozeText: 'The {{c1::mitochondria}} is the powerhouse of the {{c2::cell}}.',
      ...overrides.front,
    },
    back: { text: 'mitochondria, cell' },
    ...overrides,
  };
}

function createTrueFalseCard(overrides: Partial<StudyCard> = {}): StudyCard {
  return {
    id: `card-${Date.now()}`,
    type: 'TRUE_FALSE',
    front: {
      text: 'The Earth is flat.',
      isTrue: false,
      explanation: 'The Earth is approximately spherical in shape.',
      ...overrides.front,
    },
    back: { text: 'False' },
    ...overrides,
  };
}

// =============================================================================
// BASIC CARD TESTS
// =============================================================================

test.describe('BasicCard - Rendering', () => {
  test('shows front content', async ({ mount }) => {
    const card = createBasicCard({
      front: { text: 'What is 2 + 2?' },
    });

    const component = await mount(<BasicCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('front-content')).toContainText('What is 2 + 2?');
    await expect(component.getByTestId('card-back')).not.toBeVisible();
  });

  test('shows flip button when not flipped', async ({ mount }) => {
    const card = createBasicCard();

    const component = await mount(<BasicCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('flip-button')).toBeVisible();
    await expect(component.getByTestId('flip-button')).toContainText('Show Answer');
  });

  test('shows back content when flipped', async ({ mount }) => {
    const card = createBasicCard({
      back: { text: '4' },
    });

    const component = await mount(<BasicCard card={card} isFlipped={true} />);

    await expect(component.getByTestId('back-content')).toContainText('4');
    await expect(component.getByTestId('card-back')).toBeVisible();
    await expect(component.getByTestId('flip-button')).not.toBeVisible();
  });

  test('shows hint when available and not flipped', async ({ mount }) => {
    const card = createBasicCard({
      front: { text: 'Question', hint: 'Think about European capitals' },
    });

    const component = await mount(<BasicCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('hint')).toContainText('Think about European capitals');
  });

  test('hides hint when flipped', async ({ mount }) => {
    const card = createBasicCard({
      front: { text: 'Question', hint: 'A hint' },
    });

    const component = await mount(<BasicCard card={card} isFlipped={true} />);

    await expect(component.getByTestId('hint')).not.toBeVisible();
  });

  test('handles reversed mode', async ({ mount }) => {
    const card = createBasicCard({
      front: { text: 'Front text' },
      back: { text: 'Back text' },
    });

    const component = await mount(<BasicCard card={card} isFlipped={false} reversed={true} />);

    // In reversed mode, back becomes front
    await expect(component.getByTestId('front-content')).toContainText('Back text');
  });
});

test.describe('BasicCard - Interactions', () => {
  test('flip button triggers onFlip callback', async ({ mount }) => {
    const card = createBasicCard();
    let flipped = false;

    const component = await mount(
      <BasicCard card={card} isFlipped={false} onFlip={() => (flipped = true)} />
    );

    await component.getByTestId('flip-button').click();
    expect(flipped).toBe(true);
  });
});

test.describe('BasicCard - Accessibility', () => {
  test('has correct ARIA attributes', async ({ mount }) => {
    const card = createBasicCard();

    const component = await mount(<BasicCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('basic-card')).toHaveAttribute('role', 'article');
    await expect(component.getByTestId('basic-card')).toHaveAttribute('aria-label', 'Flashcard');
    await expect(component.getByTestId('flip-button')).toHaveAttribute('aria-label', 'Show answer');
  });
});

// =============================================================================
// MCQ CARD TESTS
// =============================================================================

test.describe('McqCard - Rendering', () => {
  test('renders question and options', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} />);

    await expect(component.getByTestId('mcq-question')).toContainText('Which planet');
    await expect(component.getByTestId('option-0')).toContainText('Venus');
    await expect(component.getByTestId('option-1')).toContainText('Mars');
    await expect(component.getByTestId('option-2')).toContainText('Jupiter');
    await expect(component.getByTestId('option-3')).toContainText('Saturn');
  });

  test('options have listbox role', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} />);

    await expect(component.locator('[role="listbox"]')).toBeVisible();
    await expect(component.getByTestId('option-0')).toHaveAttribute('role', 'option');
  });
});

test.describe('McqCard - Single Select', () => {
  test('auto-submits on option click', async ({ mount }) => {
    const card = createMcqCard();
    let submittedCorrect: boolean | null = null;

    const component = await mount(
      <McqCard card={card} onAnswerSubmit={(correct) => (submittedCorrect = correct)} />
    );

    // Click correct answer
    await component.getByTestId('option-1').click(); // Mars

    expect(submittedCorrect).toBe(true);
  });

  test('shows correct/incorrect feedback after answer', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} onAnswerSubmit={() => {}} />);

    // Click incorrect answer
    await component.getByTestId('option-0').click(); // Venus

    await expect(component.getByTestId('result-indicator')).toContainText('Incorrect');
  });

  test('disables options after answering', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} onAnswerSubmit={() => {}} />);

    await component.getByTestId('option-0').click();

    await expect(component.getByTestId('option-0')).toBeDisabled();
    await expect(component.getByTestId('option-1')).toBeDisabled();
  });

  test('shows explanation after answering', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} onAnswerSubmit={() => {}} />);

    await component.getByTestId('option-1').click(); // Mars (has explanation)

    await expect(component.getByTestId('explanation-1')).toContainText('iron oxide');
  });
});

test.describe('McqCard - Multi Select', () => {
  test('allows multiple selections', async ({ mount }) => {
    const card = createMcqCard({
      front: {
        text: 'Select all prime numbers',
        options: [
          { id: '1', text: '2', isCorrect: true },
          { id: '2', text: '3', isCorrect: true },
          { id: '3', text: '4', isCorrect: false },
          { id: '4', text: '5', isCorrect: true },
        ],
      },
    });

    const component = await mount(<McqCard card={card} multiSelect={true} />);

    await component.getByTestId('option-0').click();
    await component.getByTestId('option-1').click();

    await expect(component.getByTestId('option-0')).toHaveAttribute('aria-selected', 'true');
    await expect(component.getByTestId('option-1')).toHaveAttribute('aria-selected', 'true');
  });

  test('shows check answer button for multi-select', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} multiSelect={true} />);

    await expect(component.getByTestId('check-answer-btn')).toBeVisible();
  });

  test('check button disabled when no selection', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} multiSelect={true} />);

    await expect(component.getByTestId('check-answer-btn')).toBeDisabled();
  });

  test('submits on check answer click', async ({ mount }) => {
    const card = createMcqCard({
      front: {
        text: 'Select primes',
        options: [
          { id: '1', text: '2', isCorrect: true },
          { id: '2', text: '3', isCorrect: true },
          { id: '3', text: '4', isCorrect: false },
        ],
      },
    });
    let submittedCorrect: boolean | null = null;

    const component = await mount(
      <McqCard
        card={card}
        multiSelect={true}
        onAnswerSubmit={(correct) => (submittedCorrect = correct)}
      />
    );

    await component.getByTestId('option-0').click();
    await component.getByTestId('option-1').click();
    await component.getByTestId('check-answer-btn').click();

    expect(submittedCorrect).toBe(true);
  });
});

// =============================================================================
// CLOZE CARD TESTS
// =============================================================================

test.describe('ClozeCard - Rendering', () => {
  test('renders cloze text with blanks', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('cloze-content')).toBeVisible();
    await expect(component.getByTestId('blank-0')).toBeVisible();
    await expect(component.getByTestId('blank-1')).toBeVisible();
  });

  test('blanks show placeholder text initially', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('blank-0')).toContainText('[ ? ]');
    await expect(component.getByTestId('blank-1')).toContainText('[ ? ]');
  });

  test('shows progress for multiple blanks', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('progress')).toContainText('0 of 2 revealed');
  });
});

test.describe('ClozeCard - Interactions', () => {
  test('clicking blank reveals answer', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    await component.getByTestId('blank-0').click();

    await expect(component.getByTestId('blank-0')).toContainText('mitochondria');
  });

  test('updates progress after revealing', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    await component.getByTestId('blank-0').click();

    await expect(component.getByTestId('progress')).toContainText('1 of 2 revealed');
  });

  test('calls onAnswerSubmit when all blanks revealed', async ({ mount }) => {
    const card = createClozeCard();
    let submitted = false;

    const component = await mount(
      <ClozeCard card={card} isFlipped={false} onAnswerSubmit={() => (submitted = true)} />
    );

    await component.getByTestId('blank-0').click();
    await component.getByTestId('blank-1').click();

    expect(submitted).toBe(true);
  });

  test('reveals all blanks when flipped', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={true} />);

    await expect(component.getByTestId('blank-0')).toContainText('mitochondria');
    await expect(component.getByTestId('blank-1')).toContainText('cell');
  });
});

// =============================================================================
// TRUE/FALSE CARD TESTS
// =============================================================================

test.describe('TrueFalseCard - Rendering', () => {
  test('renders statement and answer buttons', async ({ mount }) => {
    const card = createTrueFalseCard();

    const component = await mount(<TrueFalseCard card={card} />);

    await expect(component.getByTestId('statement')).toContainText('The Earth is flat');
    await expect(component.getByTestId('true-btn')).toContainText('True');
    await expect(component.getByTestId('false-btn')).toContainText('False');
  });
});

test.describe('TrueFalseCard - Interactions', () => {
  test('submits correct answer', async ({ mount }) => {
    const card = createTrueFalseCard({ front: { text: 'Test', isTrue: false } });
    let submittedCorrect: boolean | null = null;

    const component = await mount(
      <TrueFalseCard card={card} onAnswerSubmit={(correct) => (submittedCorrect = correct)} />
    );

    await component.getByTestId('false-btn').click();

    expect(submittedCorrect).toBe(true);
  });

  test('submits incorrect answer', async ({ mount }) => {
    const card = createTrueFalseCard({ front: { text: 'Test', isTrue: false } });
    let submittedCorrect: boolean | null = null;

    const component = await mount(
      <TrueFalseCard card={card} onAnswerSubmit={(correct) => (submittedCorrect = correct)} />
    );

    await component.getByTestId('true-btn').click();

    expect(submittedCorrect).toBe(false);
  });

  test('disables buttons after answering', async ({ mount }) => {
    const card = createTrueFalseCard();

    const component = await mount(<TrueFalseCard card={card} onAnswerSubmit={() => {}} />);

    await component.getByTestId('false-btn').click();

    await expect(component.getByTestId('true-btn')).toBeDisabled();
    await expect(component.getByTestId('false-btn')).toBeDisabled();
  });

  test('shows explanation after answering', async ({ mount }) => {
    const card = createTrueFalseCard();

    const component = await mount(<TrueFalseCard card={card} onAnswerSubmit={() => {}} />);

    await component.getByTestId('false-btn').click();

    await expect(component.getByTestId('explanation')).toContainText('approximately spherical');
  });

  test('highlights correct answer green', async ({ mount }) => {
    const card = createTrueFalseCard({ front: { text: 'Test', isTrue: true } });

    const component = await mount(<TrueFalseCard card={card} onAnswerSubmit={() => {}} />);

    await component.getByTestId('false-btn').click(); // Wrong answer

    // True button should be green (correct)
    await expect(component.getByTestId('true-btn')).toHaveClass(/border-green-500/);
    // False button should be red (selected wrong)
    await expect(component.getByTestId('false-btn')).toHaveClass(/border-red-500/);
  });
});

// =============================================================================
// KEYBOARD NAVIGATION TESTS
// =============================================================================

test.describe('Keyboard Navigation', () => {
  test('spacebar flips card', async ({ mount, page }) => {
    const card = createBasicCard();

    const component = await mount(<InteractiveCard card={card} />);

    // Focus the card wrapper
    await component.getByTestId('interactive-card-wrapper').focus();

    // Press space
    await page.keyboard.press('Space');

    // Card should be flipped
    await expect(component.getByTestId('card-back')).toBeVisible();
  });

  test('number keys trigger ratings after flip', async ({ mount, page }) => {
    const card = createBasicCard();
    let lastRating: number | null = null;

    const component = await mount(
      <InteractiveCard card={card} onRate={(r) => (lastRating = r)} />
    );

    // Focus and flip
    await component.getByTestId('interactive-card-wrapper').focus();
    await page.keyboard.press('Space');

    // Press rating key
    await page.keyboard.press('3');

    expect(lastRating).toBe(3);
  });

  test('rating buttons are visible after flip', async ({ mount, page }) => {
    const card = createBasicCard();

    const component = await mount(<InteractiveCard card={card} onRate={() => {}} />);

    // Initially hidden
    await expect(component.getByTestId('rating-buttons')).not.toBeVisible();

    // Flip card
    await component.getByTestId('flip-button').click();

    // Now visible
    await expect(component.getByTestId('rating-buttons')).toBeVisible();
  });

  test('rating buttons have correct aria-labels', async ({ mount }) => {
    const card = createBasicCard();

    const component = await mount(<InteractiveCard card={card} onRate={() => {}} />);

    await component.getByTestId('flip-button').click();

    await expect(component.getByTestId('rating-again')).toHaveAttribute('aria-label', 'Again (1)');
    await expect(component.getByTestId('rating-hard')).toHaveAttribute('aria-label', 'Hard (2)');
    await expect(component.getByTestId('rating-good')).toHaveAttribute('aria-label', 'Good (3)');
    await expect(component.getByTestId('rating-easy')).toHaveAttribute('aria-label', 'Easy (4)');
  });
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

test.describe('Accessibility', () => {
  test('interactive card wrapper is focusable', async ({ mount }) => {
    const card = createBasicCard();

    const component = await mount(<InteractiveCard card={card} />);

    const wrapper = component.getByTestId('interactive-card-wrapper');
    await expect(wrapper).toHaveAttribute('tabIndex', '0');
    await expect(wrapper).toHaveAttribute('role', 'application');
  });

  test('card has focus ring when focused', async ({ mount }) => {
    const card = createBasicCard();

    const component = await mount(<InteractiveCard card={card} />);

    const wrapper = component.getByTestId('interactive-card-wrapper');
    await wrapper.focus();

    await expect(wrapper).toHaveClass(/focus:ring-2/);
  });

  test('MCQ options have correct ARIA attributes', async ({ mount }) => {
    const card = createMcqCard();

    const component = await mount(<McqCard card={card} />);

    const option = component.getByTestId('option-0');
    await expect(option).toHaveAttribute('role', 'option');
    await expect(option).toHaveAttribute('aria-selected', 'false');

    await option.click();
    await expect(option).toHaveAttribute('aria-disabled', 'true');
  });

  test('cloze blanks have descriptive aria-labels', async ({ mount }) => {
    const card = createClozeCard();

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('blank-0')).toHaveAttribute('aria-label', 'Click to reveal');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

test.describe('Edge Cases', () => {
  test('handles empty front text', async ({ mount }) => {
    const card = createBasicCard({ front: { text: '' } });

    const component = await mount(<BasicCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('card-front')).toContainText('No content');
  });

  test('handles card with images', async ({ mount }) => {
    const card = createBasicCard({
      front: { text: 'Question', image: 'https://example.com/image.png' },
    });

    const component = await mount(<BasicCard card={card} isFlipped={false} />);

    await expect(component.getByTestId('front-image')).toBeVisible();
    await expect(component.getByTestId('front-image')).toHaveAttribute(
      'src',
      'https://example.com/image.png'
    );
  });

  test('handles cloze with single blank', async ({ mount }) => {
    const card = createClozeCard({
      front: { clozeText: 'The answer is {{c1::42}}.' },
    });

    const component = await mount(<ClozeCard card={card} isFlipped={false} />);

    // Progress should not be shown for single blank
    await expect(component.getByTestId('progress')).not.toBeVisible();
  });

  test('handles MCQ with no options gracefully', async ({ mount }) => {
    const card = createMcqCard({
      front: { text: 'Question', options: [] },
    });

    const component = await mount(<McqCard card={card} />);

    await expect(component.getByTestId('mcq-question')).toBeVisible();
    // Should not crash
  });
});
