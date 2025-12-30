import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, success, badRequest, forbidden } from '@/lib/auth-helpers';

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().nullable(),
});

// POST /api/organizations/switch-workspace - Switch workspace within current org
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const result = switchWorkspaceSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Invalid workspace ID');
    }

    const { workspaceId } = result.data;

    // Get user's current organization
    const userData = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { defaultOrgId: true },
    });

    if (!userData?.defaultOrgId) {
      return badRequest('No organization selected');
    }

    // Get user's membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: userData.defaultOrgId,
          userId: user!.id,
        },
      },
    });

    if (!membership) {
      return forbidden('You are not a member of this organization');
    }

    // If user is restricted to a specific workspace, they can't switch
    if (membership.workspaceId && workspaceId !== membership.workspaceId) {
      return forbidden('You are restricted to your assigned workspace');
    }

    // If clearing workspace (viewing all), only OWNER/ADMIN can do this
    if (workspaceId === null && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return forbidden('Only admins can view all workspaces');
    }

    // Verify workspace exists and belongs to org
    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      });

      if (!workspace || workspace.organizationId !== userData.defaultOrgId) {
        return badRequest('Workspace not found');
      }
    }

    // Note: We don't persist workspace selection - it's a session-level preference
    // The frontend will track this in state/cookie

    return success({
      message: workspaceId ? 'Workspace switched' : 'Viewing all workspaces',
      workspaceId,
    });
  } catch (err) {
    console.error('Switch workspace error:', err);
    return badRequest('Failed to switch workspace');
  }
}
