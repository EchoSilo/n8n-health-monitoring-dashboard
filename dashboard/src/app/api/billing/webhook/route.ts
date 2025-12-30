import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TIER_LIMITS, generateLicenseKey } from '@/lib/license';
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  getTierFromPriceId,
  mapPaddleStatus,
  type PaddleSubscription,
} from '@/lib/paddle';
import {
  createLicense,
  suspendLicense,
  reinstateLicense,
  revokeLicense,
  changeLicensePolicy,
  isKeygenConfigured,
} from '@/lib/keygen';
import type { LicenseTier } from '@prisma/client';

// Paddle webhook events we handle
const RELEVANT_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.paused',
  'subscription.resumed',
  'subscription.past_due',
  'subscription.activated',
  'transaction.completed',
]);

/**
 * POST /api/billing/webhook
 * Handle Paddle webhook events and sync with Keygen licenses
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('paddle-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid Paddle webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse event
    const event = parseWebhookEvent(body);

    // Skip non-relevant events
    if (!RELEVANT_EVENTS.has(event.event_type)) {
      return NextResponse.json({ received: true });
    }

    console.log(`Processing Paddle event: ${event.event_type}`);

    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.activated':
        await handleSubscriptionCreated(event.data as unknown as PaddleSubscription);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data as unknown as PaddleSubscription);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data as unknown as PaddleSubscription);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(event.data as unknown as PaddleSubscription);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(event.data as unknown as PaddleSubscription);
        break;

      case 'subscription.past_due':
        await handleSubscriptionPastDue(event.data as unknown as PaddleSubscription);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle new subscription - create license
 */
async function handleSubscriptionCreated(subscription: PaddleSubscription) {
  const customData = subscription.custom_data as {
    organizationId?: string;
    tier?: string;
  } | null;

  const organizationId = customData?.organizationId;
  if (!organizationId) {
    console.error('Missing organizationId in subscription custom_data');
    return;
  }

  // Determine tier from price ID or custom data
  const priceId = subscription.items[0]?.price.id;
  const tier = (customData?.tier || getTierFromPriceId(priceId || '')) as LicenseTier;

  if (!tier || tier === 'COMMUNITY') {
    console.error('Invalid tier for paid subscription');
    return;
  }

  const limits = TIER_LIMITS[tier];
  const validUntil = new Date(subscription.current_billing_period.ends_at);

  // Check if license already exists
  const existingLicense = await prisma.license.findUnique({
    where: { organizationId },
  });

  // Get org info for Keygen
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        where: { role: 'OWNER' },
        include: { user: true },
        take: 1,
      },
    },
  });

  if (!org) {
    console.error('Organization not found:', organizationId);
    return;
  }

  const ownerEmail = org.members[0]?.user.email || 'unknown@example.com';

  // Create license in Keygen (if configured)
  let keygenLicenseId: string | undefined;
  let keygenLicenseKey: string | undefined;

  if (isKeygenConfigured()) {
    try {
      const keygenLicense = await createLicense({
        tier,
        organizationId,
        organizationName: org.name,
        email: ownerEmail,
        paddleCustomerId: subscription.customer_id,
        paddleSubscriptionId: subscription.id,
      });
      keygenLicenseId = keygenLicense.id;
      keygenLicenseKey = keygenLicense.attributes.key;
    } catch (err) {
      console.error('Failed to create Keygen license:', err);
      // Continue with local license only
    }
  }

  if (existingLicense) {
    // Upgrade existing license
    await prisma.license.update({
      where: { organizationId },
      data: {
        tier,
        status: 'ACTIVE',
        licenseKey: keygenLicenseKey || existingLicense.licenseKey,
        keygenLicenseId,
        paddleCustomerId: subscription.customer_id,
        paddleSubscriptionId: subscription.id,
        maxServers: limits.maxServers,
        maxWorkflows: limits.maxWorkflows,
        maxWorkspaces: limits.maxWorkspaces,
        maxMembers: limits.maxMembers,
        aiAnalysisEnabled: limits.aiAnalysisEnabled,
        whiteLabelEnabled: limits.whiteLabelEnabled,
        validUntil,
        lastValidatedAt: new Date(),
      },
    });
  } else {
    // Create new license
    await prisma.license.create({
      data: {
        licenseKey: keygenLicenseKey || generateLicenseKey(),
        keygenLicenseId,
        tier,
        status: 'ACTIVE',
        organizationId,
        paddleCustomerId: subscription.customer_id,
        paddleSubscriptionId: subscription.id,
        billingEmail: ownerEmail,
        maxServers: limits.maxServers,
        maxWorkflows: limits.maxWorkflows,
        maxWorkspaces: limits.maxWorkspaces,
        maxMembers: limits.maxMembers,
        aiAnalysisEnabled: limits.aiAnalysisEnabled,
        whiteLabelEnabled: limits.whiteLabelEnabled,
        validUntil,
        lastValidatedAt: new Date(),
      },
    });
  }

  console.log(`License created/upgraded for org ${organizationId} to ${tier}`);
}

