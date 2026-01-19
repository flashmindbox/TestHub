/**
 * Contract Validator Utility
 *
 * Validates API responses against Zod schemas for contract testing.
 * Provides detailed error messages and validation statistics.
 *
 * @module utils/contract-validator
 */

import { z } from 'zod';
import type { APIResponse } from '@playwright/test';

// Zod v4 compatibility - use issues instead of errors
type ZodError = z.ZodError;
type ZodSchema<T = unknown> = z.ZodType<T>;
type ZodIssue = z.core.$ZodIssue;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Validation statistics
 */
export interface ValidationStats {
  /** Total validations attempted */
  total: number;
  /** Validations that passed */
  passed: number;
  /** Validations that failed */
  failed: number;
  /** Pass rate as percentage */
  passRate: number;
}

/**
 * Safe parse result with detailed errors
 */
export interface SafeParseResult<T> {
  /** Whether validation succeeded */
  success: boolean;
  /** Validated data (if successful) */
  data?: T;
  /** Error messages (if failed) */
  errors?: string[];
  /** Raw Zod error (if failed) */
  zodError?: ZodError;
}

/**
 * Validation mode
 * - strict: All fields must match exactly
 * - lenient: Extra fields are allowed (passthrough)
 */
export type ValidationMode = 'strict' | 'lenient';

/**
 * Validator options
 */
export interface ValidatorOptions {
  /** Validation mode (default: 'strict') */
  mode?: ValidationMode;
  /** Include raw data in error messages (default: false) */
  includeRawData?: boolean;
  /** Maximum number of errors to report (default: 10) */
  maxErrors?: number;
}

/**
 * Contract validation error with detailed context
 */
export class ContractValidationError extends Error {
  /** Path to invalid field(s) */
  public readonly paths: string[];
  /** Individual error messages */
  public readonly errors: string[];
  /** Raw Zod error */
  public readonly zodError: ZodError;
  /** Context where validation failed */
  public readonly context?: string;

