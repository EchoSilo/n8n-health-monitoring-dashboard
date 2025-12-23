import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  requireAdmin,
  success,
  notFound,
  badRequest,
} from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user by ID (admin only)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      accounts: {
        select: {
          provider: true,
        },
      },
      _count: {
        select: {
          apiKeys: true,
          invitesSent: true,
          createdServers: true,
          resolvedErrors: true,
        },
      },
    },
  });

  if (!targetUser) {
    return notFound('User');
  }

  return success({
    ...targetUser,
    providers: targetUser.accounts.map(a => a.provider),
    stats: targetUser._count,
  });
}

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  name: z.string().min(2).max(100).optional(),
});

// PATCH /api/users/[id] - Update user (admin only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  // Prevent self-demotion
  if (id === user!.id) {
    const body = await req.json();
    if (body.role && body.role !== 'ADMIN') {
      return badRequest('You cannot change your own role');
    }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    return notFound('User');
  }

  try {
    const body = await req.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors)
            .map(([k, v]) => [k, v?.join(', ') || ''])
        )
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: result.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return success(updated);
  } catch (err) {
    console.error('Update user error:', err);
    return badRequest('Failed to update user');
  }
}

// DELETE /api/users/[id] - Remove user (admin only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  // Prevent self-deletion
  if (id === user!.id) {
    return badRequest('You cannot delete your own account');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    return notFound('User');
  }

  // Check if this is the last admin
  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount <= 1) {
      return badRequest('Cannot delete the last admin user');
    }
  }

  await prisma.user.delete({
    where: { id },
  });

  return success({ message: 'User deleted successfully' });
}
