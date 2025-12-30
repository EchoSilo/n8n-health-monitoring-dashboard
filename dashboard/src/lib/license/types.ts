/**
 * License System Types
 *
 * Type definitions for the licensing and subscription system.
 */

// Re-export Prisma enums for convenience
export type { LicenseTier, LicenseStatus, OrganizationRole } from '@prisma/client';

/**
 * Tier limits configuration
 */
export interface TierLimits {
  maxServers: number; // -1 = unlimited
  maxWorkflows: number; // -1 = unlimited
  maxWorkspaces: number; // 0 = disabled, -1 = unlimited
  maxMembers: number; // -1 = unlimited
  aiAnalysisEnabled: boolean;
  whiteLabelEnabled: boolean;
  monthlyPrice: number | null; // null = contact sales (Enterprise)
  annualPrice: number | null; // null = contact sales (Enterprise)
}

/**
 * License validation result from phone-home server
 */
export interface LicenseValidationResult {
  valid: boolean;
  tier: 'COMMUNITY' | 'PRO' | 'AGENCY' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'GRACE_PERIOD';
  limits: TierLimits;
  expiresAt: string | null;
  gracePeriodEndsAt: string | null;
  message?: string;
}

/**
 * License info for display in UI
 */
export interface LicenseInfo {
  tier: 'COMMUNITY' | 'PRO' | 'AGENCY' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'GRACE_PERIOD';
  limits: TierLimits;
  usage: {
    servers: number;
    workflows: number;
    workspaces: number;
    members: number;
  };
  billing: {
    email: string | null;
    nextBillingDate: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

/**
 * Limit check result
 */
export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  message?: string;
}

/**
 * Feature flags that can be gated
 */
export type FeatureFlag =
  | 'AI_ANALYSIS'
  | 'WORKSPACES'
  | 'WHITE_LABEL'
  | 'CUSTOM_BRANDING'
  | 'SSO'
  | 'AUDIT_LOGS'
  | 'PRIORITY_SUPPORT';

/**
 * Resource types that have limits
 */
export type LimitedResource = 'servers' | 'workflows' | 'workspaces' | 'members';

/**
 * Stripe checkout session request
 */
export interface CheckoutSessionRequest {
  tier: 'PRO' | 'AGENCY';
  interval: 'month' | 'year';
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Stripe customer portal request
 */
export interface CustomerPortalRequest {
  returnUrl?: string;
}

/**
 * Organization info for context
 */
export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  workspaceId: string | null; // If user is restricted to a workspace
}

/**
 * Workspace info
 */
export interface WorkspaceInfo {
  id: string;
  name: string;
  organizationId: string;
}
