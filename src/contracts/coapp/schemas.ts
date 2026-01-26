/**
 * CoApp API Contract Schemas - Common/Shared
 *
 * Zod schemas for validating CoApp API responses.
 * These schemas ensure API responses match expected contracts.
 *
 * @module contracts/coapp/schemas
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

/**
 * ISO 8601 date-time string schema
 * Supports both standard ISO format and Date.toISOString() output
 */
export const DateTimeSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date-time string' }
);

/**
 * UUID schema (for UUID formatted IDs)
 */
export const UuidSchema = z.string().uuid();

/**
 * CUID schema (CoApp uses CUIDs for most entities)
 * CUIDs are 25 character strings starting with 'c'
 */
export const CuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid CUID format');

/**
 * ID schema (flexible for string IDs - supports UUID, CUID, or other formats)
 */
export const IdSchema = z.string().min(1);

/**
 * Email schema with validation
 */
export const EmailSchema = z.string().email();

/**
 * Slug schema (lowercase alphanumeric with hyphens)
 */
export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// =============================================================================
// API RESPONSE WRAPPER SCHEMAS
// =============================================================================

/**
 * API response metadata schema
 * Included in all API responses
 */
export const ApiMetaSchema = z.object({
  /** Response timestamp */
  timestamp: DateTimeSchema,
  /** Request path */
  path: z.string(),
});

/**
 * Generic API response wrapper schema
 * All CoApp API responses follow this structure
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    /** Response data */
    data: dataSchema,
    /** Response metadata */
    meta: ApiMetaSchema,
  });

/**
 * Error response schema
 * Returned when API requests fail
 */
export const ErrorResponseSchema = z.object({
  /** HTTP status code */
  statusCode: z.number().int(),
  /** Error message */
  message: z.string(),
  /** Error type/name */
  error: z.string(),
  /** Error timestamp */
  timestamp: DateTimeSchema,
  /** Request path */
  path: z.string(),
});

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = z.object({
  /** Total number of items */
  total: z.number().int().nonnegative(),
  /** Current page number (1-indexed) */
  page: z.number().int().positive(),
  /** Items per page */
  limit: z.number().int().positive(),
  /** Total number of pages */
  totalPages: z.number().int().nonnegative(),
});

/**
 * Paginated response wrapper
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    /** Array of items */
    data: z.array(itemSchema),
    /** Pagination metadata */
    pagination: PaginationMetaSchema,
    /** Response metadata */
    meta: ApiMetaSchema,
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Inferred ApiMeta type */
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

/** Inferred ErrorResponse type */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/** Inferred PaginationMeta type */
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
