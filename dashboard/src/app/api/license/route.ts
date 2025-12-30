import { NextRequest } from 'next/server';
import { requireOrganization, getLicenseInfo, TIER_LIMITS } from '@/lib/license';
import { success, notFound } from '@/lib/auth-helpers';

// GET /api/license - Get current organization's license info
export async function GET(req: NextRequest) {
  const { user, error } = await requireOrganization(req);
  if (error) return error;

  if (!user?.organization) {
    return notFound('Organization');
  }

  const licenseInfo = await getLicenseInfo(user.organization.id);

  if (!licenseInfo) {
    // Return COMMUNITY defaults if no license
    return success({
      tier: 'COMMUNITY',
      status: 'ACTIVE',
      limits: TIER_LIMITS.COMMUNITY,
      usage: {
        servers: 0,
        workflows: 0,
        workspaces: 0,
        members: 1,
      },
      billing: null,
      features: {
        aiAnalysis: false,
        workspaces: false,
        whiteLabel: false,
      },
    });
  }

  return success({
    ...licenseInfo,
    features: {
      aiAnalysis: licenseInfo.limits.aiAnalysisEnabled,
      workspaces: licenseInfo.limits.maxWorkspaces !== 0,
      whiteLabel: licenseInfo.limits.whiteLabelEnabled,
    },
  });
}
