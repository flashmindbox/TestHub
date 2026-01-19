/**
 * Component Testing Module
 *
 * Exports test utilities and mock factories for Playwright CT.
 *
 * @module component-tests
 */

export {
  // Types
  type MockUser,
  type MockDeck,
  type MockCard,
  type MockStudySession,
  type MockAuthState,
  type MockPomodoroState,
  type MockStudyWizardState,
  // Mock factories
  createMockUser,
  createMockDeck,
  createMockDecks,
  createMockCard,
  createMockMCQCard,
  createMockClozeCard,
  createMockTrueFalseCard,
  createMockCards,
  createMockStudySession,
  // Query client utilities
  createSeededQueryClient,
  // Wrapper components
  TestWrapper,
  // Auth mock utilities
  createAuthenticatedState,
  createUnauthenticatedState,
  createLoadingAuthState,
  // Zustand store utilities
  createMockPomodoroState,
  createMockStudyWizardState,
  // Assertion helpers
  hasTailwindClasses,
  getCssVariable,
  // Re-exports
  QueryClient,
  QueryClientProvider,
} from './test-utils';
