/**
 * Keygen License Management Client
 * https://keygen.sh/docs/api/
 */

import type { LicenseTier, LicenseStatus } from '@prisma/client';

const KEYGEN_ACCOUNT_ID = process.env.KEYGEN_ACCOUNT_ID;
const KEYGEN_ADMIN_TOKEN = process.env.KEYGEN_ADMIN_TOKEN;
const KEYGEN_API_URL = 'https://api.keygen.sh/v1';

// Policy IDs map to license tiers
const POLICY_IDS: Record<string, string | undefined> = {
  COMMUNITY: process.env.KEYGEN_POLICY_COMMUNITY_ID,
  PRO: process.env.KEYGEN_POLICY_PRO_ID,
  AGENCY: process.env.KEYGEN_POLICY_AGENCY_ID,
  ENTERPRISE: process.env.KEYGEN_POLICY_ENTERPRISE_ID,
};

export interface KeygenLicense {
  id: string;
  type: 'licenses';
  attributes: {
    key: string;
    name: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'BANNED';
    expiry: string | null;
    metadata: Record<string, unknown>;
    created: string;
    updated: string;
  };
  relationships: {
    policy: { data: { id: string } };
    user: { data: { id: string } | null };
  };
}

export interface KeygenValidationResult {
  valid: boolean;
  code: string;
  detail: string;
  license?: KeygenLicense;
}

export interface KeygenEntitlement {
  id: string;
  attributes: {
    code: string;
    name: string;
    metadata: Record<string, unknown>;
  };
}

/**
 * Check if Keygen is configured
 */
export function isKeygenConfigured(): boolean {
  return !!(KEYGEN_ACCOUNT_ID && KEYGEN_ADMIN_TOKEN);
}

/**
 * Make authenticated request to Keygen API
 */
async function keygenRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!KEYGEN_ACCOUNT_ID || !KEYGEN_ADMIN_TOKEN) {
    throw new Error('Keygen not configured');
  }

  const url = `${KEYGEN_API_URL}/accounts/${KEYGEN_ACCOUNT_ID}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${KEYGEN_ADMIN_TOKEN}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.errors?.[0]?.detail || `Keygen API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Create a new license for an organization
 */
export async function createLicense(params: {
  tier: LicenseTier;
  organizationId: string;
  organizationName: string;
  email: string;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
}): Promise<KeygenLicense> {
  const policyId = POLICY_IDS[params.tier];
  if (!policyId) {
    throw new Error(`No policy configured for tier: ${params.tier}`);
  }

  const response = await keygenRequest<{ data: KeygenLicense }>('/licenses', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'licenses',
        attributes: {
          name: params.organizationName,
          metadata: {
            organizationId: params.organizationId,
            email: params.email,
            paddleCustomerId: params.paddleCustomerId,
            paddleSubscriptionId: params.paddleSubscriptionId,
            tier: params.tier,
          },
        },
        relationships: {
          policy: {
            data: { type: 'policies', id: policyId },
          },
        },
      },
    }),
  });

  return response.data;
}

/**
 * Validate a license key
 */
export async function validateLicenseKey(
  licenseKey: string
): Promise<KeygenValidationResult> {
  if (!KEYGEN_ACCOUNT_ID) {
    return {
      valid: false,
      code: 'NOT_CONFIGURED',
      detail: 'Keygen not configured',
    };
  }

  try {
    const response = await fetch(
      `${KEYGEN_API_URL}/accounts/${KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          meta: { key: licenseKey },
        }),
      }
    );

    const data = await response.json();

    return {
      valid: data.meta?.valid === true,
      code: data.meta?.code || 'UNKNOWN',
      detail: data.meta?.detail || 'Unknown validation result',
      license: data.data,
    };
  } catch (error) {
    console.error('License validation error:', error);
    return {
      valid: false,
      code: 'VALIDATION_ERROR',
      detail: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Get license by ID
 */
export async function getLicense(licenseId: string): Promise<KeygenLicense> {
  const response = await keygenRequest<{ data: KeygenLicense }>(
    `/licenses/${licenseId}`
  );
  return response.data;
}

/**
 * Get license by key
 */
export async function getLicenseByKey(
  licenseKey: string
): Promise<KeygenLicense | null> {
  try {
    const response = await keygenRequest<{ data: KeygenLicense[] }>(
      `/licenses?key=${encodeURIComponent(licenseKey)}`
    );
    return response.data[0] || null;
  } catch {
    return null;
  }
}

/**
 * Update license metadata
 */
export async function updateLicense(
  licenseId: string,
  updates: {
    name?: string;
    expiry?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<KeygenLicense> {
  const response = await keygenRequest<{ data: KeygenLicense }>(
    `/licenses/${licenseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'licenses',
          attributes: updates,
        },
      }),
    }
  );
  return response.data;
}

/**
 * Suspend a license
 */
export async function suspendLicense(licenseId: string): Promise<KeygenLicense> {
  const response = await keygenRequest<{ data: KeygenLicense }>(
    `/licenses/${licenseId}/actions/suspend`,
    { method: 'POST' }
  );
  return response.data;
}

/**
 * Reinstate a suspended license
 */
export async function reinstateLicense(licenseId: string): Promise<KeygenLicense> {
  const response = await keygenRequest<{ data: KeygenLicense }>(
    `/licenses/${licenseId}/actions/reinstate`,
    { method: 'POST' }
  );
  return response.data;
}

/**
 * Revoke/delete a license
 */
export async function revokeLicense(licenseId: string): Promise<void> {
  await keygenRequest(`/licenses/${licenseId}`, { method: 'DELETE' });
}

/**
 * Get entitlements for a license
 */
export async function getLicenseEntitlements(
  licenseId: string
): Promise<KeygenEntitlement[]> {
  const response = await keygenRequest<{ data: KeygenEntitlement[] }>(
    `/licenses/${licenseId}/entitlements`
  );
  return response.data;
}

/**
 * Change license policy (tier upgrade/downgrade)
 */
export async function changeLicensePolicy(
  licenseId: string,
  newTier: LicenseTier
): Promise<KeygenLicense> {
  const policyId = POLICY_IDS[newTier];
  if (!policyId) {
    throw new Error(`No policy configured for tier: ${newTier}`);
  }

  const response = await keygenRequest<{ data: KeygenLicense }>(
    `/licenses/${licenseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'licenses',
          relationships: {
            policy: {
              data: { type: 'policies', id: policyId },
            },
          },
        },
      }),
    }
  );
  return response.data;
}

/**
 * Map Keygen status to our LicenseStatus enum
 */
export function mapKeygenStatus(
  keygenStatus: KeygenLicense['attributes']['status']
): LicenseStatus {
  switch (keygenStatus) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'SUSPENDED':
    case 'BANNED':
      return 'SUSPENDED';
    case 'INACTIVE':
    default:
      return 'CANCELLED';
  }
}

/**
 * Get tier from Keygen license metadata
 */
export function getTierFromLicense(license: KeygenLicense): LicenseTier {
  const tier = license.attributes.metadata?.tier as string | undefined;
  if (tier && ['COMMUNITY', 'PRO', 'AGENCY', 'ENTERPRISE'].includes(tier)) {
    return tier as LicenseTier;
  }
  return 'COMMUNITY';
}
