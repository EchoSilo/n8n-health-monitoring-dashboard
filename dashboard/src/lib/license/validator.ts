/**
 * License Validator
 *
 * Handles license validation via Keygen.sh API.
 * Includes caching and grace period handling.
 */

import { prisma } from '@/lib/db';
import { TIER_LIMITS } from './tier-limits';
import type { LicenseValidationResult, TierLimits } from './types';
import type { LicenseTier, LicenseStatus } from '@prisma/client';
import {
  validateLicenseKey as keygenValidate,
  isKeygenConfigured,
  getTierFromLicense,
  mapKeygenStatus,
} from '@/lib/keygen';

// Grace period in days
const GRACE_PERIOD_DAYS = 30;

// Validation interval in hours
const VALIDATION_INTERVAL_HOURS = 24;

/**
 * Validate license with Keygen
 */
export async function validateLicense(
  licenseKey: string
): Promise<LicenseValidationResult> {
  // If Keygen is not configured, fall back to development mode
  if (!isKeygenConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[License] Keygen not configured, running in development mode');
      return createDevelopmentLicense();
    }
    return createInvalidResult('License server not configured');
  }

  try {
    const result = await keygenValidate(licenseKey);

    if (!result.valid || !result.license) {
      return createInvalidResult(result.detail || 'License validation failed');
    }

    const license = result.license;
    const tier = getTierFromLicense(license);
    const status = mapKeygenStatus(license.attributes.status);
    const limits = TIER_LIMITS[tier];

    return {
      valid: true,
      tier,
      status,
      limits,
      expiresAt: license.attributes.expiry,
      gracePeriodEndsAt: null,
    };
  } catch (error) {
    // Network error - check if we're in grace period
    console.error('[License] Keygen validation failed:', error);
    return createInvalidResult(
      error instanceof Error ? error.message : 'Network error'
    );
  }
}

/**
 * Validate and update license in database
 */
