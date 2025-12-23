import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireScope, success, notFound } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/executions/[id] - Get execution details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'READ_WORKFLOWS');
  if (error) return error;

  const { id } = await params;

  const execution = await prisma.execution.findUnique({
    where: { id },
    select: {
      id: true,
      n8nId: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      duration: true,
      mode: true,
      retryOf: true,
      data: true,
      createdAt: true,
      workflow: {
        select: {
          id: true,
          name: true,
          n8nId: true,
          server: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      },
    },
  });

  if (!execution) {
    return notFound('Execution');
  }

  // Get related error logs for this execution
  const errors = await prisma.errorLog.findMany({
    where: { executionId: execution.n8nId },
    select: {
      id: true,
      message: true,
      severity: true,
      nodeType: true,
      nodeName: true,
      stackTrace: true,
      resolved: true,
      timestamp: true,
      aiAnalysis: {
        select: {
          rootCause: true,
          suggestedFix: true,
          confidence: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  return success({
    id: execution.id,
    n8nId: execution.n8nId,
    status: execution.status.toLowerCase(),
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    duration: execution.duration,
    mode: execution.mode,
    retryOf: execution.retryOf,
    data: execution.data,
    workflow: {
      id: execution.workflow.id,
      name: execution.workflow.name,
      n8nId: execution.workflow.n8nId,
    },
    server: {
      id: execution.workflow.server.id,
      name: execution.workflow.server.name,
      url: execution.workflow.server.url,
    },
    errors: errors.map((e) => ({
      ...e,
      severity: e.severity.toLowerCase(),
    })),
    createdAt: execution.createdAt,
  });
}
