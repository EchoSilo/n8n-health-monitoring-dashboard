/**
 * License Tier Limits Configuration
 *
 * Defines the limits and features for each subscription tier.
 */

import type { TierLimits, FeatureFlag } from './types';

export type LicenseTierKey = 'COMMUNITY' | 'PRO' | 'AGENCY' | 'ENTERPRISE';

/**
 * Tier limits configuration
 * -1 means unlimited
 * 0 for maxWorkspaces means feature is disabled
 */
export const TIER_LIMITS: Record<LicenseTierKey, TierLimits> = {
  COMMUNITY: {
    maxServers: 1,
    maxWorkflows: 10,
    maxWorkspaces: 0, // Workspaces disabled
    maxMembers: 1, // Solo only
    aiAnalysisEnabled: false,
    whiteLabelEnabled: false,
    monthlyPrice: 0,
    annualPrice: 0,
  },
  PRO: {
    maxServers: 5,
    maxWorkflows: 100,
    maxWorkspaces: 0, // Workspaces disabled
    maxMembers: 5,
    aiAnalysisEnabled: true,
    whiteLabelEnabled: false,
    monthlyPrice: 29,
    annualPrice: 290, // ~2 months free
  },
  AGENCY: {
    maxServers: -1, // Unlimited
    maxWorkflows: -1, // Unlimited
    maxWorkspaces: -1, // Unlimited client workspaces
    maxMembers: -1, // Unlimited team + clients
    aiAnalysisEnabled: true,
    whiteLabelEnabled: true,
    monthlyPrice: 99,
    annualPrice: 990, // ~2 months free
  },
  ENTERPRISE: {
    maxServers: -1,
    maxWorkflows: -1,
    maxWorkspaces: -1,
    maxMembers: -1,
    aiAnalysisEnabled: true,
    whiteLabelEnabled: true,
    monthlyPrice: null, // Contact sales
    annualPrice: null, // Contact sales
  },
};

/**
 * Tier display names
 */
export const TIER_NAMES: Record<LicenseTierKey, string> = {
  COMMUNITY: 'Community',
  PRO: 'Pro',
  AGENCY: 'Agency',
  ENTERPRISE: 'Enterprise',
};

/**
 * Tier descriptions for pricing page
 */
export const TIER_DESCRIPTIONS: Record<LicenseTierKey, string> = {
  COMMUNITY: 'For individuals getting started with n8n monitoring',
  PRO: 'For growing teams with multiple n8n servers',
  AGENCY: 'For agencies managing client n8n deployments',
  ENTERPRISE: 'For large organizations with custom requirements',
};

/**
 * Features available per tier
 */
export const TIER_FEATURES: Record<LicenseTierKey, string[]> = {
  COMMUNITY: [
    '1 n8n server',
    '10 workflows',
    'Basic monitoring',
    'Community support',
  ],
  PRO: [
    '5 n8n servers',
    '100 workflows',
    'AI-powered error analysis',
    '5 team members',
    'Email support',
  ],
  AGENCY: [
    'Unlimited n8n servers',
    'Unlimited workflows',
    'AI-powered error analysis',
    'Unlimited team members',
    'Client workspaces',
    'White-labeling',
    'Priority support',
  ],
  ENTERPRISE: [
    'Everything in Agency',
    'SSO/SAML integration',
    'Audit logs',
    'Custom SLA',
    'Dedicated support',
    'On-premise option',
  ],
};

/**
 * Map features to minimum required tier
 */
export const FEATURE_TIER_MAP: Record<FeatureFlag, LicenseTierKey> = {
  AI_ANALYSIS: 'PRO',
  WORKSPACES: 'AGENCY',
  WHITE_LABEL: 'AGENCY',
  CUSTOM_BRANDING: 'AGENCY',
  SSO: 'ENTERPRISE',
  AUDIT_LOGS: 'ENTERPRISE',
  PRIORITY_SUPPORT: 'AGENCY',
};

/**
 * Tier hierarchy for comparison (higher number = higher tier)
 */
export const TIER_HIERARCHY: Record<LicenseTierKey, number> = {
  COMMUNITY: 0,
  PRO: 1,
  AGENCY: 2,
  ENTERPRISE: 3,
};

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeatureAccess(tier: LicenseTierKey, feature: FeatureFlag): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature];
  return TIER_HIERARCHY[tier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Get limits for a tier
 */
export function getTierLimits(tier: LicenseTierKey): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a resource limit allows adding more
 * @returns true if adding one more is allowed
 */
export function checkLimit(
  tier: LicenseTierKey,
  resource: 'servers' | 'workflows' | 'workspaces' | 'members',
  current: number
): { allowed: boolean; max: number; message?: string } {
  const limits = TIER_LIMITS[tier];
  const maxKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof TierLimits;
  const max = limits[maxKey] as number;

  // -1 means unlimited
  if (max === -1) {
    return { allowed: true, max: -1 };
  }

  // 0 means feature disabled (only for workspaces)
  if (max === 0 && resource === 'workspaces') {
    return {
      allowed: false,
      max: 0,
      message: `Workspaces are not available on the ${TIER_NAMES[tier]} plan. Upgrade to Agency to create client workspaces.`,
    };
  }

  if (current >= max) {
    const upgradeMessage = tier !== 'ENTERPRISE'
      ? ` Upgrade to ${getNextTier(tier)} to add more.`
      : '';
    return {
      allowed: false,
      max,
      message: `You've reached the ${resource} limit (${max}) for your ${TIER_NAMES[tier]} plan.${upgradeMessage}`,
    };
  }

  return { allowed: true, max };
}

/**
 * Get the next tier for upgrade suggestions
 */
export function getNextTier(currentTier: LicenseTierKey): LicenseTierKey | null {
  const order: LicenseTierKey[] = ['COMMUNITY', 'PRO', 'AGENCY', 'ENTERPRISE'];
  const currentIndex = order.indexOf(currentTier);
  return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
}

/**
 * Get the required tier for a feature
 */
export function getRequiredTier(feature: FeatureFlag): LicenseTierKey {
  return FEATURE_TIER_MAP[feature];
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null, interval: 'month' | 'year' = 'month'): string {
  if (price === null) {
    return 'Contact us';
  }
  if (price === 0) {
    return 'Free';
  }
  return `$${price}/${interval === 'month' ? 'mo' : 'yr'}`;
}
