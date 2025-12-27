import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createN8nClient } from '@/lib/n8n-client';
import { requireScope, success, notFound, badRequest } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/servers/[id]/sync - Sync workflows from n8n server
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'WRITE_SERVERS');
  if (error) return error;

  const { id } = await params;

  const server = await prisma.server.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      apiKey: true,
      apiKeyIv: true,
      skipSSL: true,
    },
  });

  if (!server) {
    return notFound('Server');
  }

  try {
    const client = createN8nClient({
      url: server.url,
      apiKey: server.apiKey,
      apiKeyIv: server.apiKeyIv,
      skipSSL: server.skipSSL,
    });

    // Fetch workflows from n8n
    const n8nWorkflows = await client.getWorkflows();

    // Get existing workflows for this server
    const existingWorkflows = await prisma.workflow.findMany({
      where: { serverId: id },
      select: { id: true, n8nId: true },
    });

    const existingN8nIds = new Set(existingWorkflows.map((w) => w.n8nId));
    const incomingN8nIds = new Set(n8nWorkflows.map((w) => w.id));

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    // Create or update workflows
    for (const workflow of n8nWorkflows) {
      const status = workflow.active ? 'ACTIVE' : 'INACTIVE';

      if (existingN8nIds.has(workflow.id)) {
        // Update existing workflow
        await prisma.workflow.updateMany({
          where: { serverId: id, n8nId: workflow.id },
          data: {
            name: workflow.name,
            status,
            active: workflow.active,
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Create new workflow
        await prisma.workflow.create({
          data: {
            serverId: id,
            n8nId: workflow.id,
            name: workflow.name,
            status,
            active: workflow.active,
          },
        });
        created++;
      }
    }

    // Mark workflows that no longer exist in n8n as inactive
    for (const existing of existingWorkflows) {
      if (!incomingN8nIds.has(existing.n8nId)) {
        await prisma.workflow.update({
          where: { id: existing.id },
          data: { status: 'INACTIVE', active: false },
        });
        deactivated++;
      }
    }

    // Sync executions from n8n
    let executionsSynced = 0;
    let errorsSynced = 0;
    try {
      // Fetch recent executions (last 100)
      const n8nExecutions = await client.getExecutions({ limit: 100 });

      // Get workflow mapping (n8nId -> our workflow id)
      const workflowsForServer = await prisma.workflow.findMany({
        where: { serverId: id },
        select: { id: true, n8nId: true },
      });
      const workflowMap = new Map(workflowsForServer.map(w => [w.n8nId, w.id]));

      // Get existing execution n8nIds to avoid duplicates
      const existingExecutions = await prisma.execution.findMany({
        where: {
          workflow: { serverId: id },
        },
        select: { n8nId: true },
      });
      const existingExecutionIds = new Set(existingExecutions.map(e => e.n8nId));

      // Get existing error execution IDs to avoid duplicate errors
      const existingErrors = await prisma.errorLog.findMany({
        where: { serverId: id },
        select: { executionId: true },
      });
      const existingErrorExecutionIds = new Set(existingErrors.map(e => e.executionId).filter(Boolean));

      // Track latest execution per workflow for updating lastExecution
      const workflowLatestExecution = new Map<string, Date>();

      // Insert new executions
      for (const exec of n8nExecutions) {
        // Skip if workflow not found (shouldn't happen after sync)
        const workflowId = workflowMap.get(exec.workflowId);
        if (!workflowId) continue;

        // Map n8n status to our ExecutionStatus enum
        const statusMap: Record<string, 'SUCCESS' | 'ERROR' | 'RUNNING' | 'WAITING' | 'CANCELLED'> = {
          success: 'SUCCESS',
          error: 'ERROR',
          running: 'RUNNING',
          waiting: 'WAITING',
          crashed: 'ERROR',
          canceled: 'CANCELLED',
        };
        const status = statusMap[exec.status] || 'ERROR';

        // Calculate duration if finished
        const startedAt = new Date(exec.startedAt);
        const finishedAt = exec.stoppedAt ? new Date(exec.stoppedAt) : null;
        const duration = finishedAt ? finishedAt.getTime() - startedAt.getTime() : null;

        // Track latest execution for each workflow
        const currentLatest = workflowLatestExecution.get(workflowId);
        if (!currentLatest || startedAt > currentLatest) {
          workflowLatestExecution.set(workflowId, startedAt);
        }

        // Skip if execution already exists
        if (existingExecutionIds.has(exec.id)) continue;

        await prisma.execution.create({
          data: {
            n8nId: exec.id,
            workflowId,
            status,
            startedAt,
            finishedAt,
            duration,
            mode: exec.mode,
            retryOf: exec.retryOf || null,
          },
        });
        executionsSynced++;

        // Create error log for failed executions with full trace data
        if ((status === 'ERROR' || exec.status === 'crashed') && !existingErrorExecutionIds.has(exec.id)) {
          // Get workflow name for better error message
          const workflowName = n8nWorkflows.find(w => w.id === exec.workflowId)?.name || 'Unknown workflow';

          // Fetch full execution data with traces for failed executions
          let errorMessage = `Workflow "${workflowName}" execution failed`;
          let stackTrace: string | null = null;
          let nodeType: string | null = null;
          let nodeName: string | null = null;
          let executionTraces: ReturnType<typeof client.parseExecutionTraces> = [];

          try {
            const fullExecution = await client.getExecutionWithData(exec.id);

            // Extract error details from execution data
            const errorData = fullExecution.data?.resultData?.error;
            if (errorData) {
              errorMessage = errorData.message || errorMessage;
              stackTrace = errorData.stack || null;
              nodeName = errorData.node?.name || null;
              nodeType = errorData.node?.type || null;
            }

            // Parse execution traces for AI analysis
            executionTraces = client.parseExecutionTraces(fullExecution);
          } catch (traceError) {
            console.error(`Failed to fetch execution trace for ${exec.id}:`, traceError);
          }

          // Find the created execution to link it
          const createdExecution = await prisma.execution.findFirst({
            where: { n8nId: exec.id, workflowId },
            select: { id: true },
          });

          // Create error log
          await prisma.errorLog.create({
            data: {
              workflowId,
              serverId: id,
              executionId: createdExecution?.id || null,
              message: errorMessage,
              severity: 'CRITICAL',
              stackTrace,
              nodeType,
              nodeName,
              timestamp: finishedAt || startedAt,
            },
          });
          errorsSynced++;

          // Store execution traces if we have them
          if (createdExecution && executionTraces.length > 0) {
            await prisma.executionTrace.createMany({
              data: executionTraces.map(trace => ({
                executionId: createdExecution.id,
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

            // Mark execution as having full trace
            await prisma.execution.update({
              where: { id: createdExecution.id },
              data: { hasFullTrace: true },
            });
          }
        }
      }

      // Update lastExecution for each workflow
      for (const [workflowId, latestDate] of workflowLatestExecution) {
        await prisma.workflow.update({
          where: { id: workflowId },
          data: {
            lastExecution: latestDate,
            executionCount: {
              increment: 0, // Trigger update without changing if we want to recalculate
            },
          },
        });
      }

      // Recalculate execution counts and avg exec time for affected workflows
      for (const workflowId of workflowLatestExecution.keys()) {
        const stats = await prisma.execution.aggregate({
          where: { workflowId },
          _count: true,
          _avg: { duration: true },
        });

        await prisma.workflow.update({
          where: { id: workflowId },
          data: {
            executionCount: stats._count,
            avgExecTime: Math.round(stats._avg.duration || 0),
          },
        });
      }

      // Backfill traces for existing errors that don't have them
      const errorsWithoutTraces = await prisma.errorLog.findMany({
        where: {
          serverId: id,
          execution: {
            hasFullTrace: false,
          },
        },
        include: {
          execution: {
            select: { id: true, n8nId: true },
          },
        },
        take: 10, // Limit to 10 per sync to avoid timeout
      });

      for (const error of errorsWithoutTraces) {
        if (!error.execution?.n8nId) continue;

        try {
          const fullExecution = await client.getExecutionWithData(error.execution.n8nId);
          const executionTraces = client.parseExecutionTraces(fullExecution);

          if (executionTraces.length > 0) {
            // Delete any existing traces (shouldn't be any, but just in case)
            await prisma.executionTrace.deleteMany({
              where: { executionId: error.execution.id },
            });

            // Create new traces
            await prisma.executionTrace.createMany({
              data: executionTraces.map(trace => ({
                executionId: error.execution!.id,
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

            // Mark execution as having full trace
            await prisma.execution.update({
              where: { id: error.execution.id },
              data: { hasFullTrace: true },
            });

            // Update error with more details if we got them
            const errorData = fullExecution.data?.resultData?.error;
            if (errorData && (!error.nodeName || !error.nodeType)) {
              await prisma.errorLog.update({
                where: { id: error.id },
                data: {
                  nodeName: errorData.node?.name || error.nodeName,
                  nodeType: errorData.node?.type || error.nodeType,
                  stackTrace: errorData.stack || error.stackTrace,
                },
              });
            }
          }
        } catch (backfillError) {
          console.error(`Failed to backfill trace for error ${error.id}:`, backfillError);
        }
      }

      // Also try to link orphaned errors (executionId = null) to matching executions
      const orphanedErrors = await prisma.errorLog.findMany({
        where: {
          serverId: id,
          executionId: null,
        },
        include: {
          workflow: {
            select: { id: true, n8nId: true },
          },
        },
        take: 10, // Limit to 10 per sync to avoid timeout
      });

      for (const orphan of orphanedErrors) {
        try {
          // Try to find a matching execution by workflow and timestamp (within 1 minute)
          const matchingExecution = await prisma.execution.findFirst({
            where: {
              workflowId: orphan.workflowId,
              status: 'ERROR',
              startedAt: {
                gte: new Date(orphan.timestamp.getTime() - 60000), // 1 minute before
                lte: new Date(orphan.timestamp.getTime() + 60000), // 1 minute after
              },
            },
            orderBy: { startedAt: 'desc' },
            select: { id: true, n8nId: true, hasFullTrace: true },
          });

          if (matchingExecution) {
            // Link the error to the execution
            await prisma.errorLog.update({
              where: { id: orphan.id },
              data: { executionId: matchingExecution.id },
            });

            // If the execution doesn't have traces, try to fetch them
            if (!matchingExecution.hasFullTrace && orphan.workflow?.n8nId) {
              const fullExecution = await client.getExecutionWithData(matchingExecution.n8nId);
              const executionTraces = client.parseExecutionTraces(fullExecution);

              if (executionTraces.length > 0) {
                await prisma.executionTrace.createMany({
                  data: executionTraces.map(trace => ({
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
              }
            }
          }
        } catch (orphanError) {
          console.error(`Failed to link orphaned error ${orphan.id}:`, orphanError);
        }
      }
    } catch (execError) {
      // Log but don't fail the whole sync if executions fail
      console.error('Failed to sync executions:', execError);
    }

    // Update server status and last checked
    await prisma.server.update({
      where: { id },
      data: {
        status: 'ONLINE',
        lastChecked: new Date(),
      },
    });

    return success({
      message: 'Sync completed successfully',
      stats: {
        workflows: {
          total: n8nWorkflows.length,
          created,
          updated,
          deactivated,
        },
        executions: {
          synced: executionsSynced,
        },
        errors: {
          synced: errorsSynced,
        },
      },
    });
  } catch (err) {
    console.error('Sync error:', err);

    // Update server status to indicate degraded state
    await prisma.server.update({
      where: { id },
      data: {
        status: 'DEGRADED',
        lastChecked: new Date(),
      },
    });

    return badRequest(
      err instanceof Error ? err.message : 'Failed to sync workflows'
    );
  }
}
