import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireOrgOwner } from '@/lib/license';
import { badRequest, success } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { createOrGetCustomer, isPaddleConfigured, PADDLE_PRICES } from '@/lib/paddle';

const checkoutSchema = z.object({
  tier: z.enum(['PRO', 'AGENCY']),
  interval: z.enum(['monthly', 'annual']),
});

/**
 * POST /api/billing/checkout
 * Returns Paddle checkout configuration for client-side checkout
 *
 * With Paddle, checkout happens client-side using Paddle.js.
 * This endpoint returns the necessary configuration (price ID, customer ID, etc.)
 */
export async function POST(req: NextRequest) {
  if (!isPaddleConfigured()) {
    return badRequest('Paddle is not configured. Set PADDLE_API_KEY in environment.');
  }

  // Only org owners can manage billing
  const { user, error } = await requireOrgOwner(req);
  if (error) return error;

  if (!user?.organization) {
    return badRequest('You must belong to an organization to upgrade.');
  }

  try {
    const body = await req.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Invalid request', {
        details: result.error.flatten().fieldErrors.toString(),
      });
    }

    const { tier, interval } = result.data;

    // Get price ID for the selected plan
    const priceId = PADDLE_PRICES[tier]?.[interval];
    if (!priceId) {
      return badRequest(`Price not configured for ${tier} ${interval} plan`);
    }

    // Get user email
    const owner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    });

    if (!owner?.email) {
      return badRequest('User email is required for checkout');
    }

    // Get or create Paddle customer
    let paddleCustomerId: string | null = null;

    // Check if we already have a Paddle customer ID stored
    const license = await prisma.license.findUnique({
      where: { organizationId: user.organization.id },
      select: { paddleCustomerId: true },
    });

    if (license?.paddleCustomerId) {
      paddleCustomerId = license.paddleCustomerId;
    } else {
      // Create or get customer in Paddle
      try {
        const customer = await createOrGetCustomer({
          email: owner.email,
          name: owner.name || undefined,
          organizationId: user.organization.id,
        });
        paddleCustomerId = customer.id;

        // Store customer ID for future use
        if (license) {
          await prisma.license.update({
            where: { organizationId: user.organization.id },
            data: { paddleCustomerId },
          });
        }
      } catch (err) {
        console.error('Failed to create Paddle customer:', err);
        // Continue without customer ID - Paddle.js will create one
      }
    }

    // Return checkout configuration for Paddle.js
    // The frontend will use this to open Paddle Checkout
    return success({
      priceId,
      customerId: paddleCustomerId,
      customerEmail: owner.email,
      customData: {
        organizationId: user.organization.id,
        organizationName: user.organization.name,
        tier,
        interval,
      },
      // Frontend uses these to configure Paddle.js
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'en',
        successUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/billing?success=true`,
      },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return badRequest('Failed to prepare checkout');
  }
}