export async function validateAndUpdateLicense(
  organizationId: string
): Promise<{ valid: boolean; message?: string }> {
  const license = await prisma.license.findUnique({
    where: { organizationId },
  });

  if (!license) {
    return { valid: false, message: 'No license found' };
  }

  // COMMUNITY tier doesn't need validation
  if (license.tier === 'COMMUNITY') {
    return { valid: true };
  }

  // Check if validation is needed
  if (!shouldValidate(license.lastValidatedAt)) {
    return { valid: true };
  }

  // Validate with Keygen
  const result = await validateLicense(license.licenseKey);

  if (result.valid) {
    // Update license with new info
    await prisma.license.update({
      where: { organizationId },
      data: {
        tier: result.tier as LicenseTier,
        status: result.status as LicenseStatus,
        maxServers: result.limits.maxServers,
        maxWorkflows: result.limits.maxWorkflows,
        maxWorkspaces: result.limits.maxWorkspaces,
        maxMembers: result.limits.maxMembers,
        aiAnalysisEnabled: result.limits.aiAnalysisEnabled,
        whiteLabelEnabled: result.limits.whiteLabelEnabled,
        validUntil: result.expiresAt ? new Date(result.expiresAt) : null,
        lastValidatedAt: new Date(),
      },
    });

    return { valid: true };
  }

  // Validation failed - check grace period
  const gracePeriodEnd = getGracePeriodEnd(license.lastValidatedAt);
  const now = new Date();

  if (gracePeriodEnd && now < gracePeriodEnd) {
    // Still in grace period
    await prisma.license.update({
      where: { organizationId },
      data: { status: 'GRACE_PERIOD' },
    });

    const daysLeft = Math.ceil(
      (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      valid: true,
      message: `License validation failed. Grace period: ${daysLeft} days remaining.`,
    };
  }

  // Grace period expired - downgrade to COMMUNITY
  await prisma.license.update({
    where: { organizationId },
    data: {
      tier: 'COMMUNITY',
      status: 'EXPIRED',
      maxServers: TIER_LIMITS.COMMUNITY.maxServers,
      maxWorkflows: TIER_LIMITS.COMMUNITY.maxWorkflows,
      maxWorkspaces: TIER_LIMITS.COMMUNITY.maxWorkspaces,
      maxMembers: TIER_LIMITS.COMMUNITY.maxMembers,
      aiAnalysisEnabled: TIER_LIMITS.COMMUNITY.aiAnalysisEnabled,
      whiteLabelEnabled: TIER_LIMITS.COMMUNITY.whiteLabelEnabled,
    },
  });

  return {
    valid: false,
    message: 'License expired. Your account has been downgraded to Community tier.',
  };
}

/**
 * Get cached license from database
 */
export async function getCachedLicense(
  organizationId: string
): Promise<LicenseValidationResult | null> {
  const license = await prisma.license.findUnique({
    where: { organizationId },
  });

  if (!license) {
    return null;
  }

  const tierLimits = TIER_LIMITS[license.tier];

  return {
    valid: license.status === 'ACTIVE' || license.status === 'GRACE_PERIOD',
    tier: license.tier,
    status: license.status,
    limits: {
      maxServers: license.maxServers,
      maxWorkflows: license.maxWorkflows,
      maxWorkspaces: license.maxWorkspaces,
      maxMembers: license.maxMembers,
      aiAnalysisEnabled: license.aiAnalysisEnabled,
      whiteLabelEnabled: license.whiteLabelEnabled,
      monthlyPrice: tierLimits.monthlyPrice,
      annualPrice: tierLimits.annualPrice,
    },
    expiresAt: license.validUntil?.toISOString() || null,
    gracePeriodEndsAt: license.status === 'GRACE_PERIOD'
      ? getGracePeriodEnd(license.lastValidatedAt)?.toISOString() || null
      : null,
  };
}

/**
 * Check if license is in grace period
 */
export function isInGracePeriod(lastValidatedAt: Date | null): boolean {
  if (!lastValidatedAt) return false;
  const gracePeriodEnd = getGracePeriodEnd(lastValidatedAt);
  return gracePeriodEnd ? new Date() < gracePeriodEnd : false;
}

/**
 * Get grace period end date
 */
function getGracePeriodEnd(lastValidatedAt: Date | null): Date | null {
  if (!lastValidatedAt) return null;
  const end = new Date(lastValidatedAt);
  end.setDate(end.getDate() + GRACE_PERIOD_DAYS);
  return end;
}

/**
 * Check if validation is needed based on last validation time
 */
function shouldValidate(lastValidatedAt: Date | null): boolean {
  if (!lastValidatedAt) return true;
  const hoursSinceValidation =
    (Date.now() - lastValidatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceValidation >= VALIDATION_INTERVAL_HOURS;
}

/**
 * Create an invalid license result
 */
function createInvalidResult(message: string): LicenseValidationResult {
  return {
    valid: false,
    tier: 'COMMUNITY',
    status: 'EXPIRED',
    limits: TIER_LIMITS.COMMUNITY,
    expiresAt: null,
    gracePeriodEndsAt: null,
    message,
  };
}

/**
 * Create a development license (unlimited access for dev)
 */
function createDevelopmentLicense(): LicenseValidationResult {
  return {
    valid: true,
    tier: 'ENTERPRISE',
    status: 'ACTIVE',
    limits: TIER_LIMITS.ENTERPRISE,
    expiresAt: null,
    gracePeriodEndsAt: null,
    message: 'Development mode - all features enabled',
  };
}

/**
 * Generate a new license key (fallback when Keygen not used)
 * Format: N8H-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments: string[] = [];

  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }

  return `N8H-${segments.join('-')}`;
}

/**
 * Validate license key format (for fallback keys)
 */
export function isValidLicenseKeyFormat(key: string): boolean {
  // Accept both our format and Keygen format
  return /^N8H-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key) ||
    /^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(key);
}
