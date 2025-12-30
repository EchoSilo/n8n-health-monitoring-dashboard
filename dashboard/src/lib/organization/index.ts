/**
 * Organization Module Exports
 */

// Helpers
export {
  generateSlug,
  ensureUniqueSlug,
  hasOrgPermission,
  canManageOrg,
  canEditResources,
  canAccessBilling,
  getUserOrgRole,
  getDefaultOrganization,
  setDefaultOrganization,
  createOrganization,
  addOrgMember,
  removeOrgMember,
  transferOwnership,
} from './helpers';

// Context (client-side only)
export {
  OrganizationProvider,
  useOrganization,
  useFeatureAccess,
  useResourceLimit,
} from './context';