  constructor(zodError: ZodError, context?: string) {
    const issues = getZodIssues(zodError);
    const errors = formatZodIssues(issues);
    const message = formatErrorMessage(errors, context);
    super(message);

    this.name = 'ContractValidationError';
    this.paths = issues.map((e) => (e.path ?? []).map(String).join('.'));
    this.errors = errors;
    this.zodError = zodError;
    this.context = context;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ContractValidationError.prototype);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get issues from ZodError (compatible with Zod v3 and v4)
 */
function getZodIssues(error: ZodError): ZodIssue[] {
  // Zod v4 uses 'issues', v3 uses 'errors'
  return (error as { issues?: ZodIssue[] }).issues ?? (error as { errors?: ZodIssue[] }).errors ?? [];
}

/**
 * Format Zod issues into readable strings
 */
function formatZodIssues(issues: ZodIssue[], maxErrors = 10): string[] {
  return issues.slice(0, maxErrors).map((issue) => {
    const pathArray = issue.path ?? [];
    const path = pathArray.length > 0 ? `[${pathArray.map(String).join('.')}]` : '[root]';
    const code = issue.code as string;

    // Type assertion for accessing issue-specific properties
    const err = issue as unknown as Record<string, unknown>;

    switch (code) {
      case 'invalid_type':
        return `${path}: Expected ${err.expected}, received ${err.received}`;
      case 'invalid_literal':
        return `${path}: Expected literal ${JSON.stringify(err.expected)}, received ${JSON.stringify(err.received)}`;
      case 'unrecognized_keys':
        return `${path}: Unrecognized keys: ${(err.keys as string[])?.join(', ')}`;
      case 'invalid_enum_value':
        return `${path}: Invalid enum value. Expected one of: ${(err.options as string[])?.join(', ')}`;
      case 'invalid_string':
      case 'invalid_format':
        if (err.validation === 'email' || err.format === 'email') return `${path}: Invalid email format`;
        if (err.validation === 'url' || err.format === 'url') return `${path}: Invalid URL format`;
        if (err.validation === 'uuid' || err.format === 'uuid') return `${path}: Invalid UUID format`;
        return `${path}: Invalid string (${err.validation ?? err.format})`;
      case 'too_small':
        return `${path}: Value too small (minimum: ${err.minimum})`;
      case 'too_big':
        return `${path}: Value too large (maximum: ${err.maximum})`;
      case 'custom':
        return `${path}: ${issue.message}`;
      default:
        return `${path}: ${issue.message} (${code})`;
    }
  });
}

/**
 * Format Zod errors into readable strings (wrapper for backward compatibility)
 */
function formatZodErrors(error: ZodError, maxErrors = 10): string[] {
  return formatZodIssues(getZodIssues(error), maxErrors);
}

/**
 * Format complete error message with context
 */
function formatErrorMessage(errors: string[], context?: string): string {
  const header = context ? `Contract validation failed: ${context}` : 'Contract validation failed';

  const errorList = errors.map((e) => `  • ${e}`).join('\n');

  return `${header}\n\nErrors:\n${errorList}`;
}

/**
 * Apply validation mode to schema
 */
function applyMode<T extends ZodSchema>(schema: T, mode: ValidationMode): T {
  if (mode === 'lenient') {
    // Try to call passthrough if available (ZodObject)
    const schemaAny = schema as { passthrough?: () => T };
    if (typeof schemaAny.passthrough === 'function') {
      return schemaAny.passthrough() as unknown as T;
    }
  }
  return schema;
}

/**
 * Create a ZodError-like object from Zod v4 result
 * Zod v4 may structure error data differently
 */
function createZodErrorFromResult(result: unknown): ZodError {
  const r = result as Record<string, unknown>;
  const errorObj = r.error as Record<string, unknown> | undefined;

  // Try to get issues from the result directly (Zod v4 format)
  const issues = (r.issues ?? errorObj?.issues ?? []) as ZodIssue[];

  // Create a ZodError-like object compatible with our usage
  const zodErrorLike = {
    issues,
    errors: issues, // For backward compatibility
    name: 'ZodError',
    message: 'Validation failed',
    format: () => ({}),
    flatten: () => ({ formErrors: [] as string[], fieldErrors: {} as Record<string, string[]> }),
    toString: () => 'ZodError: Validation failed',
    addIssue: () => {},
    addIssues: () => {},
    isEmpty: issues.length === 0,
  };

  return zodErrorLike as unknown as ZodError;
}

// =============================================================================
// CONTRACT VALIDATOR CLASS
// =============================================================================

/**
 * Contract Validator
 *
 * Validates data against Zod schemas with statistics tracking
 * and developer-friendly error messages.
 *
 * @example
 * ```typescript
 * const validator = createContractValidator();
 *
 * // Strict validation (throws on error)
 * const deck = validator.validate(DeckSchema, apiResponse);
 *
 * // Safe parsing (returns result object)
 * const result = validator.safeParse(CardSchema, data);
 * if (!result.success) {
 *   console.log(result.errors);
 * }
 *
 * // Assertion (for type narrowing)
 * validator.assertValid(UserSchema, userData, 'User profile response');
 * // userData is now typed as User
 *
 * // Get statistics
 * console.log(validator.getStats());
 * ```
 */
export class ContractValidator {
  private stats = { total: 0, passed: 0, failed: 0 };
  private options: Required<ValidatorOptions>;

  constructor(options: ValidatorOptions = {}) {
    this.options = {
      mode: options.mode ?? 'strict',
      includeRawData: options.includeRawData ?? false,
      maxErrors: options.maxErrors ?? 10,
    };
  }

  /**
   * Validate data against a schema
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @param context - Optional context for error messages
   * @returns Validated and typed data
   * @throws {ContractValidationError} If validation fails
   */
  validate<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
    this.stats.total++;

    const effectiveSchema = applyMode(schema, this.options.mode);
    const result = effectiveSchema.safeParse(data);

    if (result.success) {
      this.stats.passed++;
      return result.data;
    }

    this.stats.failed++;
    // Zod v4 returns error differently - handle both v3 and v4
    const zodError = (result as { error?: ZodError }).error ?? createZodErrorFromResult(result);
    throw new ContractValidationError(zodError, context);
  }

  /**
   * Safely parse data without throwing
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Result object with success status and data or errors
   */
  safeParse<T>(schema: ZodSchema<T>, data: unknown): SafeParseResult<T> {
    this.stats.total++;

    const effectiveSchema = applyMode(schema, this.options.mode);
    const result = effectiveSchema.safeParse(data);

    if (result.success) {
      this.stats.passed++;
      return {
        success: true,
        data: result.data,
      };
    }

    this.stats.failed++;
    // Zod v4 returns error differently - handle both v3 and v4
    const zodError = (result as { error?: ZodError }).error ?? createZodErrorFromResult(result);
    return {
      success: false,
      errors: formatZodErrors(zodError, this.options.maxErrors),
      zodError: zodError,
    };
  }

