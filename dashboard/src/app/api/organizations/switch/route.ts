import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, success, badRequest, forbidden } from '@/lib/auth-helpers';

const switchSchema = z.object({
  organizationId: z.string().min(1),
});

// POST /api/organizations/switch - Switch current organization
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const result = switchSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Invalid organization ID');
    }

    const { organizationId } = result.data;

    // Verify user is member of this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user!.id,
        },
      },
    });

    if (!membership) {
      return forbidden('You are not a member of this organization');
    }

    // Update user's default organization
    await prisma.user.update({
      where: { id: user!.id },
      data: { defaultOrgId: organizationId },
    });

    return success({ message: 'Organization switched successfully' });
  } catch (err) {
    console.error('Switch organization error:', err);
    return badRequest('Failed to switch organization');
  }
}
