import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireScope, success, badRequest } from '@/lib/auth-helpers';

const querySchema = z.object({
  workflowId: z.string().optional(),
  serverId: z.string().optional(),
  status: z.enum(['SUCCESS', 'ERROR', 'RUNNING', 'WAITING', 'CANCELLED']).optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /api/executions - List executions with optional filters
export async function GET(req: NextRequest) {
  const { user, error } = await requireScope(req, 'READ_WORKFLOWS');
  if (error) return error;

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const result = querySchema.safeParse(searchParams);

  if (!result.success) {
    return badRequest('Invalid query parameters');
  }

  const { workflowId, serverId, status, limit, offset } = result.data;

  const where: Record<string, unknown> = {};

  if (workflowId) {
    where.workflowId = workflowId;
  }

  if (serverId) {
    where.workflow = {
      serverId,
    };
  }

  if (status) {
    where.status = status;
  }

  const [executions, total] = await Promise.all([
    prisma.execution.findMany({
      where,
      select: {
        id: true,
        n8nId: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        duration: true,
        mode: true,
        retryOf: true,
        workflowId: true,
        workflow: {
          select: {
            id: true,
            name: true,
            n8nId: true,
            server: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.execution.count({ where }),
  ]);

  const transformedExecutions = executions.map((e) => ({
    id: e.id,
    n8nId: e.n8nId,
    status: e.status.toLowerCase(),
    startedAt: e.startedAt,
    finishedAt: e.finishedAt,
    duration: e.duration,
    mode: e.mode,
    retryOf: e.retryOf,
    workflow: {
      id: e.workflow.id,
      name: e.workflow.name,
      n8nId: e.workflow.n8nId,
    },
    server: {
      id: e.workflow.server.id,
      name: e.workflow.server.name,
    },
  }));

  return success({
    executions: transformedExecutions,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}