  /**
   * Assert data is valid (type guard)
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @param context - Optional context for error messages
   * @throws {ContractValidationError} If validation fails
   */
  assertValid<T>(schema: ZodSchema<T>, data: unknown, context?: string): asserts data is T {
    this.validate(schema, data, context);
  }

  /**
   * Get validation statistics
   */
  getStats(): ValidationStats {
    return {
      ...this.stats,
      passRate: this.stats.total > 0 ? (this.stats.passed / this.stats.total) * 100 : 100,
    };
  }

  /**
   * Reset validation statistics
   */
  reset(): void {
    this.stats = { total: 0, passed: 0, failed: 0 };
  }

  /**
   * Get current validation mode
   */
  getMode(): ValidationMode {
    return this.options.mode;
  }

  /**
   * Set validation mode
   */
  setMode(mode: ValidationMode): void {
    this.options.mode = mode;
  }
}

// =============================================================================
// PLAYWRIGHT TEST HELPERS
// =============================================================================

/**
 * Validate Playwright APIResponse against a Zod schema
 *
 * @param response - Playwright APIResponse
 * @param schema - Zod schema to validate against
 * @param validator - Optional validator instance (creates new if not provided)
 * @returns Validated and typed response data
 * @throws {ContractValidationError} If validation fails
 *
 * @example
 * ```typescript
 * const response = await request.get('/api/v1/decks');
 * const decks = await expectContractValid(response, DeckListResponseSchema);
 * // decks is now typed correctly
 * ```
 */
export async function expectContractValid<T>(
  response: APIResponse,
  schema: ZodSchema<T>,
  validator?: ContractValidator
): Promise<T> {
  const v = validator ?? new ContractValidator();

  // Build context from response info
  const status = response.status();
  const url = response.url();
  const context = `${url} (${status})`;

  // Parse JSON body
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ContractValidationError(
      createZodErrorFromResult({
        issues: [
          {
            code: 'custom',
            path: [],
            message: 'Response body is not valid JSON',
          },
        ],
      }),
      context
    );
  }

  return v.validate(schema, data, context);
}

/**
 * Safely validate Playwright APIResponse without throwing
 *
 * @param response - Playwright APIResponse
 * @param schema - Zod schema to validate against
 * @param validator - Optional validator instance
 * @returns SafeParseResult with response context
 */
export async function safeContractParse<T>(
  response: APIResponse,
  schema: ZodSchema<T>,
  validator?: ContractValidator
): Promise<SafeParseResult<T> & { context: string }> {
  const v = validator ?? new ContractValidator();

  const status = response.status();
  const url = response.url();
  const context = `${url} (${status})`;

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return {
      success: false,
      errors: ['Response body is not valid JSON'],
      context,
    };
  }

  const result = v.safeParse(schema, data);
  return { ...result, context };
}

/**
 * Create assertion helper bound to a schema
 *
 * @param schema - Zod schema to bind
 * @param validator - Optional validator instance
 * @returns Bound assertion function
 *
 * @example
 * ```typescript
 * const assertDeck = createSchemaAssertion(DeckSchema);
 *
 * const response = await request.get('/api/v1/decks/123');
 * const deck = await assertDeck(response);
 * ```
 */
export function createSchemaAssertion<T>(schema: ZodSchema<T>, validator?: ContractValidator) {
  return async (response: APIResponse): Promise<T> => {
    return expectContractValid(response, schema, validator);
  };
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new ContractValidator instance
 *
 * @param options - Validator options
 * @returns New ContractValidator instance
 *
 * @example
 * ```typescript
 * // Strict mode (default)
 * const validator = createContractValidator();
 *
 * // Lenient mode (allows extra fields)
 * const lenientValidator = createContractValidator({ mode: 'lenient' });
 * ```
 */
export function createContractValidator(options?: ValidatorOptions): ContractValidator {
  return new ContractValidator(options);
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default validator instance for convenience
 */
export const defaultValidator = createContractValidator();

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { z };
export type { ZodError, ZodSchema };
