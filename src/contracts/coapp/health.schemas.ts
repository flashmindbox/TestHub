/**
 * CoApp API Contract Schemas - Health Check
 *
 * Zod schemas for validating CoApp health check API responses.
 *
 * @module contracts/coapp/health.schemas
 */

import { z } from 'zod';

// =============================================================================
// HEALTH CHECK SCHEMAS
// =============================================================================

/**
 * Health status enumeration
 * Supports various health status formats from different health check libraries
 */
export const HealthStatusSchema = z.enum(['ok', 'up', 'healthy', 'error', 'down', 'unhealthy', 'shutting_down']);

/**
 * Individual service health info schema
 */
export const ServiceHealthInfoSchema = z.record(
  z.string(),
  z.object({
    status: z.string(),
  }).passthrough()
);

/**
 * Health check error details schema
 */
export const HealthErrorDetailsSchema = z.record(
  z.string(),
  z.object({
    status: z.string(),
    message: z.string().optional(),
  }).passthrough()
);

/**
 * Health check details schema
 * Detailed health information for each service
 */
export const HealthDetailsSchema = z.record(
  z.string(),
  z.object({
    status: z.string(),
    message: z.string().optional(),
    responseTime: z.number().optional(),
  }).passthrough()
);

/**
 * Health check response schema
 * Full health check response from /health endpoint
 */
export const HealthCheckSchema = z.object({
  /** Overall health status */
  status: HealthStatusSchema,
  /** Service health info (present when healthy) */
  info: ServiceHealthInfoSchema.optional().nullable(),
  /** Service error info (present when unhealthy) */
  error: HealthErrorDetailsSchema.optional().nullable(),
  /** Detailed health information per service */
  details: HealthDetailsSchema.optional(),
});

/**
 * Simple health check response schema
 * Basic response for liveness probe
 */
export const SimpleHealthCheckSchema = z.object({
  /** Health status */
  status: z.literal('ok'),
});

/**
 * Readiness check response schema
 * Response for readiness probe
 */
export const ReadinessCheckSchema = z.object({
  /** Health status */
  status: HealthStatusSchema,
  /** Whether the service is ready to accept traffic */
  ready: z.boolean(),
  /** Service checks */
  checks: z.record(z.string(), z.boolean()).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Inferred HealthStatus type */
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/** Inferred ServiceHealthInfo type */
export type ServiceHealthInfo = z.infer<typeof ServiceHealthInfoSchema>;

/** Inferred HealthErrorDetails type */
export type HealthErrorDetails = z.infer<typeof HealthErrorDetailsSchema>;

/** Inferred HealthDetails type */
export type HealthDetails = z.infer<typeof HealthDetailsSchema>;

/** Inferred HealthCheck type */
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

/** Inferred SimpleHealthCheck type */
export type SimpleHealthCheck = z.infer<typeof SimpleHealthCheckSchema>;

/** Inferred ReadinessCheck type */
export type ReadinessCheck = z.infer<typeof ReadinessCheckSchema>;
