/**
 * Paddle Billing Client
 * https://developer.paddle.com/api-reference/overview
 */

import crypto from 'crypto';

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;
const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || 'sandbox';

const PADDLE_API_URL =
  PADDLE_ENVIRONMENT === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

// Price IDs for each tier
export const PADDLE_PRICES = {
  PRO: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE,
    annual: process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE,
  },
  AGENCY: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_AGENCY_MONTHLY_PRICE,
    annual: process.env.NEXT_PUBLIC_PADDLE_AGENCY_ANNUAL_PRICE,
  },
} as const;

export interface PaddleCustomer {
  id: string;
  email: string;
  name: string | null;
  custom_data: Record<string, unknown> | null;
}

export interface PaddleSubscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing';
  customer_id: string;
  items: Array<{
    price: {
      id: string;
      product_id: string;
    };
    quantity: number;
  }>;
  current_billing_period: {
    starts_at: string;
    ends_at: string;
  };
  custom_data: Record<string, unknown> | null;
  scheduled_change: {
    action: 'cancel' | 'pause' | 'resume';
    effective_at: string;
  } | null;
}

export interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

/**
 * Check if Paddle is configured
 */
export function isPaddleConfigured(): boolean {
  return !!PADDLE_API_KEY;
}

/**
 * Make authenticated request to Paddle API
 */
async function paddleRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!PADDLE_API_KEY) {
    throw new Error('Paddle not configured');
  }

  const response = await fetch(`${PADDLE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.detail || `Paddle API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Create or get a customer
 */
export async function createOrGetCustomer(params: {
  email: string;
  name?: string;
  organizationId: string;
}): Promise<PaddleCustomer> {
  // First try to find existing customer by email
  const searchResponse = await paddleRequest<{ data: PaddleCustomer[] }>(
    `/customers?email=${encodeURIComponent(params.email)}`
  );

  if (searchResponse.data.length > 0) {
    return searchResponse.data[0];
  }

  // Create new customer
  const response = await paddleRequest<{ data: PaddleCustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      name: params.name,
      custom_data: {
        organizationId: params.organizationId,
      },
    }),
  });

  return response.data;
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId: string): Promise<PaddleCustomer> {
  const response = await paddleRequest<{ data: PaddleCustomer }>(
    `/customers/${customerId}`
  );
  return response.data;
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<PaddleSubscription> {
  const response = await paddleRequest<{ data: PaddleSubscription }>(
    `/subscriptions/${subscriptionId}`
  );
  return response.data;
}

/**
 * Get subscriptions for a customer
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<PaddleSubscription[]> {
  const response = await paddleRequest<{ data: PaddleSubscription[] }>(
    `/subscriptions?customer_id=${customerId}`
  );
  return response.data;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
): Promise<PaddleSubscription> {
  const response = await paddleRequest<{ data: PaddleSubscription }>(
    `/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({
        effective_from: effectiveFrom,
      }),
    }
  );
  return response.data;
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  subscriptionId: string
): Promise<PaddleSubscription> {
  const response = await paddleRequest<{ data: PaddleSubscription }>(
    `/subscriptions/${subscriptionId}/pause`,
    { method: 'POST' }
  );
  return response.data;
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<PaddleSubscription> {
  const response = await paddleRequest<{ data: PaddleSubscription }>(
    `/subscriptions/${subscriptionId}/resume`,
    { method: 'POST' }
  );
  return response.data;
}

/**
 * Update subscription (change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  priceId: string,
  proration: 'prorated_immediately' | 'full_immediately' | 'full_next_billing_period' = 'prorated_immediately'
): Promise<PaddleSubscription> {
  const response = await paddleRequest<{ data: PaddleSubscription }>(
    `/subscriptions/${subscriptionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        proration_billing_mode: proration,
      }),
    }
  );
  return response.data;
}

/**
 * Get customer portal session URL
 */
export async function getPortalSession(
  customerId: string
): Promise<{ url: string }> {
  // Paddle's customer portal is accessed via a URL with customer ID
  // The actual portal is on Paddle's domain
  const portalUrl =
    PADDLE_ENVIRONMENT === 'production'
      ? `https://customer-portal.paddle.com/cpl_${customerId}`
      : `https://sandbox-customer-portal.paddle.com/cpl_${customerId}`;

  return { url: portalUrl };
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('Paddle webhook secret not configured');
    return false;
  }

  try {
    // Paddle uses ts;h1= format for signature
    const parts = signature.split(';');
    const tsValue = parts.find((p) => p.startsWith('ts='))?.slice(3);
    const h1Value = parts.find((p) => p.startsWith('h1='))?.slice(3);

    if (!tsValue || !h1Value) {
      return false;
    }

    // Construct signed payload
    const signedPayload = `${tsValue}:${payload}`;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(h1Value),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Parse webhook event from request body
 */
export function parseWebhookEvent(body: string): PaddleWebhookEvent {
  return JSON.parse(body);
}

/**
 * Map Paddle subscription status to our license status
 */
export function mapPaddleStatus(
  status: PaddleSubscription['status']
): 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
      return 'GRACE_PERIOD';
    case 'paused':
      return 'SUSPENDED';
    case 'canceled':
    default:
      return 'CANCELLED';
  }
}

/**
 * Get tier from price ID
 */
export function getTierFromPriceId(
  priceId: string
): 'PRO' | 'AGENCY' | null {
  if (
    priceId === PADDLE_PRICES.PRO.monthly ||
    priceId === PADDLE_PRICES.PRO.annual
  ) {
    return 'PRO';
  }
  if (
    priceId === PADDLE_PRICES.AGENCY.monthly ||
    priceId === PADDLE_PRICES.AGENCY.annual
  ) {
    return 'AGENCY';
  }
  return null;
}
