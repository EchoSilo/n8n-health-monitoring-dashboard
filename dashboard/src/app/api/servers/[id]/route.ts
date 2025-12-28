import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { encrypt, isEncryptionConfigured } from '@/lib/encryption';
import {
  requireScope,
  requireAdmin,
  requireWriteAccess,
  isDemoAccount,
  forbidden,
  success,
  notFound,
  badRequest,
} from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/servers/[id] - Get server details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'READ_SERVERS');
  if (error) return error;

  const { id } = await params;

  const server = await prisma.server.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      lastChecked: true,
      pollingInterval: true,
      enableWebhook: true,
      skipSSL: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          workflows: true,
          errors: true,
        },
      },
    },
  });

  if (!server) {
    return notFound('Server');
  }

  return success({
    ...server,
    status: server.status.toLowerCase(),
    workflowCount: server._count.workflows,
    errorCount: server._count.errors,
  });
}

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url('Invalid URL format').optional(),
  apiKey: z.string().min(1).optional(),
  pollingInterval: z.number().min(15).max(3600).optional(),
  enableWebhook: z.boolean().optional(),
  skipSSL: z.boolean().optional(),
});

// PATCH /api/servers/[id] - Update server
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireWriteAccess(req, 'WRITE_SERVERS');
  if (error) return error;

  const { id } = await params;

  const server = await prisma.server.findUnique({
    where: { id },
  });

  if (!server) {
    return notFound('Server');
  }

  try {
    const body = await req.json();
    const result = updateServerSchema.safeParse(body);

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

    const { name, url, apiKey, pollingInterval, enableWebhook, skipSSL } = result.data;

    // Check URL uniqueness if changing
    if (url && url !== server.url) {
      const existing = await prisma.server.findFirst({
        where: { url, id: { not: id } },
      });
      if (existing) {
        return badRequest('A server with this URL already exists');
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url.replace(/\/$/, '');
    if (pollingInterval !== undefined) updateData.pollingInterval = pollingInterval;
    if (enableWebhook !== undefined) updateData.enableWebhook = enableWebhook;
    if (skipSSL !== undefined) updateData.skipSSL = skipSSL;

    // Handle API key update
    if (apiKey !== undefined) {
      if (isEncryptionConfigured()) {
        const encrypted = encrypt(apiKey);
        updateData.apiKey = encrypted.encrypted;
        updateData.apiKeyIv = encrypted.iv;
      } else {
        updateData.apiKey = apiKey;
        updateData.apiKeyIv = null;
      }
    }

    const updated = await prisma.server.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        pollingInterval: true,
        enableWebhook: true,
        skipSSL: true,
        updatedAt: true,
      },
    });

    return success({
      ...updated,
      status: updated.status.toLowerCase(),
    });
  } catch (err) {
    console.error('Update server error:', err);
    return badRequest('Failed to update server');
  }
}

// DELETE /api/servers/[id] - Delete server (admin only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAdmin(req);
  if (error) return error;

  // Block demo account from deletions
  if (await isDemoAccount(user!.id)) {
    return forbidden('Demo account is read-only. Create an account to make changes.');
  }

  const { id } = await params;

  const server = await prisma.server.findUnique({
    where: { id },
  });

  if (!server) {
    return notFound('Server');
  }

  // Delete server (cascades to workflows, errors, etc.)
  await prisma.server.delete({
    where: { id },
  });

  return success({ message: 'Server deleted successfully' });
}
