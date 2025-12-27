import { N8nClient, N8nExecutionWithData, ChildExecutionInfo } from '../n8n-client';
import { prisma } from '../db';
import {
  ExecutionTraceContext,
  ExecutionSummary,
  ExecutionChainContext,
  ErrorAnalysisContext,
} from './types';

export interface InvestigationResult {
  mainExecution: N8nExecutionWithData | null;
  mainTraces: ExecutionTraceContext[];
  correlatedExecutions: ExecutionSummary[];
  childExecutions: Map<string, N8nExecutionWithData>; // n8nId -> execution
  childTraces: Map<string, ExecutionTraceContext[]>; // n8nId -> traces
  executionChain: ExecutionChainContext | null;
}

export interface ErrorLogWithRelations {
  id: string;
  message: string;
  severity: string;
  stackTrace: string | null;
  nodeName: string | null;
  nodeType: string | null;
  timestamp: Date;
  workflowId: string;
  workflow: {
    id: string;
    name: string;
    n8nId: string;
  };
  server: {
    id: string;
    name: string;
    url: string;
    apiKey: string;
    apiKeyIv: string | null;
    skipSSL: boolean;
  };
  execution: {
    id: string;
    n8nId: string;
    hasFullTrace: boolean;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    duration: number | null;
    parentExecutionId: string | null;
    correlationId: string | null;
    depth: number;
    traces: Array<{
      id: string;
      nodeName: string;
      nodeType: string;
      status: string;
      executionTime: number | null;
      inputData: string | null;
      outputData: string | null;
      errorMessage: string | null;
      errorStack: string | null;
      orderIndex: number;
    }>;
  } | null;
}

/**
 * ErrorInvestigator - Investigates workflow errors with live n8n access
 *
 * This service fetches execution data from n8n when stored traces are insufficient,
 * and traces execution chains through sub-workflows to find the root cause.
 */
export class ErrorInvestigator {
  private client: N8nClient;
  private timeWindowMs: number;

  constructor(client: N8nClient, timeWindowMs: number = 30000) {
    this.client = client;
    this.timeWindowMs = timeWindowMs;
  }

  /**
   * Investigate an error with live n8n access
   */
  async investigate(errorLog: ErrorLogWithRelations): Promise<InvestigationResult> {
    const result: InvestigationResult = {
      mainExecution: null,
      mainTraces: [],
      correlatedExecutions: [],
      childExecutions: new Map(),
      childTraces: new Map(),
      executionChain: null,
    };

    // 1. Get main execution trace
    if (errorLog.execution?.n8nId) {
      try {
        result.mainExecution = await this.client.getExecutionWithData(
          errorLog.execution.n8nId
        );
        result.mainTraces = this.client.parseExecutionTraces(result.mainExecution);
      } catch (err) {
        console.error(`Failed to fetch main execution ${errorLog.execution.n8nId}:`, err);
      }
    }

    // 2. Find child executions from Execute Workflow nodes
    if (result.mainExecution) {
      const childInfo = this.client.extractChildExecutions(result.mainExecution);

      for (const child of childInfo) {
        try {
          const childExec = await this.client.getExecutionWithData(child.childExecutionId);
          result.childExecutions.set(child.childExecutionId, childExec);
          result.childTraces.set(
            child.childExecutionId,
            this.client.parseExecutionTraces(childExec)
          );

          // Recursively fetch child's children (up to 3 levels deep)
          await this.fetchNestedChildren(childExec, result, 1, 3);
        } catch (err) {
          console.error(`Failed to fetch child execution ${child.childExecutionId}:`, err);
        }
      }
    }

    // 3. Find correlated executions (same time window)
    if (errorLog.execution) {
      result.correlatedExecutions = await this.findCorrelatedExecutions(
        errorLog.execution.startedAt,
        errorLog.workflowId
      );
    }

    // 4. Build execution chain context
    result.executionChain = await this.buildExecutionChain(errorLog, result);

    return result;
  }

  /**
   * Recursively fetch child executions
   */
  private async fetchNestedChildren(
    execution: N8nExecutionWithData,
    result: InvestigationResult,
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    const childInfo = this.client.extractChildExecutions(execution);

    for (const child of childInfo) {
      // Skip if already fetched
      if (result.childExecutions.has(child.childExecutionId)) continue;

      try {
        const childExec = await this.client.getExecutionWithData(child.childExecutionId);
        result.childExecutions.set(child.childExecutionId, childExec);
        result.childTraces.set(
          child.childExecutionId,
          this.client.parseExecutionTraces(childExec)
        );

        // Recurse
        await this.fetchNestedChildren(childExec, result, currentDepth + 1, maxDepth);
      } catch (err) {
        console.error(`Failed to fetch nested child execution ${child.childExecutionId}:`, err);
      }
    }
  }

