/**
 * Component Testing Utilities
 *
 * Provides mock factories, test helpers, and common utilities
 * for testing StudyTab React components with Playwright CT.
 *
 * @module component-tests/test-utils
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User mock type
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Deck mock type
 */
export interface MockDeck {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  cardCount: number;
  dueCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Card mock type
 */
export interface MockCard {
  id: string;
  deckId: string;
  type: 'basic' | 'cloze' | 'mcq' | 'matching' | 'ordering' | 'picture_quiz' | 'true_false' | 'audio';
  front: string;
  back: string;
  options?: string[];
  correctAnswer?: number | number[] | boolean;
  clozeText?: string;
  hint?: string | null;
  tags: string[];
  difficulty: number;
  interval: number;
  easeFactor: number;
  dueDate: Date;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Study session mock type
 */
export interface MockStudySession {
  id: string;
  userId: string;
  deckId: string;
  cardsStudied: number;
  cardsCorrect: number;
  duration: number;
  startedAt: Date;
  endedAt: Date | null;
}

// =============================================================================
// MOCK FACTORIES
// =============================================================================

/**
 * Create a mock user
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create a mock deck
 */
export function createMockDeck(overrides: Partial<MockDeck> = {}): MockDeck {
  return {
    id: `deck-${Date.now()}`,
    name: 'Test Deck',
    description: 'A deck for testing',
    userId: 'user-1',
    cardCount: 10,
    dueCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create multiple mock decks
 */
export function createMockDecks(count: number, overrides: Partial<MockDeck> = {}): MockDeck[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDeck({
      id: `deck-${i + 1}`,
      name: `Test Deck ${i + 1}`,
      cardCount: (i + 1) * 5,
      dueCount: Math.floor((i + 1) * 2),
      ...overrides,
    })
  );
}

/**
 * Create a mock basic card
 */
export function createMockCard(overrides: Partial<MockCard> = {}): MockCard {
  return {
    id: `card-${Date.now()}`,
    deckId: 'deck-1',
    type: 'basic',
    front: 'What is the capital of France?',
    back: 'Paris',
    tags: ['geography', 'europe'],
    difficulty: 0.5,
    interval: 1,
    easeFactor: 2.5,
    dueDate: new Date(),
    reviewCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create a mock MCQ card
 */
export function createMockMCQCard(overrides: Partial<MockCard> = {}): MockCard {
  return createMockCard({
    type: 'mcq',
    front: 'Which planet is known as the Red Planet?',
    back: 'Mars',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 1,
    ...overrides,
  });
}

/**
 * Create a mock cloze card
 */
export function createMockClozeCard(overrides: Partial<MockCard> = {}): MockCard {
  return createMockCard({
    type: 'cloze',
    front: 'The {{c1::mitochondria}} is the powerhouse of the cell.',
    back: 'mitochondria',
    clozeText: 'The {{c1::mitochondria}} is the powerhouse of the cell.',
    ...overrides,
  });
}

/**
 * Create a mock true/false card
 */
export function createMockTrueFalseCard(overrides: Partial<MockCard> = {}): MockCard {
  return createMockCard({
    type: 'true_false',
    front: 'The Earth is flat.',
    back: 'False',
    correctAnswer: false,
    ...overrides,
  });
}

/**
 * Create multiple mock cards
 */
export function createMockCards(count: number, deckId?: string): MockCard[] {
  const types: MockCard['type'][] = ['basic', 'cloze', 'mcq', 'true_false'];
  return Array.from({ length: count }, (_, i) =>
    createMockCard({
      id: `card-${i + 1}`,
      deckId: deckId ?? 'deck-1',
      type: types[i % types.length],
      front: `Question ${i + 1}`,
      back: `Answer ${i + 1}`,
      dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
    })
  );
}

/**
 * Create a mock study session
 */
export function createMockStudySession(overrides: Partial<MockStudySession> = {}): MockStudySession {
  return {
    id: `session-${Date.now()}`,
    userId: 'user-1',
    deckId: 'deck-1',
    cardsStudied: 10,
    cardsCorrect: 8,
    duration: 300,
    startedAt: new Date(),
    endedAt: null,
    ...overrides,
  };
}

// =============================================================================
// QUERY CLIENT UTILITIES
// =============================================================================

/**
 * Create a test QueryClient with pre-seeded data
 */
export function createSeededQueryClient(seedData: {
  user?: MockUser;
  decks?: MockDeck[];
  cards?: MockCard[];
}): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });

  // Seed user data
  if (seedData.user) {
    queryClient.setQueryData(['user'], seedData.user);
    queryClient.setQueryData(['session'], {
      isAuthenticated: true,
      user: seedData.user,
    });
  }

  // Seed decks data
  if (seedData.decks) {
    queryClient.setQueryData(['decks'], seedData.decks);
    seedData.decks.forEach((deck) => {
      queryClient.setQueryData(['deck', deck.id], deck);
    });
  }

  // Seed cards data
  if (seedData.cards) {
    const cardsByDeck = seedData.cards.reduce(
      (acc, card) => {
        if (!acc[card.deckId]) acc[card.deckId] = [];
        acc[card.deckId].push(card);
        return acc;
      },
      {} as Record<string, MockCard[]>
    );

    Object.entries(cardsByDeck).forEach(([deckId, cards]) => {
      queryClient.setQueryData(['cards', deckId], cards);
    });

    seedData.cards.forEach((card) => {
      queryClient.setQueryData(['card', card.id], card);
    });
  }

  return queryClient;
}

// =============================================================================
// WRAPPER COMPONENTS
// =============================================================================

/**
 * Props for test wrapper
 */
interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  theme?: 'light' | 'dark';
}

/**
 * Wrapper component with all providers for testing
 */
export function TestWrapper({ children, queryClient, theme = 'dark' }: TestWrapperProps): React.ReactElement {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  // Set theme
  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// AUTH MOCK UTILITIES
// =============================================================================

/**
 * Auth state for mocking
 */
export interface MockAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: MockUser | null;
}

/**
 * Create mock auth state - authenticated
 */
export function createAuthenticatedState(user?: Partial<MockUser>): MockAuthState {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: createMockUser(user),
  };
}

