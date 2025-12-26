import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, success, notFound, badRequest, forbidden } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to parse JSON scopes from database (SQLite stores arrays as JSON strings)
function parseScopes(scopesJson: string): string[] {
  try {
    const parsed = JSON.parse(scopesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// GET /api/keys/[id] - Get API key details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      userId: true,
      scopes: true,
      lastUsedAt: true,
      usageCount: true,
      expiresAt: true,
      isActive: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  if (!apiKey) {
    return notFound('API key');
  }

  // Users can only see their own keys
  if (apiKey.userId !== user!.id && user!.role !== 'ADMIN') {
    return forbidden('You can only view your own API keys');
  }

  return success({
    ...apiKey,
    scopes: parseScopes(apiKey.scopes), // Parse JSON for response
  });
}

// DELETE /api/keys/[id] - Revoke API key
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    return notFound('API key');
  }

  // Users can only revoke their own keys (unless admin)
  if (apiKey.userId !== user!.id && user!.role !== 'ADMIN') {
    return forbidden('You can only revoke your own API keys');
  }

  if (!apiKey.isActive) {
    return badRequest('API key is already revoked');
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      revokedAt: true,
    },
  });

  return success({ message: 'API key revoked', key: updated });
}
