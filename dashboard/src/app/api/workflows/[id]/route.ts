import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireScope, success, notFound } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workflows/[id] - Get workflow details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'READ_WORKFLOWS');
  if (error) return error;

  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    select: {
      id: true,
      n8nId: true,
      name: true,
      active: true,
      status: true,
      lastExecution: true,
      executionCount: true,
      avgExecTime: true,
      serverId: true,
      createdAt: true,
      updatedAt: true,
      server: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
        },
      },
      _count: {
        select: {
          executions: true,
          errors: true,
        },
      },
    },
  });

  if (!workflow) {
    return notFound('Workflow');
  }

  // Get recent executions
  const recentExecutions = await prisma.execution.findMany({
    where: { workflowId: id },
    select: {
      id: true,
      n8nId: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      duration: true,
      mode: true,
    },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });

  // Get recent errors
  const recentErrors = await prisma.errorLog.findMany({
    where: { workflowId: id, resolved: false },
    select: {
      id: true,
      message: true,
      severity: true,
      nodeType: true,
      nodeName: true,
      timestamp: true,
    },
    orderBy: { timestamp: 'desc' },
    take: 5,
  });

  return success({
    id: workflow.id,
    n8nId: workflow.n8nId,
    name: workflow.name,
    active: workflow.active,
    status: workflow.status.toLowerCase(),
    lastExecution: workflow.lastExecution,
    executionCount: workflow.executionCount,
    avgExecTime: workflow.avgExecTime,
    server: {
      id: workflow.server.id,
      name: workflow.server.name,
      url: workflow.server.url,
      status: workflow.server.status.toLowerCase(),
    },
    stats: {
      totalExecutions: workflow._count.executions,
      totalErrors: workflow._count.errors,
    },
    recentExecutions: recentExecutions.map((e) => ({
      ...e,
      status: e.status.toLowerCase(),
    })),
    recentErrors: recentErrors.map((e) => ({
      ...e,
      severity: e.severity.toLowerCase(),
    })),
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  });
}
