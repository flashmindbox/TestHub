/**
 * CoApp API Contract Schemas - Tenant Management
 *
 * Zod schemas for validating CoApp tenant API responses.
 *
 * @module contracts/coapp/tenant.schemas
 */

import { z } from 'zod';
import {
  DateTimeSchema,
  IdSchema,
  SlugSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
} from './schemas';
import {
  TenantSchema,
  TenantRoleSchema,
  UserSchema,
  UserRefSchema,
  TenantPlanSchema,
  TenantStatusSchema,
} from './auth.schemas';

// =============================================================================
// TENANT FEATURES & LIMITS SCHEMAS
// =============================================================================

/**
 * Tenant feature flags schema
 * Represents features enabled for a tenant
 */
export const TenantFeaturesSchema = z.object({
  /** API access enabled */
  apiAccess: z.boolean().optional(),
  /** Advanced analytics enabled */
  advancedAnalytics: z.boolean().optional(),
  /** Custom branding enabled */
  customBranding: z.boolean().optional(),
  /** SSO authentication enabled */
  ssoEnabled: z.boolean().optional(),
  /** Webhook integrations enabled */
  webhooks: z.boolean().optional(),
  /** Audit logging enabled */
  auditLogs: z.boolean().optional(),
}).passthrough(); // Allow additional feature flags

/**
 * Tenant limits schema
 * Represents usage limits for a tenant
 */
export const TenantLimitsSchema = z.object({
  /** Maximum number of users */
  maxUsers: z.number().int().nonnegative(),
  /** Maximum number of projects */
  maxProjects: z.number().int().nonnegative().optional(),
  /** Storage limit in bytes */
  storageBytes: z.number().int().nonnegative().optional(),
  /** API rate limit (requests per minute) */
  apiRateLimit: z.number().int().nonnegative().optional(),
}).passthrough(); // Allow additional limits

// =============================================================================
// TENANT CONTEXT SCHEMAS
// =============================================================================

/**
 * Tenant context user schema
 * User information within tenant context
 */
export const TenantContextUserSchema = z.object({
  /** User ID */
  id: IdSchema,
  /** User's email */
  email: z.string().email(),
  /** User's display name */
  name: z.string(),
  /** User's role in the tenant */
  role: TenantRoleSchema,
});

/**
 * Tenant context schema - expanded response from /tenants/current
 * API returns tenant directly with embedded features and limits
 */
export const TenantContextSchema = z.object({
  /** Tenant ID */
  id: IdSchema,
  /** Tenant slug */
  slug: SlugSchema,
  /** Tenant name */
  name: z.string(),
  /** Institution type */
  institutionType: z.string().optional(),
  /** Subscription plan */
  plan: z.string(),
  /** Tenant status */
  status: z.string(),
  /** Custom domain */
  customDomain: z.string().nullable().optional(),
  /** Custom domain verified flag */
  customDomainVerified: z.boolean().optional(),
  /** Tenant settings */
  settings: z.record(z.any()).optional(),
  /** Tenant addons */
  addons: z.array(z.string()).optional(),
  /** Enabled features for this tenant */
  features: TenantFeaturesSchema.optional(),
  /** Usage limits for this tenant */
  limits: TenantLimitsSchema.optional(),
  /** Creation timestamp */
  createdAt: DateTimeSchema.optional(),
  /** Last update timestamp */
  updatedAt: DateTimeSchema.optional(),
});

// =============================================================================
// TENANT CRUD SCHEMAS
// =============================================================================

/**
 * Create tenant input schema
 */
export const CreateTenantInputSchema = z.object({
  /** Tenant display name */
  name: z.string().min(1, 'Tenant name is required'),
  /** URL-friendly slug (auto-generated if not provided) */
  slug: SlugSchema.optional(),
});

/**
 * Update tenant input schema
 */
export const UpdateTenantInputSchema = z.object({
  /** New tenant name */
  name: z.string().min(1).optional(),
  /** New slug */
  slug: SlugSchema.optional(),
});

/**
 * Create tenant response schema
 * API may return { message, tenant } or just the tenant directly
 */
export const CreateTenantResponseSchema = z.union([
  z.object({
    /** Success message */
    message: z.string(),
    /** Created tenant */
    tenant: TenantSchema,
  }),
  // Also allow direct tenant response
  TenantSchema,
]);