/**
 * Handle subscription update (plan change)
 */
async function handleSubscriptionUpdated(subscription: PaddleSubscription) {
  const license = await prisma.license.findFirst({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (!license) {
    console.error('License not found for subscription:', subscription.id);
    return;
  }

  // Determine new tier from price ID
  const priceId = subscription.items[0]?.price.id;
  const newTier = getTierFromPriceId(priceId || '');

  if (newTier && newTier !== license.tier) {
    const limits = TIER_LIMITS[newTier];

    // Update Keygen license policy if configured
    if (isKeygenConfigured() && license.keygenLicenseId) {
      try {
        await changeLicensePolicy(license.keygenLicenseId, newTier);
      } catch (err) {
        console.error('Failed to update Keygen license policy:', err);
      }
    }

    // Update local license
    await prisma.license.update({
      where: { id: license.id },
      data: {
        tier: newTier,
        status: mapPaddleStatus(subscription.status),
        maxServers: limits.maxServers,
        maxWorkflows: limits.maxWorkflows,
        maxWorkspaces: limits.maxWorkspaces,
        maxMembers: limits.maxMembers,
        aiAnalysisEnabled: limits.aiAnalysisEnabled,
        whiteLabelEnabled: limits.whiteLabelEnabled,
        validUntil: new Date(subscription.current_billing_period.ends_at),
        lastValidatedAt: new Date(),
      },
    });

    console.log(`License updated for subscription ${subscription.id}: ${newTier}`);
  } else {
    // Just update status and validity
    await prisma.license.update({
      where: { id: license.id },
      data: {
        status: mapPaddleStatus(subscription.status),
        validUntil: new Date(subscription.current_billing_period.ends_at),
        lastValidatedAt: new Date(),
      },
    });
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription: PaddleSubscription) {
  const license = await prisma.license.findFirst({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (!license) {
    console.error('License not found for subscription:', subscription.id);
    return;
  }

  // Revoke Keygen license if configured
  if (isKeygenConfigured() && license.keygenLicenseId) {
    try {
      await revokeLicense(license.keygenLicenseId);
    } catch (err) {
      console.error('Failed to revoke Keygen license:', err);
    }
  }

  // Downgrade to COMMUNITY
  const communityLimits = TIER_LIMITS.COMMUNITY;
  await prisma.license.update({
    where: { id: license.id },
    data: {
      tier: 'COMMUNITY',
      status: 'CANCELLED',
      keygenLicenseId: null,
      paddleSubscriptionId: null,
      maxServers: communityLimits.maxServers,
      maxWorkflows: communityLimits.maxWorkflows,
      maxWorkspaces: communityLimits.maxWorkspaces,
      maxMembers: communityLimits.maxMembers,
      aiAnalysisEnabled: communityLimits.aiAnalysisEnabled,
      whiteLabelEnabled: communityLimits.whiteLabelEnabled,
    },
  });

  console.log(`Subscription cancelled, downgraded to COMMUNITY`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription: PaddleSubscription) {
  const license = await prisma.license.findFirst({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (!license) return;

  // Suspend Keygen license if configured
  if (isKeygenConfigured() && license.keygenLicenseId) {
    try {
      await suspendLicense(license.keygenLicenseId);
    } catch (err) {
      console.error('Failed to suspend Keygen license:', err);
    }
  }

  await prisma.license.update({
    where: { id: license.id },
    data: { status: 'SUSPENDED' },
  });

  console.log(`Subscription paused for license ${license.id}`);
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(subscription: PaddleSubscription) {
  const license = await prisma.license.findFirst({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (!license) return;

  // Reinstate Keygen license if configured
  if (isKeygenConfigured() && license.keygenLicenseId) {
    try {
      await reinstateLicense(license.keygenLicenseId);
    } catch (err) {
      console.error('Failed to reinstate Keygen license:', err);
    }
  }

  await prisma.license.update({
    where: { id: license.id },
    data: {
      status: 'ACTIVE',
      lastValidatedAt: new Date(),
    },
  });

  console.log(`Subscription resumed for license ${license.id}`);
}

/**
 * Handle subscription past due (payment failed)
 */
async function handleSubscriptionPastDue(subscription: PaddleSubscription) {
  const license = await prisma.license.findFirst({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (!license) return;

  await prisma.license.update({
    where: { id: license.id },
    data: { status: 'GRACE_PERIOD' },
  });

  console.log(`Payment past due for license ${license.id}, entering grace period`);
}
