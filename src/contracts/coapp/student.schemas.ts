/**
 * CoApp API Contract Schemas - Students
 *
 * Zod schemas for validating CoApp Student API responses.
 *
 * @module contracts/coapp/student.schemas
 */

import { z } from 'zod';
import {
  DateTimeSchema,
  IdSchema,
  EmailSchema,
  PaginationMetaSchema,
  ApiMetaSchema,
} from './schemas';

// =============================================================================
// STUDENT STATUS SCHEMA
// =============================================================================

/**
 * Student status enumeration (accepts both lowercase and uppercase)
 */
export const StudentStatusSchema = z.enum([
  'active', 'inactive', 'graduated', 'dropped',
  'ACTIVE', 'INACTIVE', 'GRADUATED', 'DROPPED',
]);

// =============================================================================
// STUDENT SCHEMAS
// =============================================================================

/**
 * Student entity schema
 * Represents a student in a CoApp tenant
 */
export const StudentSchema = z.object({
  /** Unique student identifier */
  id: IdSchema,
  /** Student's full name */
  name: z.string().min(1),
  /** Student's email address (optional) */
  email: EmailSchema.optional().nullable(),
  /** Student's phone number (optional) */
  phone: z.string().optional().nullable(),
  /** Guardian's name */
  guardianName: z.string().min(1),
  /** Guardian's phone number */
  guardianPhone: z.string().min(1),
  /** Unique enrollment number within tenant */
  enrollmentNo: z.string().min(1),
  /** Student status */
  status: StudentStatusSchema,
  /** Tenant ID this student belongs to */
  tenantId: IdSchema,
  /** Creation timestamp */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp */
  updatedAt: DateTimeSchema.optional(),
});

/**
 * Minimal student schema (for embedded references)
 */
export const StudentRefSchema = z.object({
  id: IdSchema,
  name: z.string(),
  enrollmentNo: z.string(),
});

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Create student request schema
 * For POST /students body validation
 */
export const CreateStudentRequestSchema = z.object({
  /** Student's full name (required) */
  name: z.string().min(1, 'Name is required'),
  /** Student's email address (optional) */
  email: EmailSchema.optional(),
  /** Student's phone number (optional) */
  phone: z.string().optional(),
  /** Guardian's name (required) */
  guardianName: z.string().min(1, 'Guardian name is required'),
  /** Guardian's phone number (required) */
  guardianPhone: z.string().min(1, 'Guardian phone is required'),
  /** Unique enrollment number (required) */
  enrollmentNo: z.string().min(1, 'Enrollment number is required'),
  /** Student status (optional, defaults to active) */
  status: StudentStatusSchema.optional(),
});

/**
 * Update student request schema
 * For PATCH /students/:id body validation
 */
export const UpdateStudentRequestSchema = z.object({
  /** Student's full name */
  name: z.string().min(1).optional(),
  /** Student's email address */
  email: EmailSchema.optional().nullable(),
  /** Student's phone number */
  phone: z.string().optional().nullable(),
  /** Guardian's name */
  guardianName: z.string().min(1).optional(),
  /** Guardian's phone number */
  guardianPhone: z.string().min(1).optional(),
  /** Student status */
  status: StudentStatusSchema.optional(),
});

/**
 * Student query params schema
 * For GET /students query parameter validation
 */
export const StudentQuerySchema = z.object({
  /** Page number (1-indexed) */
  page: z.coerce.number().int().positive().optional(),
  /** Items per page */
  limit: z.coerce.number().int().positive().max(100).optional(),
  /** Filter by status */
  status: StudentStatusSchema.optional(),
  /** Search by name (partial match) */
  search: z.string().optional(),
  /** Sort field */
  sortBy: z.enum(['name', 'enrollmentNo', 'createdAt', 'updatedAt']).optional(),
  /** Sort order */
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Single student response schema
 * Returned from GET /students/:id, POST /students, PATCH /students/:id
 */
export const StudentResponseSchema = z.object({
  /** Student data */
  data: StudentSchema,
  /** Response metadata */
  meta: ApiMetaSchema.optional(),
});

/**
 * Paginated students response schema
 * Returned from GET /students
 */
export const PaginatedStudentsResponseSchema = z.object({
  /** Array of students */
  data: z.array(StudentSchema),
  /** Pagination metadata */
  meta: z.object({
    /** Total number of students */
    total: z.number().int().nonnegative(),
    /** Current page number (1-indexed) */
    page: z.number().int().positive(),
    /** Items per page */
    limit: z.number().int().positive(),
    /** Total number of pages */
    totalPages: z.number().int().nonnegative(),
  }),
});

/**
 * Alternative paginated response (pagination at root level)
 */
export const PaginatedStudentsAltResponseSchema = z.object({
  /** Array of students */
  data: z.array(StudentSchema),
  /** Pagination metadata */
  pagination: PaginationMetaSchema,
  /** Response metadata */
  meta: ApiMetaSchema.optional(),
});

/**
 * Delete student response schema
 */
export const DeleteStudentResponseSchema = z.object({
  /** Success message */
  message: z.string(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Inferred Student type */
export type Student = z.infer<typeof StudentSchema>;

/** Inferred StudentRef type */
export type StudentRef = z.infer<typeof StudentRefSchema>;

/** Inferred StudentStatus type */
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

/** Inferred CreateStudentRequest type */
export type CreateStudentRequest = z.infer<typeof CreateStudentRequestSchema>;

/** Inferred UpdateStudentRequest type */
export type UpdateStudentRequest = z.infer<typeof UpdateStudentRequestSchema>;

/** Inferred StudentQuery type */
export type StudentQuery = z.infer<typeof StudentQuerySchema>;

/** Inferred StudentResponse type */
export type StudentResponse = z.infer<typeof StudentResponseSchema>;

/** Inferred PaginatedStudentsResponse type */
export type PaginatedStudentsResponse = z.infer<typeof PaginatedStudentsResponseSchema>;
