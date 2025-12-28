import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth, isDemoAccount, forbidden, success, created, badRequest } from '@/lib/auth-helpers';

// Valid API key scopes (matches Prisma enum)
const API_KEY_SCOPES = [
  'READ_SERVERS',
  'WRITE_SERVERS',
  'READ_WORKFLOWS',
  'WRITE_WORKFLOWS',
  'READ_ERRORS',
  'WRITE_ERRORS',
  'AI_ANALYSIS',
  'ADMIN',
] as const;

type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const KEY_PREFIX = 'n8h_';
const KEY_LENGTH = 32;

// Helper to parse JSON scopes from database
function parseScopes(scopesJson: string): ApiKeyScope[] {
  try {
    const parsed = JSON.parse(scopesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// GET /api/keys - List user's API keys
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: user!.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      usageCount: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Parse JSON scopes for each key
  const keysWithParsedScopes = keys.map((key) => ({
    ...key,
    scopes: parseScopes(key.scopes),
  }));

  return success(keysWithParsedScopes);
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(API_KEY_SCOPES)).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
});

// POST /api/keys - Create a new API key
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  // Block demo account from creating API keys
  if (await isDemoAccount(user!.id)) {
    return forbidden('Demo account is read-only. Create an account to make changes.');
  }

  try {
    const body = await req.json();
    const result = createKeySchema.safeParse(body);

    if (!result.success) {
      return badRequest('Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors)
            .map(([k, v]) => [k, v?.join(', ') || ''])
        )
      );
    }

    const { name, scopes, expiresInDays } = result.data;

    // Generate secure random key
    const randomBytes = crypto.randomBytes(KEY_LENGTH);
    const keyBody = randomBytes.toString('base64url');
    const fullKey = `${KEY_PREFIX}${keyBody}`;

    // Create prefix for identification (first 8 chars after prefix)
    const keyPrefix = `${KEY_PREFIX}${keyBody.substring(0, 8)}`;

    // Hash for storage
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyPrefix,
        keyHash,
        userId: user!.id,
        scopes: JSON.stringify(scopes || []), // SQLite: store as JSON string
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return full key only on creation (never stored)
    return created({
      ...apiKey,
      scopes: parseScopes(apiKey.scopes), // Parse JSON for response
      key: fullKey, // Only returned on creation!
      warning: 'Save this key now. You won\'t be able to see it again.',
    });
  } catch (err) {
    console.error('Create API key error:', err);
    return badRequest('Failed to create API key');
  }
}
