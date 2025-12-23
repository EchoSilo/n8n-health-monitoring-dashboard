import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  requireAdmin,
  success,
  created,
  badRequest,
} from '@/lib/auth-helpers';
import crypto from 'crypto';

// GET /api/invites - List all invites (admin only)
export async function GET(req: NextRequest) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  const invites = await prisma.invite.findMany({
    where: {
      ...(status && { status: status as 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' }),
      ...(type && { type: type as 'EMAIL' | 'CODE' }),
    },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return success(invites);
}

// Schema for creating invites
const createEmailInviteSchema = z.object({
  type: z.literal('EMAIL'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  expiresInDays: z.number().min(1).max(30).optional(),
});

const createCodeInviteSchema = z.object({
  type: z.literal('CODE'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  maxUses: z.number().min(1).max(100).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
});

const createInviteSchema = z.discriminatedUnion('type', [
  createEmailInviteSchema,
  createCodeInviteSchema,
]);

// Generate a readable invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let code = 'N8H-';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

// POST /api/invites - Create a new invite (admin only)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const result = createInviteSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors)
            .map(([k, v]) => [k, v?.join(', ') || ''])
        )
      );
    }

    const data = result.data;

    if (data.type === 'EMAIL') {
      // Check if invite already exists for this email
      const existingInvite = await prisma.invite.findFirst({
        where: {
          email: data.email.toLowerCase(),
          status: 'PENDING',
        },
      });

      if (existingInvite) {
        return badRequest('An invite already exists for this email');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        return badRequest('A user with this email already exists');
      }

      const invite = await prisma.invite.create({
        data: {
          type: 'EMAIL',
          email: data.email.toLowerCase(),
          role: data.role,
          invitedById: user!.id,
          expiresAt: data.expiresInDays
            ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
            : null,
        },
        include: {
          invitedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return created({
        ...invite,
        inviteLink: `${process.env.NEXTAUTH_URL}/auth/register?token=${invite.token}`,
      });
    } else {
      // CODE type
      let code = generateInviteCode();

      // Ensure unique code
      let attempts = 0;
      while (attempts < 10) {
        const existing = await prisma.invite.findUnique({ where: { code } });
        if (!existing) break;
        code = generateInviteCode();
        attempts++;
      }

      const invite = await prisma.invite.create({
        data: {
          type: 'CODE',
          code,
          role: data.role,
          maxUses: data.maxUses || null,
          invitedById: user!.id,
          expiresAt: data.expiresInDays
            ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
            : null,
        },
        include: {
          invitedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return created({
        ...invite,
        inviteLink: `${process.env.NEXTAUTH_URL}/auth/register?code=${invite.code}`,
      });
    }
  } catch (err) {
    console.error('Create invite error:', err);
    return badRequest('Failed to create invite');
  }
}
