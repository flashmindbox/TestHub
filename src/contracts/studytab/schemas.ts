/**
 * StudyTab API Contract Schemas
 *
 * Zod schemas for validating StudyTab API responses.
 * These schemas ensure API responses match expected contracts.
 *
 * @module contracts/studytab/schemas
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

/**
 * ISO 8601 date-time string schema
 */
export const DateTimeSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

/**
 * UUID or string ID schema (flexible for different ID formats)
 */
export const IdSchema = z.string().min(1);

/**
 * Email schema with validation
 */
export const EmailSchema = z.string().email();

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

/**
 * API error object schema
 * Returned when API requests fail
 */
export const ApiErrorSchema = z.object({
  /** Error code for programmatic handling (e.g., 'UNAUTHORIZED', 'NOT_FOUND') */
  code: z.string(),
  /** Human-readable error message */
  message: z.string(),
});

/**
 * Generic API response wrapper schema
 * All StudyTab API responses follow this structure
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    /** Whether the request succeeded */
    success: z.boolean(),
    /** Response data (present on success) */
    data: dataSchema.optional(),
    /** Error details (present on failure) */
    error: ApiErrorSchema.optional(),
  });

/**
 * Error-only API response (for failed requests)
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

// =============================================================================
// USER SCHEMAS
// =============================================================================

/**
 * User entity schema
 * Represents a StudyTab user account
 */
export const UserSchema = z.object({
  /** Unique user identifier */
  id: IdSchema,
  /** User's email address */
  email: EmailSchema,
  /** User's display name */
  name: z.string(),
  /** Profile image URL */
  image: z.string().url().nullable().optional(),
  /** Account creation timestamp */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp */
  updatedAt: DateTimeSchema.optional(),
  /** Whether email is verified */
  emailVerified: z.boolean().optional(),
});

/**
 * Minimal user schema (for embedded references)
 */
export const UserRefSchema = z.object({
  id: IdSchema,
  name: z.string(),
  image: z.string().url().nullable().optional(),
});

/**
 * User profile response schema
 */
export const UserProfileResponseSchema = ApiResponseSchema(UserSchema);

/**
 * Current session response schema
 */
export const SessionResponseSchema = z.object({
  user: UserSchema.optional(),
});

// =============================================================================
// DECK SCHEMAS
// =============================================================================

/**
 * Card type enumeration
 */
export const CardTypeSchema = z.enum(['basic', 'cloze', 'mcq', 'BASIC', 'CLOZE', 'MCQ']);

/**
 * Deck entity schema
 * Represents a flashcard deck
 */
export const DeckSchema = z.object({
  /** Unique deck identifier */
  id: IdSchema,
  /** Deck name/title */
  name: z.string().min(1),
  /** Deck description */
  description: z.string().nullable().optional(),
  /** Owner user ID */
  userId: IdSchema.optional(),
  /** Number of cards in deck */
  cardCount: z.number().int().nonnegative().optional(),
  /** Whether deck is publicly visible */
  isPublic: z.boolean().optional(),
  /** Creation timestamp */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp */
  updatedAt: DateTimeSchema.optional(),
});

/**
 * Deck summary schema (for list views)
 */
export const DeckSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  description: z.string().nullable().optional(),
  cardCount: z.number().int().nonnegative().optional(),
});

/**
 * Deck creation input schema
 */
