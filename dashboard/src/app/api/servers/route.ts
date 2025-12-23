import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { encrypt, isEncryptionConfigured } from '@/lib/encryption';
import { requireAuth, requireScope, success, created, badRequest } from '@/lib/auth-helpers';

// GET /api/servers - List all servers
export async function GET(req: NextRequest) {
  const { user, error } = await requireScope(req, 'READ_SERVERS');
  if (error) return error;

  const servers = await prisma.server.findMany({
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
      _count: {
        select: {
          workflows: true,
          errors: {
            where: {
              resolved: false,
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to include counts
  const transformedServers = servers.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    status: s.status.toLowerCase(),
    lastChecked: s.lastChecked,
    pollingInterval: s.pollingInterval,
    enableWebhook: s.enableWebhook,
    skipSSL: s.skipSSL,
    createdById: s.createdById,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    workflowCount: s._count.workflows,
    errorCount: s._count.errors,
  }));

  return success(transformedServers);
}

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Invalid URL format'),
  apiKey: z.string().min(1, 'API key is required'),
  pollingInterval: z.number().min(15).max(3600).default(30),
  enableWebhook: z.boolean().default(false),
  skipSSL: z.boolean().default(false),
});

// POST /api/servers - Create a new server
export async function POST(req: NextRequest) {
  const { user, error } = await requireScope(req, 'WRITE_SERVERS');
  if (error) return error;

  try {
    const body = await req.json();
    const result = createServerSchema.safeParse(body);

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

    // Check if server with same URL already exists
    const existing = await prisma.server.findFirst({
      where: { url },
    });

    if (existing) {
      return badRequest('A server with this URL already exists');
    }

    // Encrypt API key if encryption is configured
    let encryptedApiKey = apiKey;
    let apiKeyIv: string | null = null;

    if (isEncryptionConfigured()) {
      const encrypted = encrypt(apiKey);
      encryptedApiKey = encrypted.encrypted;
      apiKeyIv = encrypted.iv;
    }

    const server = await prisma.server.create({
      data: {
        name,
        url: url.replace(/\/$/, ''), // Remove trailing slash
        apiKey: encryptedApiKey,
        apiKeyIv,
        pollingInterval,
        enableWebhook,
        skipSSL,
        createdById: user!.id,
        status: 'UNKNOWN',
      },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        pollingInterval: true,
        enableWebhook: true,
        skipSSL: true,
        createdAt: true,
      },
    });

    return created({
      ...server,
      status: server.status.toLowerCase(),
    });
  } catch (err) {
    console.error('Create server error:', err);
    return badRequest('Failed to create server');
  }
}
