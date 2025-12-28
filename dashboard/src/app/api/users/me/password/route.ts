import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, isDemoAccount, forbidden, success, badRequest } from '@/lib/auth-helpers';

const SALT_ROUNDS = 12;

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// PATCH /api/users/me/password - Change password
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  // Block demo account from password changes
  if (await isDemoAccount(user!.id)) {
    return forbidden('Demo account is read-only. Create an account to make changes.');
  }

  try {
    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors)
            .map(([k, v]) => [k, v?.join(', ') || ''])
        )
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Get current user with password hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { passwordHash: true },
    });

    // If user has a password set, require current password
    if (dbUser?.passwordHash) {
      if (!currentPassword) {
        return badRequest('Current password is required');
      }

      const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return badRequest('Current password is incorrect');
      }
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user!.id },
      data: { passwordHash },
    });

    return success({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return badRequest('Failed to change password');
  }
}