/**
 * Create mock auth state - unauthenticated
 */
export function createUnauthenticatedState(): MockAuthState {
  return {
    isAuthenticated: false,
    isLoading: false,
    user: null,
  };
}

/**
 * Create mock auth state - loading
 */
export function createLoadingAuthState(): MockAuthState {
  return {
    isAuthenticated: false,
    isLoading: true,
    user: null,
  };
}

// =============================================================================
// ZUSTAND STORE UTILITIES
// =============================================================================

/**
 * Pomodoro store state type
 */
export interface MockPomodoroState {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: 'work' | 'shortBreak' | 'longBreak';
  timeRemaining: number;
  totalPomodorosToday: number;
  completedPomodoros: number;
  settings: {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    soundEnabled: boolean;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
  };
}

/**
 * Create default pomodoro state
 */
export function createMockPomodoroState(overrides: Partial<MockPomodoroState> = {}): MockPomodoroState {
  return {
    isRunning: false,
    isPaused: false,
    sessionType: 'work',
    timeRemaining: 25 * 60,
    totalPomodorosToday: 0,
    completedPomodoros: 0,
    settings: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      soundEnabled: true,
      autoStartBreaks: false,
      autoStartWork: false,
    },
    ...overrides,
  };
}

/**
 * Study wizard store state type
 */
export interface MockStudyWizardState {
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  sizePreset: 'compact' | 'standard' | 'large';
  currentCard: MockCard | null;
  currentIndex: number;
  sessionStats: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

/**
 * Create default study wizard state
 */
export function createMockStudyWizardState(
  overrides: Partial<MockStudyWizardState> = {}
): MockStudyWizardState {
  return {
    isOpen: false,
    isMinimized: false,
    position: { x: 100, y: 100 },
    size: { width: 600, height: 500 },
    sizePreset: 'standard',
    currentCard: null,
    currentIndex: 0,
    sessionStats: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    ...overrides,
  };
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Check if element has specific Tailwind classes
 */
export function hasTailwindClasses(element: HTMLElement, classes: string[]): boolean {
  return classes.every((cls) => element.classList.contains(cls));
}

/**
 * Get computed CSS variable value
 */
export function getCssVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Re-export React Query utilities
  QueryClient,
  QueryClientProvider,
};
