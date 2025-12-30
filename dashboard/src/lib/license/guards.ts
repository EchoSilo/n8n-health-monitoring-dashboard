/**
 * License Guards
 *
 * Route handlers for checking license limits and feature access.
 * Follows the same pattern as auth-helpers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, forbidden, unauthorized } from '@/lib/auth-helpers';
import { TIER_LIMITS, hasFeatureAccess, TIER_NAMES } from './tier-limits';
import type { FeatureFlag, LimitedResource, LicenseInfo } from './types';
import type { LicenseTier, OrganizationRole, License, Organization } from '@prisma/client';

/**
 * Extended user info with organization context
 */
export interface AuthenticatedUserWithOrg {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  scopes: string[] | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    role: OrganizationRole;
    workspaceId: string | null;
  } | null;
  license: {
    tier: LicenseTier;
    status: string;
    limits: {
      maxServers: number;
      maxWorkflows: number;
      maxWorkspaces: number;
      maxMembers: number;
      aiAnalysisEnabled: boolean;
      whiteLabelEnabled: boolean;
    };
    usage: {
      servers: number;
      workflows: number;
      workspaces: number;
      members: number;
    };
  } | null;
}

/**
 * Get organization and license from authenticated user
 */
export async function getOrgFromRequest(
  req: NextRequest
): Promise<{ user: AuthenticatedUserWithOrg | null; error: NextResponse | null }> {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return { user: null, error: unauthorized() };
  }

  // Get user's default organization
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      organizations: {
        include: {
          organization: {
            include: {
              license: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { user: null, error: unauthorized() };
  }

  // Find default org or first org
  let orgMember = user.organizations.find(
    (m) => m.organizationId === user.defaultOrgId
  );
  if (!orgMember && user.organizations.length > 0) {
    orgMember = user.organizations[0];
  }

  // Build license info
  let license: AuthenticatedUserWithOrg['license'] = null;
  let organization: AuthenticatedUserWithOrg['organization'] = null;

  if (orgMember) {
    const org = orgMember.organization;
    const lic = org.license;

    organization = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: orgMember.role,
      workspaceId: orgMember.workspaceId,
    };

    if (lic) {
      license = {
        tier: lic.tier,
        status: lic.status,
        limits: {
          maxServers: lic.maxServers,
          maxWorkflows: lic.maxWorkflows,
          maxWorkspaces: lic.maxWorkspaces,
          maxMembers: lic.maxMembers,
          aiAnalysisEnabled: lic.aiAnalysisEnabled,
          whiteLabelEnabled: lic.whiteLabelEnabled,
        },
        usage: {
          servers: lic.currentServers,
          workflows: lic.currentWorkflows,
          workspaces: lic.currentWorkspaces,
          members: lic.currentMembers,
        },
      };
    } else {
      // No license = COMMUNITY defaults
      const defaults = TIER_LIMITS.COMMUNITY;
      license = {
        tier: 'COMMUNITY',
        status: 'ACTIVE',
        limits: {
          maxServers: defaults.maxServers,
          maxWorkflows: defaults.maxWorkflows,
          maxWorkspaces: defaults.maxWorkspaces,
          maxMembers: defaults.maxMembers,
          aiAnalysisEnabled: defaults.aiAnalysisEnabled,
          whiteLabelEnabled: defaults.whiteLabelEnabled,
        },
        usage: {
          servers: 0,
          workflows: 0,
          workspaces: 0,
          members: 1,
        },
      };
    }
  }

  return {
    user: {
      id: authUser.id,
      role: authUser.role,
      scopes: authUser.scopes,
      organization,
      license,
    },
    error: null,
  };
}

/**
 * Require a specific feature to be enabled on the license
 */
export async function requireFeature(
  req: NextRequest,
  feature: FeatureFlag
): Promise<{ user: AuthenticatedUserWithOrg | null; error: NextResponse | null }> {
  const { user, error } = await getOrgFromRequest(req);
  if (error) return { user: null, error };
  if (!user) return { user: null, error: unauthorized() };

  // If no organization/license, treat as COMMUNITY
  const tier = user.license?.tier || 'COMMUNITY';

  if (!hasFeatureAccess(tier, feature)) {
    const requiredTier = getRequiredTierForFeature(feature);
    return {
      user: null,
      error: forbidden(
        `${feature.replace('_', ' ')} requires a ${TIER_NAMES[requiredTier]} plan or higher. ` +
          `Upgrade at /settings/billing.`
      ),
    };
  }

  return { user, error: null };
}

/**
 * Require a resource limit to not be exceeded
 */
export async function requireLimit(
  req: NextRequest,
  resource: LimitedResource
): Promise<{ user: AuthenticatedUserWithOrg | null; error: NextResponse | null }> {
  const { user, error } = await getOrgFromRequest(req);
  if (error) return { user: null, error };
  if (!user) return { user: null, error: unauthorized() };

  const license = user.license;
  if (!license) {
    // No license = COMMUNITY limits
    return checkCommunityLimit(user, resource);
  }

  const usage = license.usage;
  const limits = license.limits;

  const resourceMap: Record<
    LimitedResource,
    { current: number; max: number; name: string }
  > = {
    servers: { current: usage.servers, max: limits.maxServers, name: 'servers' },
    workflows: { current: usage.workflows, max: limits.maxWorkflows, name: 'workflows' },
    workspaces: { current: usage.workspaces, max: limits.maxWorkspaces, name: 'workspaces' },
    members: { current: usage.members, max: limits.maxMembers, name: 'team members' },
  };

  const { current, max, name } = resourceMap[resource];

  // -1 means unlimited
  if (max === -1) {
    return { user, error: null };
  }

  // 0 means feature disabled (workspaces)
  if (max === 0 && resource === 'workspaces') {
    return {
      user: null,
      error: forbidden(
        `Workspaces are not available on the ${TIER_NAMES[license.tier]} plan. ` +
          `Upgrade to Agency to create client workspaces.`
      ),
    };
  }

  if (current >= max) {
    const tierName = TIER_NAMES[license.tier];
    const upgradeMsg =
      license.tier !== 'ENTERPRISE'
        ? ` Upgrade your plan at /settings/billing.`
        : '';
    return {
      user: null,
      error: forbidden(
        `You've reached the ${name} limit (${current}/${max}) for your ${tierName} plan.${upgradeMsg}`
      ),
    };
  }

  return { user, error: null };
}

/**
 * Require organization access (user must belong to an org)
 */
export async function requireOrganization(
  req: NextRequest
): Promise<{ user: AuthenticatedUserWithOrg | null; error: NextResponse | null }> {
  const { user, error } = await getOrgFromRequest(req);
  if (error) return { user: null, error };
  if (!user) return { user: null, error: unauthorized() };

  if (!user.organization) {
    return {
      user: null,
      error: forbidden('You must belong to an organization to access this resource.'),
    };
  }

  return { user, error: null };
}

/**
 * Require organization owner or admin role
 */
export async function requireOrgAdmin(
  req: NextRequest
): Promise<{ user: AuthenticatedUserWithOrg | null; error: NextResponse | null }> {
  const { user, error } = await requireOrganization(req);
  if (error) return { user: null, error };
  if (!user) return { user: null, error: unauthorized() };

  const role = user.organization?.role;
  if (role !== 'OWNER' && role !== 'ADMIN') {
    return {
      user: null,
      error: forbidden('Admin access required for this action.'),
    };
  }

  return { user, error: null };
}

/**
 * Require organization owner role
 */
export async function requireOrgOwner(
  req: NextRequest
): Promise<{ user: AuthenticatedUserWithOrg | null; error: NextResponse | null }> {
  const { user, error } = await requireOrganization(req);
  if (error) return { user: null, error };
  if (!user) return { user: null, error: unauthorized() };

  if (user.organization?.role !== 'OWNER') {
    return {
      user: null,
      error: forbidden('Only the organization owner can perform this action.'),
    };
  }

  return { user, error: null };
}

/**
 * Check COMMUNITY tier limits when no license exists
 */
function checkCommunityLimit(
  user: AuthenticatedUserWithOrg,
  resource: LimitedResource
): { user: AuthenticatedUserWithOrg | null; error: NextResponse | null } {
  const limits = TIER_LIMITS.COMMUNITY;

  if (resource === 'workspaces') {
    return {
      user: null,
      error: forbidden(
        'Workspaces are not available on the Community plan. Upgrade to Agency to create client workspaces.'
      ),
    };
  }

  // For COMMUNITY without license, allow first resource
  return { user, error: null };
}

/**
 * Get required tier for a feature
 */
function getRequiredTierForFeature(feature: FeatureFlag): LicenseTier {
  const featureTierMap: Record<FeatureFlag, LicenseTier> = {
    AI_ANALYSIS: 'PRO',
    WORKSPACES: 'AGENCY',
    WHITE_LABEL: 'AGENCY',
    CUSTOM_BRANDING: 'AGENCY',
    SSO: 'ENTERPRISE',
    AUDIT_LOGS: 'ENTERPRISE',
    PRIORITY_SUPPORT: 'AGENCY',
  };
  return featureTierMap[feature];
}

/**
 * Increment usage counter after successfully creating a resource
 */
export async function incrementUsage(
  organizationId: string,
  resource: LimitedResource
): Promise<void> {
  const fieldMap: Record<LimitedResource, string> = {
    servers: 'currentServers',
    workflows: 'currentWorkflows',
    workspaces: 'currentWorkspaces',
    members: 'currentMembers',
  };

  await prisma.license.updateMany({
    where: { organizationId },
    data: { [fieldMap[resource]]: { increment: 1 } },
  });
}

/**
 * Decrement usage counter after deleting a resource
 */
export async function decrementUsage(
  organizationId: string,
  resource: LimitedResource
): Promise<void> {
  const fieldMap: Record<LimitedResource, string> = {
    servers: 'currentServers',
    workflows: 'currentWorkflows',
    workspaces: 'currentWorkspaces',
    members: 'currentMembers',
  };

  // Use updateMany with a raw decrement to avoid negative values
  const license = await prisma.license.findUnique({
    where: { organizationId },
    select: { [fieldMap[resource]]: true },
  });

  if (license) {
    const currentValue = (license as Record<string, number>)[fieldMap[resource]] || 0;
    await prisma.license.update({
      where: { organizationId },
      data: { [fieldMap[resource]]: Math.max(0, currentValue - 1) },
    });
  }
}

/**
 * Get license info for display
 */
export async function getLicenseInfo(organizationId: string): Promise<LicenseInfo | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { license: true },
  });

  if (!org) return null;

  const license = org.license;
  const tier = license?.tier || 'COMMUNITY';
  const limits = license
    ? {
        maxServers: license.maxServers,
        maxWorkflows: license.maxWorkflows,
        maxWorkspaces: license.maxWorkspaces,
        maxMembers: license.maxMembers,
        aiAnalysisEnabled: license.aiAnalysisEnabled,
        whiteLabelEnabled: license.whiteLabelEnabled,
        monthlyPrice: TIER_LIMITS[tier].monthlyPrice,
        annualPrice: TIER_LIMITS[tier].annualPrice,
      }
    : TIER_LIMITS.COMMUNITY;

  return {
    tier,
    status: license?.status || 'ACTIVE',
    limits,
    usage: {
      servers: license?.currentServers || 0,
      workflows: license?.currentWorkflows || 0,
      workspaces: license?.currentWorkspaces || 0,
      members: license?.currentMembers || 1,
    },
    billing: license?.stripeCustomerId
      ? {
          email: license.billingEmail,
          nextBillingDate: license.validUntil?.toISOString() || null,
          cancelAtPeriodEnd: false, // TODO: Get from Stripe
        }
      : null,
  };
}
