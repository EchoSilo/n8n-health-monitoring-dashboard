import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createN8nClient } from '@/lib/n8n-client';
import { requireScope, success, notFound, badRequest } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/errors/[id]/trace - Get execution trace for an error
// Fetches from n8n if not already stored
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireScope(req, 'READ_ERRORS');
  if (authError) return authError;

  const { id } = await params;

  // Get error with execution and server info
  const errorLog = await prisma.errorLog.findUnique({
    where: { id },
    select: {
      id: true,
      workflowId: true,
      timestamp: true,
      execution: {
        select: {
          id: true,
          n8nId: true,
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
      },
      server: {
        select: {
          id: true,
          url: true,
          apiKey: true,
          apiKeyIv: true,
          skipSSL: true,
        },
      },
    },
  });

  if (!errorLog) {
    return notFound('Error log');
  }

  // If we already have traces, return them
  if (errorLog.execution?.hasFullTrace && errorLog.execution.traces.length > 0) {
    return success({
      source: 'database',
      executionId: errorLog.execution.id,
      traces: errorLog.execution.traces,
    });
  }

  // Try to fetch traces from n8n server
  if (!errorLog.server) {
    return success({
      source: 'none',
      message: 'No server associated with this error',
      traces: [],
    });
  }

  // If we have an execution but no traces, try to fetch from n8n
  if (errorLog.execution?.n8nId) {
    try {
      const client = createN8nClient({
        url: errorLog.server.url,
        apiKey: errorLog.server.apiKey,
        apiKeyIv: errorLog.server.apiKeyIv,
        skipSSL: errorLog.server.skipSSL,
      });

      const fullExecution = await client.getExecutionWithData(errorLog.execution.n8nId);
      const traces = client.parseExecutionTraces(fullExecution);

      if (traces.length > 0) {
        // Store traces in database for future requests
        await prisma.executionTrace.deleteMany({
          where: { executionId: errorLog.execution.id },
        });

        await prisma.executionTrace.createMany({
          data: traces.map(trace => ({
            executionId: errorLog.execution!.id,
            nodeName: trace.nodeName,
            nodeType: trace.nodeType,
            status: trace.status,
            executionTime: trace.executionTime,
            inputData: trace.inputData,
            outputData: trace.outputData,
            errorMessage: trace.errorMessage,
            errorStack: trace.errorStack,
            orderIndex: trace.orderIndex,
          })),
        });

        await prisma.execution.update({
          where: { id: errorLog.execution.id },
          data: { hasFullTrace: true },
        });

        return success({
          source: 'n8n',
          executionId: errorLog.execution.id,
          traces: traces.map((t, idx) => ({
            id: `temp-${idx}`, // Temporary ID since we just created them
            ...t,
          })),
        });
      }

      return success({
        source: 'n8n',
        message: 'Execution found but no trace data available',
        traces: [],
      });
    } catch (fetchError) {
      console.error('Failed to fetch trace from n8n:', fetchError);
      return success({
        source: 'error',
        message: fetchError instanceof Error ? fetchError.message : 'Failed to fetch trace',
        traces: [],
      });
    }
  }

  // No execution linked - try to find matching execution
  try {
    const matchingExecution = await prisma.execution.findFirst({
      where: {
        workflowId: errorLog.workflowId,
        status: 'ERROR',
        startedAt: {
          gte: new Date(errorLog.timestamp.getTime() - 60000),
          lte: new Date(errorLog.timestamp.getTime() + 60000),
        },
      },
      orderBy: { startedAt: 'desc' },
      select: { id: true, n8nId: true, hasFullTrace: true },
    });

    if (matchingExecution) {
      // Link the error to the execution
      await prisma.errorLog.update({
        where: { id: errorLog.id },
        data: { executionId: matchingExecution.id },
      });

      // Now try to fetch traces
      const client = createN8nClient({
        url: errorLog.server.url,
        apiKey: errorLog.server.apiKey,
        apiKeyIv: errorLog.server.apiKeyIv,
        skipSSL: errorLog.server.skipSSL,
      });

      const fullExecution = await client.getExecutionWithData(matchingExecution.n8nId);
      const traces = client.parseExecutionTraces(fullExecution);

      if (traces.length > 0) {
        await prisma.executionTrace.createMany({
          data: traces.map(trace => ({
            executionId: matchingExecution.id,
            nodeName: trace.nodeName,
            nodeType: trace.nodeType,
            status: trace.status,
            executionTime: trace.executionTime,
            inputData: trace.inputData,
            outputData: trace.outputData,
            errorMessage: trace.errorMessage,
            errorStack: trace.errorStack,
            orderIndex: trace.orderIndex,
          })),
        });

        await prisma.execution.update({
          where: { id: matchingExecution.id },
          data: { hasFullTrace: true },
        });

        return success({
          source: 'n8n-matched',
          executionId: matchingExecution.id,
          message: 'Found and linked matching execution',
          traces: traces.map((t, idx) => ({
            id: `temp-${idx}`,
            ...t,
          })),
        });
      }
    }

    return success({
      source: 'none',
      message: 'No matching execution found for this error',
      traces: [],
    });
  } catch (matchError) {
    console.error('Failed to find matching execution:', matchError);
    return success({
      source: 'error',
      message: matchError instanceof Error ? matchError.message : 'Failed to find matching execution',
      traces: [],
    });
  }
}

// POST /api/errors/[id]/trace - Force refresh trace from n8n
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireScope(req, 'READ_ERRORS');
  if (authError) return authError;

  const { id } = await params;

  const errorLog = await prisma.errorLog.findUnique({
    where: { id },
    select: {
      id: true,
      execution: {
        select: {
          id: true,
          n8nId: true,
        },
      },
      server: {
        select: {
          id: true,
          url: true,
          apiKey: true,
          apiKeyIv: true,
          skipSSL: true,
        },
      },
    },
  });

  if (!errorLog) {
    return notFound('Error log');
  }

  if (!errorLog.execution?.n8nId) {
    return badRequest('No execution linked to this error');
  }

  if (!errorLog.server) {
    return badRequest('No server associated with this error');
  }

  try {
    const client = createN8nClient({
      url: errorLog.server.url,
      apiKey: errorLog.server.apiKey,
      apiKeyIv: errorLog.server.apiKeyIv,
      skipSSL: errorLog.server.skipSSL,
    });

    const fullExecution = await client.getExecutionWithData(errorLog.execution.n8nId);
    const traces = client.parseExecutionTraces(fullExecution);

    // Clear existing traces and create new ones
    await prisma.executionTrace.deleteMany({
      where: { executionId: errorLog.execution.id },
    });

    if (traces.length > 0) {
      await prisma.executionTrace.createMany({
        data: traces.map(trace => ({
          executionId: errorLog.execution!.id,
          nodeName: trace.nodeName,
          nodeType: trace.nodeType,
          status: trace.status,
          executionTime: trace.executionTime,
          inputData: trace.inputData,
          outputData: trace.outputData,
          errorMessage: trace.errorMessage,
          errorStack: trace.errorStack,
          orderIndex: trace.orderIndex,
        })),
      });

      await prisma.execution.update({
        where: { id: errorLog.execution.id },
        data: { hasFullTrace: true },
      });
    }

    return success({
      message: 'Trace refreshed successfully',
      traceCount: traces.length,
      traces: traces.map((t, idx) => ({
        id: `temp-${idx}`,
        ...t,
      })),
    });
  } catch (fetchError) {
    console.error('Failed to refresh trace:', fetchError);
    return badRequest(
      fetchError instanceof Error ? fetchError.message : 'Failed to refresh trace'
    );
  }
}
