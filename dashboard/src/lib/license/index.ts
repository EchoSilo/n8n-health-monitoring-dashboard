/**
 * License Module Exports
 */

// Types
export * from './types';

// Tier limits and configuration
export {
  TIER_LIMITS,
  TIER_NAMES,
  TIER_DESCRIPTIONS,
  TIER_FEATURES,
  TIER_HIERARCHY,
  FEATURE_TIER_MAP,
  hasFeatureAccess,
  getTierLimits,
  checkLimit,
  getNextTier,
  getRequiredTier,
  formatPrice,
  type LicenseTierKey,
} from './tier-limits';

// Guards for API routes
export {
  getOrgFromRequest,
  requireFeature,
  requireLimit,
  requireOrganization,
  requireOrgAdmin,
  requireOrgOwner,
  incrementUsage,
  decrementUsage,
  getLicenseInfo,
  type AuthenticatedUserWithOrg,
} from './guards';

// License validation
export {
  validateLicense,
  validateAndUpdateLicense,
  getCachedLicense,
  isInGracePeriod,
  generateLicenseKey,
  isValidLicenseKeyFormat,
} from './validator';
