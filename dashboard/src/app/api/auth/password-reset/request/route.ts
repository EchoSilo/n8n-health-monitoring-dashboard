import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Token expires in 1 hour
const TOKEN_EXPIRY_HOURS = 1;

// POST /api/auth/password-reset/request - Request password reset
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = requestResetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    // But only create token if user exists and has password auth
    if (user && user.passwordHash) {
      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      });

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');

      // Create new token
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token,
          expiresAt: new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
        },
      });

      // TODO: Send email with reset link
      // For now, log the link (in production, this would send an email)
      const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
      console.log(`Password reset link for ${normalizedEmail}: ${resetLink}`);

      // In production, you would send an email here:
      // await sendPasswordResetEmail(normalizedEmail, resetLink);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
