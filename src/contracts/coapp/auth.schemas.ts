/**
 * CoApp API Contract Schemas - Authentication
 *
 * Zod schemas for validating CoApp authentication API responses.
 *
 * @module contracts/coapp/auth.schemas
 */

import { z } from 'zod';
import {
  DateTimeSchema,
  IdSchema,
  EmailSchema,
  SlugSchema,
  ApiResponseSchema,
} from './schemas';

// =============================================================================
// USER SCHEMAS
// =============================================================================

/**
 * User entity schema
 * Represents a CoApp user account
 */
export const UserSchema = z.object({
  /** Unique user identifier (CUID) */
  id: IdSchema,
  /** User's email address */
  email: EmailSchema,
  /** User's display name */
  name: z.string(),
  /** Account creation timestamp (optional - not always returned) */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp (optional - not always returned) */
  updatedAt: DateTimeSchema.optional(),
});

/**
 * Minimal user schema (for embedded references)
 */
export const UserRefSchema = z.object({
  id: IdSchema,
  name: z.string(),
  email: EmailSchema.optional(),
});

// =============================================================================
// TENANT SCHEMAS
// =============================================================================

/**
 * Tenant plan enumeration (accepts both lowercase and uppercase)
 */
export const TenantPlanSchema = z.enum([
  'free', 'starter', 'professional', 'enterprise',
  'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE',
]);

/**
 * Tenant status enumeration (accepts both lowercase and uppercase)
 */
export const TenantStatusSchema = z.enum([
  'active', 'suspended', 'pending', 'archived',
  'ACTIVE', 'SUSPENDED', 'PENDING', 'ARCHIVED',
]);

/**
 * Tenant entity schema
 * Represents a CoApp tenant/organization
 * Note: Some fields are optional as they may not be returned in all API responses
 */
export const TenantSchema = z.object({
  /** Unique tenant identifier (UUID) */
  id: IdSchema,
  /** Tenant display name */
  name: z.string(),
  /** URL-friendly slug */
  slug: SlugSchema,
  /** Subscription plan */
  plan: TenantPlanSchema.optional(),
  /** Tenant status */
  status: TenantStatusSchema.optional(),
  /** Tenant creation timestamp */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp */
  updatedAt: DateTimeSchema.optional(),
});

/**
 * Minimal tenant schema (for embedded references)
 */
export const TenantRefSchema = z.object({
  id: IdSchema,
  name: z.string(),
  slug: SlugSchema,
  plan: TenantPlanSchema.optional(),
});

// =============================================================================
// USER-TENANT RELATIONSHIP SCHEMAS
// =============================================================================

/**
 * Tenant role enumeration (accepts both lowercase and uppercase)
 */
export const TenantRoleSchema = z.enum([
  'owner', 'admin', 'member', 'viewer',
  'OWNER', 'ADMIN', 'MEMBER', 'VIEWER',
]);

/**
 * User's tenant membership schema
 * Represents a user's relationship to a tenant
 */
export const UserTenantSchema = z.object({
  /** Tenant ID */
  tenantId: IdSchema,
  /** User's role in the tenant */
  role: TenantRoleSchema,
  /** Full tenant details */
  tenant: TenantSchema,
});

/**
 * User with tenants schema
 * Full user profile with all tenant memberships
 */
export const UserWithTenantsSchema = UserSchema.extend({
  /** User's tenant memberships */
  tenants: z.array(UserTenantSchema),
});

// =============================================================================
// AUTH RESPONSE SCHEMAS
// =============================================================================

/**
 * Register response schema
 * Returned after successful user registration
 */
export const RegisterResponseSchema = z.object({
  /** Success message */
  message: z.string(),
  /** Created user (without password) */
  user: UserSchema,
});

/**
 * Login response schema
 * Returned after successful authentication
 */
export const LoginResponseSchema = z.object({
  /** JWT access token */
  accessToken: z.string(),
  /** Authenticated user with tenants */
  user: UserWithTenantsSchema,
});

/**
 * Me response schema
 * Returned from /auth/me endpoint
 */
export const MeResponseSchema = UserWithTenantsSchema;

/**
 * Refresh token response schema
 */
export const RefreshTokenResponseSchema = z.object({
  /** New JWT access token */
  accessToken: z.string(),
});

/**
 * Logout response schema
 */
export const LogoutResponseSchema = z.object({
  /** Success message */
  message: z.string(),
});

// =============================================================================
// AUTH INPUT SCHEMAS
// =============================================================================

/**
 * Register input schema
 */
export const RegisterInputSchema = z.object({
  /** User's email */
  email: EmailSchema,
  /** User's password (min 8 chars) */
  password: z.string().min(8),
  /** User's display name */
  name: z.string().min(1),
});

/**
 * Login input schema
 */
export const LoginInputSchema = z.object({
  /** User's email */
  email: EmailSchema,
  /** User's password */
  password: z.string().min(1),
});

// =============================================================================
// WRAPPED API RESPONSE SCHEMAS
// =============================================================================

/**
 * Wrapped register response
 */
export const RegisterApiResponseSchema = ApiResponseSchema(RegisterResponseSchema);

/**
 * Wrapped login response
 */
export const LoginApiResponseSchema = ApiResponseSchema(LoginResponseSchema);

/**
 * Wrapped me response
 */
export const MeApiResponseSchema = ApiResponseSchema(MeResponseSchema);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Inferred User type */
export type User = z.infer<typeof UserSchema>;

/** Inferred UserRef type */
export type UserRef = z.infer<typeof UserRefSchema>;

/** Inferred Tenant type */
export type Tenant = z.infer<typeof TenantSchema>;

/** Inferred TenantRef type */
export type TenantRef = z.infer<typeof TenantRefSchema>;

/** Inferred TenantPlan type */
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

/** Inferred TenantStatus type */
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

/** Inferred TenantRole type */
export type TenantRole = z.infer<typeof TenantRoleSchema>;

/** Inferred UserTenant type */
export type UserTenant = z.infer<typeof UserTenantSchema>;

/** Inferred UserWithTenants type */
export type UserWithTenants = z.infer<typeof UserWithTenantsSchema>;

/** Inferred RegisterResponse type */
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

/** Inferred LoginResponse type */
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/** Inferred MeResponse type */
export type MeResponse = z.infer<typeof MeResponseSchema>;

/** Inferred RegisterInput type */
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

/** Inferred LoginInput type */
export type LoginInput = z.infer<typeof LoginInputSchema>;
