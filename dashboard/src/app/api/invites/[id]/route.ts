import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAdmin,
  success,
  notFound,
  badRequest,
} from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/invites/[id] - Get invite details (admin only)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  const invite = await prisma.invite.findUnique({
    where: { id },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!invite) {
    return notFound('Invite');
  }

  return success(invite);
}

// DELETE /api/invites/[id] - Revoke an invite (admin only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  const invite = await prisma.invite.findUnique({
    where: { id },
  });

  if (!invite) {
    return notFound('Invite');
  }

  if (invite.status !== 'PENDING') {
    return badRequest('Only pending invites can be revoked');
  }

  const updated = await prisma.invite.update({
    where: { id },
    data: {
      status: 'REVOKED',
    },
  });

  return success({ message: 'Invite revoked', invite: updated });
}