  /**
   * Find executions that ran around the same time (potential correlations)
   */
  private async findCorrelatedExecutions(
    timestamp: Date,
    excludeWorkflowId: string
  ): Promise<ExecutionSummary[]> {
    const startTime = new Date(timestamp.getTime() - this.timeWindowMs);
    const endTime = new Date(timestamp.getTime() + this.timeWindowMs);

    const executions = await prisma.execution.findMany({
      where: {
        startedAt: {
          gte: startTime,
          lte: endTime,
        },
        workflowId: {
          not: excludeWorkflowId,
        },
      },
      select: {
        id: true,
        n8nId: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        duration: true,
        workflow: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
      orderBy: { startedAt: 'asc' },
    });

    return executions.map(exec => ({
      id: exec.id,
      n8nId: exec.n8nId,
      workflowName: exec.workflow.name,
      status: exec.status,
      startedAt: exec.startedAt,
      finishedAt: exec.finishedAt,
      duration: exec.duration,
    }));
  }

  /**
   * Build the execution chain context for AI analysis
   */
  private async buildExecutionChain(
    errorLog: ErrorLogWithRelations,
    investigation: InvestigationResult
  ): Promise<ExecutionChainContext | null> {
    if (!errorLog.execution) return null;

    const chain: ExecutionChainContext = {
      depth: errorLog.execution.depth,
      children: [],
      failedBranch: [],
    };

    // Get parent if this is a child execution
    if (errorLog.execution.parentExecutionId) {
      const parent = await prisma.execution.findUnique({
        where: { id: errorLog.execution.parentExecutionId },
        select: {
          id: true,
          n8nId: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          duration: true,
          workflow: {
            select: { name: true },
          },
        },
      });

      if (parent) {
        chain.parent = {
          id: parent.id,
          n8nId: parent.n8nId,
          workflowName: parent.workflow.name,
          status: parent.status,
          startedAt: parent.startedAt,
          finishedAt: parent.finishedAt,
          duration: parent.duration,
        };
      }
    }

    // Add children from investigation
    for (const [n8nId, exec] of investigation.childExecutions) {
      const traces = investigation.childTraces.get(n8nId) || [];
      const errorTrace = traces.find(t => t.status === 'error');

      chain.children?.push({
        id: n8nId, // Using n8nId as we may not have DB ID
        n8nId,
        workflowName: exec.workflowData?.name || 'Unknown',
        status: exec.status,
        startedAt: new Date(exec.startedAt),
        finishedAt: exec.stoppedAt ? new Date(exec.stoppedAt) : null,
        duration: exec.stoppedAt
          ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()
          : null,
        errorMessage: errorTrace?.errorMessage || undefined,
      });
    }

    // Build failed branch - path from root to actual failure
    const failedBranch: ExecutionSummary[] = [];

    // Start with main execution
    if (investigation.mainExecution) {
      failedBranch.push({
        id: errorLog.execution.id,
        n8nId: errorLog.execution.n8nId,
        workflowName: errorLog.workflow.name,
        status: errorLog.execution.status,
        startedAt: errorLog.execution.startedAt,
        finishedAt: errorLog.execution.finishedAt,
        duration: errorLog.execution.duration,
        errorMessage: errorLog.message,
      });
    }

    // Find the failing child path
    for (const [n8nId, exec] of investigation.childExecutions) {
      if (exec.status === 'error') {
        const traces = investigation.childTraces.get(n8nId) || [];
        const errorTrace = traces.find(t => t.status === 'error');

        failedBranch.push({
          id: n8nId,
          n8nId,
          workflowName: exec.workflowData?.name || 'Unknown',
          status: exec.status,
          startedAt: new Date(exec.startedAt),
          finishedAt: exec.stoppedAt ? new Date(exec.stoppedAt) : null,
          duration: exec.stoppedAt
            ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()
            : null,
          errorMessage: errorTrace?.errorMessage || exec.data?.resultData?.error?.message,
        });
      }
    }

    chain.failedBranch = failedBranch;

    return chain;
  }

  /**
   * Build comprehensive analysis context from investigation results
   */
  buildAnalysisContext(
    errorLog: ErrorLogWithRelations,
    investigation: InvestigationResult
  ): ErrorAnalysisContext {
    // Combine traces from main and child executions
    const allTraces: ExecutionTraceContext[] = [...investigation.mainTraces];

    // Add child traces with workflow context
    for (const [n8nId, traces] of investigation.childTraces) {
      const childExec = investigation.childExecutions.get(n8nId);
      const workflowName = childExec?.workflowData?.name || 'Sub-workflow';

      for (const trace of traces) {
        allTraces.push({
          ...trace,
          nodeName: `[${workflowName}] ${trace.nodeName}`,
        });
      }
    }

    return {
      errorId: errorLog.id,
      errorMessage: errorLog.message,
      stackTrace: errorLog.stackTrace,
      severity: errorLog.severity,
      nodeName: errorLog.nodeName,
      nodeType: errorLog.nodeType,
      workflowName: errorLog.workflow.name,
      serverName: errorLog.server.name,
      timestamp: errorLog.timestamp,
      traces: allTraces,
      executionChain: investigation.executionChain || undefined,
    };
  }
}
