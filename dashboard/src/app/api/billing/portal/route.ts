import { NextRequest } from 'next/server';
import { requireOrgOwner } from '@/lib/license';
import { badRequest, success } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { getPortalSession, isPaddleConfigured } from '@/lib/paddle';

/**
 * POST /api/billing/portal
 * Returns URL to Paddle customer portal for subscription management
 */
export async function POST(req: NextRequest) {
  if (!isPaddleConfigured()) {
    return badRequest('Paddle is not configured. Set PADDLE_API_KEY in environment.');
  }

  // Only org owners can manage billing
  const { user, error } = await requireOrgOwner(req);
  if (error) return error;

  if (!user?.organization) {
    return badRequest('You must belong to an organization.');
  }

  try {
    // Get license with Paddle customer ID
    const license = await prisma.license.findUnique({
      where: { organizationId: user.organization.id },
      select: { paddleCustomerId: true },
    });

    if (!license?.paddleCustomerId) {
      return badRequest('No billing account found. Please subscribe to a plan first.');
    }

    // Get portal URL
    const portal = await getPortalSession(license.paddleCustomerId);

    return success({
      url: portal.url,
    });
  } catch (err) {
    console.error('Portal error:', err);
    return badRequest('Failed to get portal URL');
  }
}