export const CreateDeckInputSchema = z.object({
  name: z.string().min(1, 'Deck name is required'),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * Deck update input schema
 */
export const UpdateDeckInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// =============================================================================
// CARD SCHEMAS
// =============================================================================

/**
 * Card entity schema
 * Represents a flashcard with spaced repetition data
 */
export const CardSchema = z.object({
  /** Unique card identifier */
  id: IdSchema,
  /** Parent deck ID */
  deckId: IdSchema,
  /** Front side content (question/prompt) */
  front: z.string(),
  /** Back side content (answer) */
  back: z.string(),
  /** Card type */
  type: CardTypeSchema.optional(),
  /** Spaced repetition ease factor (typically 1.3-2.5) */
  easeFactor: z.number().min(1).max(5).optional(),
  /** Current interval in days */
  interval: z.number().int().nonnegative().optional(),
  /** Number of repetitions */
  repetitions: z.number().int().nonnegative().optional(),
  /** Next due date for review */
  dueDate: DateTimeSchema.nullable().optional(),
  /** Last review timestamp */
  lastReviewed: DateTimeSchema.nullable().optional(),
  /** Creation timestamp */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp */
  updatedAt: DateTimeSchema.optional(),
});

/**
 * Card summary schema (without spaced repetition data)
 */
export const CardSummarySchema = z.object({
  id: IdSchema,
  front: z.string(),
  back: z.string(),
  type: CardTypeSchema.optional(),
});

/**
 * Card creation input schema
 */
export const CreateCardInputSchema = z.object({
  front: z.string().min(1, 'Card front is required'),
  back: z.string().min(1, 'Card back is required'),
  type: CardTypeSchema.optional(),
});

/**
 * Card update input schema
 */
export const UpdateCardInputSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  type: CardTypeSchema.optional(),
});

// =============================================================================
// STUDY SESSION SCHEMAS
// =============================================================================

/**
 * Study answer rating (for spaced repetition)
 */
export const StudyRatingSchema = z.enum(['again', 'hard', 'good', 'easy']);

/**
 * Study session statistics schema
 */
export const StudySessionSchema = z.object({
  /** Session identifier */
  id: IdSchema.optional(),
  /** Deck being studied */
  deckId: IdSchema.optional(),
  /** Session duration in minutes */
  duration: z.number().int().nonnegative(),
  /** Total cards studied */
  cardsStudied: z.number().int().nonnegative(),
  /** Number of correct answers */
  correctAnswers: z.number().int().nonnegative(),
  /** Session start timestamp */
  startedAt: DateTimeSchema.optional(),
  /** Session end timestamp */
  completedAt: DateTimeSchema.optional(),
});

/**
 * Card due for study schema
 */
export const StudyCardSchema = CardSchema.extend({
  /** Whether card is new (never reviewed) */
  isNew: z.boolean().optional(),
  /** Whether card is due for review */
  isDue: z.boolean().optional(),
});

/**
 * Study session response (cards to study)
 */
export const StudyCardsResponseSchema = z.object({
  /** Cards due for study */
  cards: z.array(StudyCardSchema),
  /** Total due count */
  totalDue: z.number().int().nonnegative().optional(),
  /** New cards count */
  newCount: z.number().int().nonnegative().optional(),
  /** Review cards count */
  reviewCount: z.number().int().nonnegative().optional(),
});

/**
 * Study answer submission schema
 */
export const SubmitStudyAnswerSchema = z.object({
  cardId: IdSchema,
  rating: StudyRatingSchema,
  responseTime: z.number().int().nonnegative().optional(),
});

// =============================================================================
// POMODORO SCHEMAS
// =============================================================================

/**
 * Pomodoro session type
 */
export const PomodoroTypeSchema = z.enum(['work', 'short_break', 'long_break']);

/**
 * Pomodoro session schema
 */
export const PomodoroSessionSchema = z.object({
  /** Session identifier */
  id: IdSchema.optional(),
  /** Session type */
  type: PomodoroTypeSchema,
  /** Duration in minutes */
  duration: z.number().int().positive(),
  /** Associated deck (optional) */
  deckId: IdSchema.optional(),
  /** Session start timestamp */
  startedAt: DateTimeSchema.optional(),
  /** Session completion timestamp */
  completedAt: DateTimeSchema.nullable().optional(),
  /** Whether session was completed */
  completed: z.boolean().optional(),
});

/**
 * Pomodoro timer state schema
 */
export const PomodoroTimerStateSchema = z.object({
  /** Current session type */
  type: PomodoroTypeSchema,
  /** Remaining time in seconds */
  remainingSeconds: z.number().int().nonnegative(),
  /** Whether timer is running */
  isRunning: z.boolean(),
  /** Completed pomodoros in current cycle */
  completedPomodoros: z.number().int().nonnegative(),
});

// =============================================================================
// AI GENERATION SCHEMAS
// =============================================================================

/**
 * AI card generation input schema
 */
