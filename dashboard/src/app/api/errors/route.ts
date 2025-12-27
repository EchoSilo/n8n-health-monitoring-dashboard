import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireScope, success, badRequest } from '@/lib/auth-helpers';

const querySchema = z.object({
  workflowId: z.string().optional(),
  serverId: z.string().optional(),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']).optional(),
  resolved: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /api/errors - List error logs with optional filters
export async function GET(req: NextRequest) {
  const { user, error } = await requireScope(req, 'READ_ERRORS');
  if (error) return error;

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const result = querySchema.safeParse(searchParams);

  if (!result.success) {
    return badRequest('Invalid query parameters');
  }

  const { workflowId, serverId, severity, resolved, limit, offset } = result.data;

  const where: Record<string, unknown> = {};

  if (workflowId) {
    where.workflowId = workflowId;
  }

  if (serverId) {
    where.serverId = serverId;
  }

  if (severity) {
    where.severity = severity;
  }

  if (resolved !== undefined) {
    where.resolved = resolved;
  }

  const [errors, total] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      select: {
        id: true,
        message: true,
        severity: true,
        nodeType: true,
        nodeName: true,
        executionId: true,
        resolved: true,
        resolvedAt: true,
        timestamp: true,
        workflow: {
          select: {
            id: true,
            name: true,
            n8nId: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        aiAnalysis: {
          select: {
            id: true,
            rootCause: true,
            confidence: true,
          },
        },
        rcaAnalysis: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.errorLog.count({ where }),
  ]);

  const transformedErrors = errors.map((e) => ({
    id: e.id,
    message: e.message,
    severity: e.severity.toLowerCase(),
    nodeType: e.nodeType,
    nodeName: e.nodeName,
    executionId: e.executionId,
    resolved: e.resolved,
    resolvedAt: e.resolvedAt,
    timestamp: e.timestamp,
    workflow: e.workflow,
    server: e.server,
    hasAiAnalysis: !!e.aiAnalysis,
    hasRca: !!e.rcaAnalysis,
    aiConfidence: e.aiAnalysis?.confidence,
  }));

  return success({
    errors: transformedErrors,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}
