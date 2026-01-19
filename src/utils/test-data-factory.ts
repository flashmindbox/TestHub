import { faker } from '@faker-js/faker';
import { UserTestData, DeckTestData, CardTestData } from '../types';

// Prefix for test data to easily identify and cleanup
const TEST_PREFIX = 'test-';

export const TestDataFactory = {
  /**
   * Generate unique test ID
   */
  uniqueId(): string {
    return `${TEST_PREFIX}${faker.string.uuid().slice(0, 8)}`;
  },

  /**
   * Generate user data for registration tests
   */
  user(): UserTestData {
    const id = faker.string.uuid().slice(0, 8);
    return {
      email: `${TEST_PREFIX}${id}@example.com`,
      password: 'Test123!',
      name: `Test User ${id}`,
    };
  },

  /**
   * Generate deck data
   */
  deck(overrides?: Partial<DeckTestData>): DeckTestData {
    return {
      name: `${TEST_PREFIX}Deck ${faker.word.noun()}`,
      description: faker.lorem.sentence(),
      isPublic: false,
      ...overrides,
    };
  },

  /**
   * Generate basic flashcard data
   */
  card(overrides?: Partial<CardTestData>): CardTestData {
    return {
      type: 'BASIC',
      front: faker.lorem.sentence(),
      back: faker.lorem.sentence(),
      ...overrides,
    };
  },

  /**
   * Generate multiple choice card
   */
  mcqCard(): CardTestData & { options: string[]; correctIndex: number } {
    const options = [
      faker.word.noun(),
      faker.word.noun(),
      faker.word.noun(),
      faker.word.noun(),
    ];
    return {
      type: 'MCQ',
      front: `What is the correct answer for: ${faker.lorem.sentence()}?`,
      back: options[0],
      options,
      correctIndex: 0,
    };
  },

  /**
   * Generate cloze deletion card
   */
  clozeCard(): CardTestData {
    const word = faker.word.noun();
    return {
      type: 'CLOZE',
      front: `The {{c1::${word}}} is important for learning.`,
      back: word,
    };
  },

  /**
   * Generate study session data
   */
  studySession() {
    return {
      duration: faker.number.int({ min: 5, max: 60 }),
      cardsStudied: faker.number.int({ min: 10, max: 100 }),
      correctAnswers: faker.number.int({ min: 5, max: 50 }),
    };
  },

  /**
   * Generate pomodoro session data
   */
  pomodoroSession() {
    return {
      type: faker.helpers.arrayElement(['work', 'short_break', 'long_break']),
      duration: faker.helpers.arrayElement([25, 5, 15]),
    };
  },

  /**
   * Generate many items
   */
  many<T>(generator: () => T, count: number): T[] {
    return Array.from({ length: count }, generator);
  },

  /**
   * Check if data was created by tests (has test prefix)
   */
  isTestData(value: string): boolean {
    return value.startsWith(TEST_PREFIX);
  },
};
