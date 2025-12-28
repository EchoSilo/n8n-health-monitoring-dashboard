import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, isDemoAccount, forbidden, success, badRequest } from '@/lib/auth-helpers';

// GET /api/users/me - Get current user profile
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const profile = await prisma.user.findUnique({
    where: { id: user!.id },
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
          createdServers: true,
        },
      },
    },
  });

  if (!profile) {
    return badRequest('User not found');
  }

  return success({
    ...profile,
    providers: profile.accounts.map(a => a.provider),
    hasPassword: await hasPasswordSet(user!.id),
    stats: profile._count,
  });
}

async function hasPasswordSet(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  return !!user?.passwordHash;
}

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  image: z.string().url().optional().nullable(),
});

// PATCH /api/users/me - Update current user profile
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  // Block demo account from profile updates
  if (await isDemoAccount(user!.id)) {
    return forbidden('Demo account is read-only. Create an account to make changes.');
  }

  try {
    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors)
            .map(([k, v]) => [k, v?.join(', ') || ''])
        )
      );
    }

    const updated = await prisma.user.update({
      where: { id: user!.id },
      data: result.data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        updatedAt: true,
      },
    });

    return success(updated);
  } catch (err) {
    console.error('Update profile error:', err);
    return badRequest('Failed to update profile');
  }
}
