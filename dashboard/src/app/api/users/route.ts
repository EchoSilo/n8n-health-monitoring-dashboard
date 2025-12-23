import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, success } from '@/lib/auth-helpers';

// GET /api/users - List all users (admin only)
export async function GET(req: NextRequest) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const users = await prisma.user.findMany({
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
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to include provider info
  const transformedUsers = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    providers: u.accounts.map(a => a.provider),
    stats: u._count,
  }));

  return success(transformedUsers);
}
