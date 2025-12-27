import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  requireScope,
  getAuthenticatedUser,
  success,
  notFound,
  badRequest,
} from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/errors/[id] - Get error details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'READ_ERRORS');
  if (error) return error;

  const { id } = await params;

  // Check if we should include traces
  const url = new URL(req.url);
  const include = url.searchParams.get('include')?.split(',') || [];
  const includeTraces = include.includes('traces');
  const includeAnalysis = include.includes('analysis');

  const errorLog = await prisma.errorLog.findUnique({
    where: { id },
    select: {
      id: true,
      message: true,
      severity: true,
      stackTrace: true,
      nodeType: true,
      nodeName: true,
      executionId: true,
      resolved: true,
      resolvedAt: true,
      resolvedById: true,
      resolvedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      timestamp: true,
      createdAt: true,
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
          url: true,
        },
      },
      execution: includeTraces ? {
        select: {
          id: true,
          hasFullTrace: true,
          traces: {
            select: {
              id: true,
              nodeName: true,
              nodeType: true,
              status: true,
              executionTime: true,
              inputData: true,
              outputData: true,
              errorMessage: true,
              errorStack: true,
              orderIndex: true,
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      } : undefined,
      aiAnalysis: {
        select: {
          id: true,
          provider: true,
          model: true,
          confidence: true,
          rootCause: true,
          suggestedFix: true,
          similarIssues: true,
          tokenUsage: true,
          createdAt: true,
        },
      },
    },
  });

  if (!errorLog) {
    return notFound('Error log');
  }

  return success({
    id: errorLog.id,
    message: errorLog.message,
    severity: errorLog.severity.toLowerCase(),
    stackTrace: errorLog.stackTrace,
    nodeType: errorLog.nodeType,
    nodeName: errorLog.nodeName,
    executionId: errorLog.executionId,
    resolved: errorLog.resolved,
    resolvedAt: errorLog.resolvedAt,
    resolvedBy: errorLog.resolvedByUser,
    timestamp: errorLog.timestamp,
    workflow: errorLog.workflow,
    server: errorLog.server,
    execution: errorLog.execution || null,
    hasAiAnalysis: !!errorLog.aiAnalysis,
    aiAnalysis: errorLog.aiAnalysis,
    aiConfidence: errorLog.aiAnalysis?.confidence,
    createdAt: errorLog.createdAt,
  });
}

const updateErrorSchema = z.object({
  resolved: z.boolean().optional(),
});

// PATCH /api/errors/[id] - Update error (mark as resolved)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'WRITE_ERRORS');
  if (error) return error;

  const { id } = await params;

  const errorLog = await prisma.errorLog.findUnique({
    where: { id },
  });

  if (!errorLog) {
    return notFound('Error log');
  }

  try {
    const body = await req.json();
    const result = updateErrorSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Invalid request body');
    }

    const { resolved } = result.data;

    const updateData: Record<string, unknown> = {};

    if (resolved !== undefined) {
      updateData.resolved = resolved;
      if (resolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = user!.id;
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedById = null;
      }
    }

    const updated = await prisma.errorLog.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        resolved: true,
        resolvedAt: true,
        resolvedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return success(updated);
  } catch (err) {
    console.error('Update error log error:', err);
    return badRequest('Failed to update error log');
  }
}
