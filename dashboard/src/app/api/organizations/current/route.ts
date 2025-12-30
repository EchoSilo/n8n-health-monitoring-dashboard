import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, success, notFound } from '@/lib/auth-helpers';
import { getLicenseInfo, TIER_LIMITS } from '@/lib/license';

// GET /api/organizations/current - Get current organization with license info
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  // Get user with organizations
  const userData = await prisma.user.findUnique({
    where: { id: user!.id },
    select: {
      defaultOrgId: true,
      organizations: {
        include: {
          organization: {
            include: {
              license: true,
              workspaces: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!userData || userData.organizations.length === 0) {
    return notFound('Organization');
  }

  // Find current org (default or first)
  let currentMembership = userData.organizations.find(
    (m) => m.organizationId === userData.defaultOrgId
  );
  if (!currentMembership) {
    currentMembership = userData.organizations[0];
  }

  const org = currentMembership.organization;
  const license = org.license;

  // Build license info
  const licenseInfo = license
    ? {
        tier: license.tier,
        status: license.status,
        limits: {
          maxServers: license.maxServers,
          maxWorkflows: license.maxWorkflows,
          maxWorkspaces: license.maxWorkspaces,
          maxMembers: license.maxMembers,
          aiAnalysisEnabled: license.aiAnalysisEnabled,
          whiteLabelEnabled: license.whiteLabelEnabled,
          monthlyPrice: TIER_LIMITS[license.tier].monthlyPrice,
          annualPrice: TIER_LIMITS[license.tier].annualPrice,
        },
        usage: {
          servers: license.currentServers,
          workflows: license.currentWorkflows,
          workspaces: license.currentWorkspaces,
          members: license.currentMembers,
        },
        billing: license.stripeCustomerId
          ? {
              email: license.billingEmail,
              nextBillingDate: license.validUntil?.toISOString() || null,
            }
          : null,
      }
    : {
        tier: 'COMMUNITY' as const,
        status: 'ACTIVE' as const,
        limits: TIER_LIMITS.COMMUNITY,
        usage: { servers: 0, workflows: 0, workspaces: 0, members: 1 },
        billing: null,
      };

  // Build organization list for switcher
  const organizations = userData.organizations.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logoUrl,
    primaryColor: m.organization.primaryColor,
    role: m.role,
    workspaceId: m.workspaceId,
  }));

  return success({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
      role: currentMembership.role,
      workspaceId: currentMembership.workspaceId,
    },
    workspace: currentMembership.workspace,
    workspaces: org.workspaces,
    license: licenseInfo,
    organizations,
  });
}