// =============================================================================
// TENANT MEMBER SCHEMAS
// =============================================================================

/**
 * Tenant member schema
 * Represents a user's membership in a tenant
 * API returns flat structure with user details embedded
 */
export const TenantMemberSchema = z.object({
  /** Membership ID */
  id: IdSchema,
  /** User ID */
  userId: IdSchema,
  /** Member's email */
  email: z.string().email(),
  /** Member's display name */
  name: z.string(),
  /** Member's phone (optional) */
  phone: z.string().nullable().optional(),
  /** Member's role in the tenant */
  role: TenantRoleSchema,
  /** Whether member is active */
  isActive: z.boolean().optional(),
  /** Last login timestamp */
  lastLoginAt: DateTimeSchema.nullable().optional(),
  /** When the user joined the tenant */
  joinedAt: DateTimeSchema,
});

/**
 * Tenant members list response schema
 * API may return { members, total } or just an array directly
 */
export const TenantMembersResponseSchema = z.union([
  z.object({
    /** List of tenant members */
    members: z.array(TenantMemberSchema),
    /** Total member count */
    total: z.number().int().nonnegative(),
  }),
  // Also accept direct array response
  z.array(TenantMemberSchema),
]);

/**
 * Invite member input schema
 */
export const InviteMemberInputSchema = z.object({
  /** Email of user to invite */
  email: z.string().email(),
  /** Role to assign */
  role: TenantRoleSchema.optional(),
});

/**
 * Update member role input schema
 */
export const UpdateMemberRoleInputSchema = z.object({
  /** New role for the member */
  role: TenantRoleSchema,
});

/**
 * Invite member response schema
 */
export const InviteMemberResponseSchema = z.object({
  /** Success message */
  message: z.string(),
  /** Invitation ID (if pending) */
  invitationId: IdSchema.optional(),
  /** Member (if user already exists) */
  member: TenantMemberSchema.optional(),
});

/**
 * Remove member response schema
 */
export const RemoveMemberResponseSchema = z.object({
  /** Success message */
  message: z.string(),
});

// =============================================================================
// WRAPPED API RESPONSE SCHEMAS
// =============================================================================

/**
 * Wrapped tenant context response
 */
export const TenantContextApiResponseSchema = ApiResponseSchema(TenantContextSchema);

/**
 * Wrapped create tenant response
 */
export const CreateTenantApiResponseSchema = ApiResponseSchema(CreateTenantResponseSchema);

/**
 * Wrapped tenant response
 */
export const TenantApiResponseSchema = ApiResponseSchema(TenantSchema);

/**
 * Wrapped tenant members response
 */
export const TenantMembersApiResponseSchema = ApiResponseSchema(TenantMembersResponseSchema);

/**
 * Paginated tenant members response
 */
export const TenantMembersPaginatedResponseSchema = PaginatedResponseSchema(TenantMemberSchema);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Inferred TenantFeatures type */
export type TenantFeatures = z.infer<typeof TenantFeaturesSchema>;

/** Inferred TenantLimits type */
export type TenantLimits = z.infer<typeof TenantLimitsSchema>;

/** Inferred TenantContext type */
export type TenantContext = z.infer<typeof TenantContextSchema>;

/** Inferred TenantContextUser type */
export type TenantContextUser = z.infer<typeof TenantContextUserSchema>;

/** Inferred CreateTenantInput type */
export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>;

/** Inferred UpdateTenantInput type */
export type UpdateTenantInput = z.infer<typeof UpdateTenantInputSchema>;

/** Inferred CreateTenantResponse type */
export type CreateTenantResponse = z.infer<typeof CreateTenantResponseSchema>;

/** Inferred TenantMember type */
export type TenantMember = z.infer<typeof TenantMemberSchema>;

/** Inferred TenantMembersResponse type */
export type TenantMembersResponse = z.infer<typeof TenantMembersResponseSchema>;

/** Inferred InviteMemberInput type */
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;

/** Inferred UpdateMemberRoleInput type */
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleInputSchema>;

/** Inferred InviteMemberResponse type */
export type InviteMemberResponse = z.infer<typeof InviteMemberResponseSchema>;

/** Inferred RemoveMemberResponse type */
export type RemoveMemberResponse = z.infer<typeof RemoveMemberResponseSchema>;
