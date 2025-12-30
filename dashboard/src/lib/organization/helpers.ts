/**
 * Organization Helpers
 *
 * Utility functions for working with organizations.
 */

import { prisma } from '@/lib/db';
import type { OrganizationRole } from '@prisma/client';

/**
 * Generate a URL-safe slug from organization name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Ensure slug is unique by appending a number if needed
 */
export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Check if user has permission for an action within an organization
 */
export function hasOrgPermission(
  userRole: OrganizationRole,
  requiredRole: OrganizationRole
): boolean {
  const hierarchy: Record<OrganizationRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Check if user can manage organization (OWNER or ADMIN)
 */
export function canManageOrg(role: OrganizationRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if user can edit resources (not VIEWER)
 */
export function canEditResources(role: OrganizationRole): boolean {
  return role !== 'VIEWER';
}

/**
 * Check if user can access billing (OWNER only)
 */
export function canAccessBilling(role: OrganizationRole): boolean {
  return role === 'OWNER';
}

/**
 * Get user's role in an organization
 */
export async function getUserOrgRole(
  userId: string,
  organizationId: string
): Promise<OrganizationRole | null> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { role: true },
  });
  return member?.role || null;
}

/**
 * Get user's default organization
 */
export async function getDefaultOrganization(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      defaultOrgId: true,
      organizations: {
        include: {
          organization: {
            include: {
              license: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!user) return null;

  // Find default org or first org
  let member = user.organizations.find(
    (m) => m.organizationId === user.defaultOrgId
  );
  if (!member && user.organizations.length > 0) {
    member = user.organizations[0];
  }

  return member
    ? {
        organization: member.organization,
        role: member.role,
        workspaceId: member.workspaceId,
      }
    : null;
}

/**
 * Set user's default organization
 */
export async function setDefaultOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Verify user is member of org
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  if (!member) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { defaultOrgId: organizationId },
  });

  return true;
}

/**
 * Create a new organization with owner
 */
export async function createOrganization(
  name: string,
  ownerId: string,
  options?: {
    slug?: string;
    logoUrl?: string;
    primaryColor?: string;
  }
) {
  const slug = options?.slug
    ? await ensureUniqueSlug(options.slug)
    : await ensureUniqueSlug(generateSlug(name));

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      logoUrl: options?.logoUrl,
      primaryColor: options?.primaryColor,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: true,
    },
  });

  // Set as default org for user if they don't have one
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { defaultOrgId: true },
  });

  if (!user?.defaultOrgId) {
    await prisma.user.update({
      where: { id: ownerId },
      data: { defaultOrgId: org.id },
    });
  }

  return org;
}

/**
 * Add a member to an organization
 */
export async function addOrgMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole = 'MEMBER',
  workspaceId?: string
) {
  return prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role,
      workspaceId,
    },
  });
}

/**
 * Remove a member from an organization
 */
export async function removeOrgMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    select: { role: true },
  });

  // Can't remove the owner
  if (member?.role === 'OWNER') {
    return false;
  }

  await prisma.organizationMember.delete({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  // If this was user's default org, clear it
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultOrgId: true },
  });

  if (user?.defaultOrgId === organizationId) {
    // Find another org to set as default
    const anotherOrg = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { defaultOrgId: anotherOrg?.organizationId || null },
    });
  }

  return true;
}

/**
 * Transfer organization ownership
 */
export async function transferOwnership(
  organizationId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<boolean> {
  // Verify current owner
  const currentOwner = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: currentOwnerId },
    },
    select: { role: true },
  });

  if (currentOwner?.role !== 'OWNER') {
    return false;
  }

  // Verify new owner is member
  const newOwner = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: newOwnerId },
    },
  });

  if (!newOwner) {
    return false;
  }

  // Transfer ownership in a transaction
  await prisma.$transaction([
    prisma.organizationMember.update({
      where: {
        organizationId_userId: { organizationId, userId: currentOwnerId },
      },
      data: { role: 'ADMIN' },
    }),
    prisma.organizationMember.update({
      where: {
        organizationId_userId: { organizationId, userId: newOwnerId },
      },
      data: { role: 'OWNER' },
    }),
  ]);

  return true;
}
