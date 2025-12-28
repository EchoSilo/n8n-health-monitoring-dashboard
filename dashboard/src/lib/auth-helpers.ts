import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';

// Demo account email - this account has read-only access
export const DEMO_EMAIL = 'mock@example.com';

// API key scopes (SQLite stores as JSON string, not native array)
export const API_KEY_SCOPES = [
  'READ_SERVERS',
  'WRITE_SERVERS',
  'READ_WORKFLOWS',
  'WRITE_WORKFLOWS',
  'READ_ERRORS',
  'WRITE_ERRORS',
  'AI_ANALYSIS',
  'ADMIN',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

// Helper to parse JSON scopes from database
function parseScopes(scopesJson: string): ApiKeyScope[] {
  try {
    const parsed = JSON.parse(scopesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  scopes: ApiKeyScope[] | null; // null = all scopes based on role
}

/**
 * Get authenticated user from session or API key
 */
export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  // Check for API key authentication
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    return authenticateWithApiKey(apiKey);
  }

  // Fall back to session authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
    scopes: null, // Session users have full access per role
  };
}

/**
 * Authenticate with API key
 */
async function authenticateWithApiKey(
  key: string
): Promise<AuthenticatedUser | null> {
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey || !apiKey.isActive) {
    return null;
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update usage stats (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    })
    .catch(() => {
      // Ignore errors updating usage stats
    });

  // Parse JSON scopes string
  const scopes = parseScopes(apiKey.scopes);

  return {
    id: apiKey.user.id,
    role: apiKey.user.role,
    scopes: scopes.length > 0 ? scopes : null,
  };
}

/**
 * Check if user has required role
 * ADMIN > MEMBER
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    ADMIN: 2,
    MEMBER: 1,
  };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Check if user has required scope
 */
export function hasScope(
  userRole: UserRole,
  scopes: ApiKeyScope[] | null,
  requiredScope: ApiKeyScope
): boolean {
  // Admins always have access
  if (userRole === 'ADMIN') return true;

  // If no scope restrictions, use role-based access
  if (!scopes) {
    return checkRoleScope(userRole, requiredScope);
  }

  // Check specific scopes
  return scopes.includes(requiredScope) || scopes.includes('ADMIN');
}

/**
 * Check if a role has access to a scope
 */
function checkRoleScope(role: UserRole, scope: ApiKeyScope): boolean {
  const roleScopes: Record<UserRole, ApiKeyScope[]> = {
    ADMIN: [
      'ADMIN',
      'READ_SERVERS',
      'WRITE_SERVERS',
      'READ_WORKFLOWS',
      'WRITE_WORKFLOWS',
      'READ_ERRORS',
      'WRITE_ERRORS',
      'AI_ANALYSIS',
    ],
    MEMBER: [
      'READ_SERVERS',
      'WRITE_SERVERS',
      'READ_WORKFLOWS',
      'WRITE_WORKFLOWS',
      'READ_ERRORS',
      'WRITE_ERRORS',
      'AI_ANALYSIS',
    ],
  };

  return roleScopes[role]?.includes(scope) ?? false;
}

// Response helpers
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(resource = 'Resource') {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function badRequest(message: string, details?: Record<string, string>) {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status: 400 }
  );
}

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Require authentication for a route handler
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { user: null, error: unauthorized() };
  }
  return { user, error: null };
}

/**
 * Require admin role for a route handler
 */
export async function requireAdmin(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { user: null, error: unauthorized() };
  }
  if (user.role !== 'ADMIN') {
    return { user: null, error: forbidden('Admin access required') };
  }
  return { user, error: null };
}

/**
 * Require a specific scope for a route handler
 */
export async function requireScope(req: NextRequest, scope: ApiKeyScope) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { user: null, error: unauthorized() };
  }
  if (!hasScope(user.role, user.scopes, scope)) {
    return { user: null, error: forbidden(`Scope '${scope}' required`) };
  }
  return { user, error: null };
}

/**
 * Check if a user ID belongs to the demo account
 */
export async function isDemoAccount(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email === DEMO_EMAIL;
}

/**
 * Require write access - blocks demo account from mutations
 * Use this instead of requireScope for any write operations
 */
export async function requireWriteAccess(req: NextRequest, scope: ApiKeyScope) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { user: null, error: unauthorized() };
  }
  if (!hasScope(user.role, user.scopes, scope)) {
    return { user: null, error: forbidden(`Scope '${scope}' required`) };
  }

  // Block demo account from write operations
  if (await isDemoAccount(user.id)) {
    return {
      user: null,
      error: forbidden('Demo account is read-only. Create an account to make changes.'),
    };
  }

  return { user, error: null };
}