export const GenerateCardsInputSchema = z.object({
  /** Source text/topic for generation */
  content: z.string().min(1),
  /** Number of cards to generate */
  count: z.number().int().min(1).max(50).optional(),
  /** Card type to generate */
  type: CardTypeSchema.optional(),
  /** Target deck ID */
  deckId: IdSchema.optional(),
});

/**
 * Generated card schema (before saving)
 */
export const GeneratedCardSchema = z.object({
  front: z.string(),
  back: z.string(),
  type: CardTypeSchema.optional(),
});

/**
 * AI generation response schema
 */
export const GenerateCardsResponseSchema = z.object({
  /** Generated cards */
  cards: z.array(GeneratedCardSchema),
  /** Generation metadata */
  metadata: z
    .object({
      model: z.string().optional(),
      tokensUsed: z.number().int().optional(),
    })
    .optional(),
});

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

/**
 * Deck list response schema
 */
export const DeckListResponseSchema = ApiResponseSchema(z.array(DeckSchema));

/**
 * Single deck response schema
 */
export const DeckResponseSchema = ApiResponseSchema(DeckSchema);

/**
 * Deck with cards response schema
 */
export const DeckDetailResponseSchema = ApiResponseSchema(
  DeckSchema.extend({
    cards: z.array(CardSchema).optional(),
  })
);

/**
 * Card list response schema
 */
export const CardListResponseSchema = ApiResponseSchema(z.array(CardSchema));

/**
 * Single card response schema
 */
export const CardResponseSchema = ApiResponseSchema(CardSchema);

/**
 * Health check response schema
 */
export const HealthResponseSchema = z.object({
  success: z.literal(true),
});

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

/**
 * Pagination metadata schema
 */
export const PaginationSchema = z.object({
  /** Current page number (1-indexed) */
  page: z.number().int().positive(),
  /** Items per page */
  perPage: z.number().int().positive(),
  /** Total number of items */
  total: z.number().int().nonnegative(),
  /** Total number of pages */
  totalPages: z.number().int().nonnegative(),
});

/**
 * Paginated response wrapper
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationSchema,
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Inferred User type */
export type User = z.infer<typeof UserSchema>;

/** Inferred UserRef type */
export type UserRef = z.infer<typeof UserRefSchema>;

/** Inferred Deck type */
export type Deck = z.infer<typeof DeckSchema>;

/** Inferred DeckSummary type */
export type DeckSummary = z.infer<typeof DeckSummarySchema>;

/** Inferred Card type */
export type Card = z.infer<typeof CardSchema>;

/** Inferred CardSummary type */
export type CardSummary = z.infer<typeof CardSummarySchema>;

/** Inferred CardType type */
export type CardType = z.infer<typeof CardTypeSchema>;

/** Inferred StudySession type */
export type StudySession = z.infer<typeof StudySessionSchema>;

/** Inferred StudyCard type */
export type StudyCard = z.infer<typeof StudyCardSchema>;

/** Inferred StudyRating type */
export type StudyRating = z.infer<typeof StudyRatingSchema>;

/** Inferred PomodoroSession type */
export type PomodoroSession = z.infer<typeof PomodoroSessionSchema>;

/** Inferred PomodoroType type */
export type PomodoroType = z.infer<typeof PomodoroTypeSchema>;

/** Inferred PomodoroTimerState type */
export type PomodoroTimerState = z.infer<typeof PomodoroTimerStateSchema>;

/** Inferred ApiError type */
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Inferred Pagination type */
export type Pagination = z.infer<typeof PaginationSchema>;

/** Inferred CreateDeckInput type */
export type CreateDeckInput = z.infer<typeof CreateDeckInputSchema>;

/** Inferred UpdateDeckInput type */
export type UpdateDeckInput = z.infer<typeof UpdateDeckInputSchema>;

/** Inferred CreateCardInput type */
export type CreateCardInput = z.infer<typeof CreateCardInputSchema>;

/** Inferred UpdateCardInput type */
export type UpdateCardInput = z.infer<typeof UpdateCardInputSchema>;

/** Inferred GenerateCardsInput type */
export type GenerateCardsInput = z.infer<typeof GenerateCardsInputSchema>;

/** Inferred GeneratedCard type */
export type GeneratedCard = z.infer<typeof GeneratedCardSchema>;
