import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { badRequest, success } from '@/lib/auth-helpers';

const acceptInviteSchema = z.object({
  token: z.string().optional(),
  code: z.string().optional(),
}).refine(data => data.token || data.code, {
  message: 'Either token or code is required',
});

// POST /api/invites/accept - Validate and get invite details (public endpoint)
// This is used by the registration form to verify invite before registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = acceptInviteSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Token or code is required');
    }

    const { token, code } = result.data;

    let invite;

    if (token) {
      invite = await prisma.invite.findUnique({
        where: { token },
        include: {
          invitedBy: {
            select: { name: true },
          },
        },
      });
    } else if (code) {
      invite = await prisma.invite.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          invitedBy: {
            select: { name: true },
          },
        },
      });
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite', valid: false },
        { status: 404 }
      );
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      // Update status if not already
      if (invite.status === 'PENDING') {
        await prisma.invite.update({
          where: { id: invite.id },
          data: { status: 'EXPIRED' },
        });
      }
      return NextResponse.json(
        { error: 'Invite has expired', valid: false },
        { status: 410 }
      );
    }

    // Check if revoked
    if (invite.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Invite has been revoked', valid: false },
        { status: 410 }
      );
    }

    // Check if already used (for EMAIL type)
    if (invite.type === 'EMAIL' && invite.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Invite has already been used', valid: false },
        { status: 410 }
      );
    }

    // Check max uses for CODE type
    if (invite.type === 'CODE' && invite.maxUses && invite.useCount >= invite.maxUses) {
      return NextResponse.json(
        { error: 'Invite has reached maximum uses', valid: false },
        { status: 410 }
      );
    }

    // Invite is valid
    return success({
      valid: true,
      type: invite.type,
      role: invite.role,
      email: invite.email, // Only set for EMAIL type
      invitedBy: invite.invitedBy?.name || 'An administrator',
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    console.error('Accept invite error:', err);
    return badRequest('Failed to validate invite');
  }
}
