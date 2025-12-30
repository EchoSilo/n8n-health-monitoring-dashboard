import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, success, created, badRequest } from '@/lib/auth-helpers';
import { createOrganization, ensureUniqueSlug, generateSlug } from '@/lib/organization';
import { generateLicenseKey, TIER_LIMITS } from '@/lib/license';

// GET /api/organizations - List user's organizations
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user!.id },
    include: {
      organization: {
        include: {
          license: {
            select: {
              tier: true,
              status: true,
            },
          },
          _count: {
            select: {
              members: true,
              servers: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Get user's default org
  const userData = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { defaultOrgId: true },
  });

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logoUrl,
    primaryColor: m.organization.primaryColor,
    role: m.role,
    workspaceId: m.workspaceId,
    isDefault: m.organizationId === userData?.defaultOrgId,
    license: m.organization.license
      ? {
          tier: m.organization.license.tier,
          status: m.organization.license.status,
        }
      : { tier: 'COMMUNITY', status: 'ACTIVE' },
    memberCount: m.organization._count.members,
    serverCount: m.organization._count.servers,
    createdAt: m.organization.createdAt,
  }));

  return success({ organizations });
}

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

// POST /api/organizations - Create a new organization
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const result = createOrgSchema.safeParse(body);

    if (!result.success) {
      return badRequest(
        'Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [
            k,
            v?.join(', ') || '',
          ])
        )
      );
    }

    const { name, slug: requestedSlug } = result.data;

    // Generate or validate slug
    const slug = requestedSlug
      ? await ensureUniqueSlug(requestedSlug)
      : await ensureUniqueSlug(generateSlug(name));

    // Create organization with user as owner
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: user!.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Create COMMUNITY license for the organization
    const communityLimits = TIER_LIMITS.COMMUNITY;
    await prisma.license.create({
      data: {
        licenseKey: generateLicenseKey(),
        organizationId: org.id,
        tier: 'COMMUNITY',
        status: 'ACTIVE',
        billingEmail: (await prisma.user.findUnique({ where: { id: user!.id } }))?.email || '',
        maxServers: communityLimits.maxServers,
        maxWorkflows: communityLimits.maxWorkflows,
        maxWorkspaces: communityLimits.maxWorkspaces,
        maxMembers: communityLimits.maxMembers,
        aiAnalysisEnabled: communityLimits.aiAnalysisEnabled,
        whiteLabelEnabled: communityLimits.whiteLabelEnabled,
      },
    });

    // Set as default org if user doesn't have one
    const userData = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { defaultOrgId: true },
    });

    if (!userData?.defaultOrgId) {
      await prisma.user.update({
        where: { id: user!.id },
        data: { defaultOrgId: org.id },
      });
    }

    return created({
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: 'OWNER',
    });
  } catch (err) {
    console.error('Create organization error:', err);
    return badRequest('Failed to create organization');
  }
}
