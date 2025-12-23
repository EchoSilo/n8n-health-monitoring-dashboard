import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const SALT_ROUNDS = 12;

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  inviteCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, inviteCode } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Check if this is the first user
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    // If not the first user, require invite
    if (!isFirstUser) {
      let validInvite = null;

      // Check for invite code
      if (inviteCode) {
        validInvite = await prisma.invite.findFirst({
          where: {
            code: inviteCode.toUpperCase(),
            type: 'CODE',
            status: 'PENDING',
            OR: [
              { maxUses: null },
              { useCount: { lt: prisma.invite.fields.maxUses } },
            ],
            AND: [
              {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } },
                ],
              },
            ],
          },
        });
      }

      // Check for email invite
      if (!validInvite) {
        validInvite = await prisma.invite.findFirst({
          where: {
            email: normalizedEmail,
            type: 'EMAIL',
            status: 'PENDING',
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });
      }

      if (!validInvite) {
        return NextResponse.json(
          {
            error: 'Registration requires an invite',
            message: 'Please request an invite from an administrator or use a valid invite code.',
          },
          { status: 403 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: isFirstUser ? 'ADMIN' : 'MEMBER',
        emailVerified: new Date(), // Auto-verify for now
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Consume invite if used
    if (!isFirstUser && inviteCode) {
      const invite = await prisma.invite.findFirst({
        where: {
          OR: [
            { code: inviteCode.toUpperCase() },
            { email: normalizedEmail },
          ],
          status: 'PENDING',
        },
      });

      if (invite) {
        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            status: invite.type === 'EMAIL' ? 'ACCEPTED' : 'PENDING',
            useCount: { increment: 1 },
            acceptedAt: invite.type === 'EMAIL' ? new Date() : undefined,
          },
        });

        // Apply invite role if different
        if (invite.role !== 'MEMBER') {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: invite.role },
          });
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user,
        isFirstUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
