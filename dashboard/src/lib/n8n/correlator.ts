/**
 * Execution Correlator - traces execution chains across workflows
 *
 * Adapted from n8n-debug-mcp for dashboard integration.
 * This is the "killer feature" that enables tracing parent-child
 * workflow relationships for root cause analysis.
 */

import {
  N8nClient,
  N8nWorkflowWithNodes,
  N8nExecutionWithData,
  UserContext,
  HttpCallInfo,
} from '@/lib/n8n-client';

export interface CorrelationResult {
  execution: N8nExecutionWithData;
  parentId: string;
  confidence: number;
  method: string;
}

export interface WebhookMapping {
  path: string;
  workflowId: string;
  workflowName: string;
}

export interface CorrelationOptions {
  timeWindowMs?: number;
  maxDepth?: number;
}

export class ExecutionCorrelator {
  private client: N8nClient;
  private webhookMappings: WebhookMapping[] = [];
  private workflowCache: Map<string, N8nWorkflowWithNodes> = new Map();
  private initialized = false;

  constructor(client: N8nClient) {
    this.client = client;
  }

  /**
   * Initialize webhook mappings from all workflows
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { data: workflows } = await this.client.listWorkflows({ active: true });

    for (const wf of workflows) {
      // Fetch full workflow to get nodes
      const fullWorkflow = await this.client.getWorkflowWithNodes(wf.id);
      this.workflowCache.set(wf.id, fullWorkflow);

      const webhooks = this.client.extractWebhookPaths(fullWorkflow);
      for (const path of webhooks) {
        this.webhookMappings.push({
          path,
          workflowId: wf.id,
          workflowName: wf.name,
        });
      }
    }

    this.initialized = true;
  }

  /**
   * Find workflow ID by webhook path
   */
  findWorkflowByWebhook(webhookUrl: string): WebhookMapping | undefined {
    // Extract path from URL
    let path: string;
    try {
      const url = new URL(webhookUrl);
      path = url.pathname;
    } catch {
      path = webhookUrl;
    }

    // Normalize path
    path = path.replace(/^\/webhook/, '').replace(/^\//, '');

    return this.webhookMappings.find(m => {
      const mappingPath = m.path.replace(/^\//, '');
      return path.includes(mappingPath) || mappingPath.includes(path);
    });
  }

  /**
   * Correlate executions from a root execution
   */
  async correlateExecutions(
    rootExecutionId: string,
    options: CorrelationOptions = {}
  ): Promise<{
    rootExecution: N8nExecutionWithData;
    correlatedExecutions: CorrelationResult[];
  }> {
    const { timeWindowMs = 30000, maxDepth = 5 } = options;

    // Initialize if needed
    if (!this.initialized) {
      await this.initialize();
    }

    const rootExecution = await this.client.getExecutionWithData(rootExecutionId);
    const results: CorrelationResult[] = [];
    const visited = new Set<string>([rootExecutionId]);

    await this.findCorrelatedExecutions(
      rootExecution,
      rootExecutionId,
      timeWindowMs,
      maxDepth,
      0,
      results,
      visited
    );

    return {
      rootExecution,
      correlatedExecutions: results,
    };
  }

  private async findCorrelatedExecutions(
    execution: N8nExecutionWithData,
    parentId: string,
    timeWindowMs: number,
    maxDepth: number,
    currentDepth: number,
    results: CorrelationResult[],
    visited: Set<string>
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    const execStart = new Date(execution.startedAt).getTime();

    // Extract user context for correlation
    const userContext = this.client.extractUserContext(execution);

    // Method 1: Find executions triggered by HTTP calls
    const httpCalls = this.client.extractHttpCalls(execution);
    for (const call of httpCalls) {
      const mapping = this.findWorkflowByWebhook(call.url);
      if (!mapping) continue;

      // Find executions of this workflow within time window
      const { data: candidates } = await this.client.listExecutions({
        workflowId: mapping.workflowId,
        limit: 10,
        includeData: true,
      });

      for (const candidate of candidates) {
        if (visited.has(candidate.id)) continue;

        const candidateStart = new Date(candidate.startedAt).getTime();
        if (candidateStart < execStart - 1000 || candidateStart > execStart + timeWindowMs) {
          continue;
        }

        // Score this correlation
        const score = this.scoreCorrelation(execution, candidate, userContext, call);

        if (score.confidence > 0.5) {
          visited.add(candidate.id);
          results.push({
            execution: candidate,
            parentId,
            confidence: score.confidence,
            method: score.method,
          });

          // Recursively find children
          await this.findCorrelatedExecutions(
            candidate,
            candidate.id,
            timeWindowMs,
            maxDepth,
            currentDepth + 1,
            results,
            visited
          );
        }
      }
    }

    // Method 2: Find sub-workflow executions
    const workflowsWithSubTrigger = [...this.workflowCache.entries()]
      .filter(([, wf]) => this.client.hasSubWorkflowTrigger(wf))
      .map(([id]) => id);

    for (const workflowId of workflowsWithSubTrigger) {
      if (workflowId === execution.workflowId) continue;

      const { data: candidates } = await this.client.listExecutions({
        workflowId,
        limit: 5,
        includeData: true,
      });

      for (const candidate of candidates) {
        if (visited.has(candidate.id)) continue;

        const candidateStart = new Date(candidate.startedAt).getTime();
        if (candidateStart < execStart || candidateStart > execStart + timeWindowMs) {
          continue;
        }

        // Score based on user context match
        const candidateContext = this.client.extractUserContext(candidate);
        let confidence = 0;
        const methods: string[] = [];

        // Timestamp proximity
        const timeDiff = Math.abs(candidateStart - execStart);
        if (timeDiff < 2000) {
          confidence += 0.3;
          methods.push('timestamp');
        } else if (timeDiff < 5000) {
          confidence += 0.2;
          methods.push('timestamp');
        }

        // User ID match
        if (userContext.userId && candidateContext.userId === userContext.userId) {
          confidence += 0.4;
          methods.push('user_id');
        }

        // Chat ID match
        if (userContext.chatId && candidateContext.chatId === userContext.chatId) {
          confidence += 0.3;
          methods.push('chat_id');
        }

        if (confidence > 0.5) {
          visited.add(candidate.id);
          results.push({
            execution: candidate,
            parentId,
            confidence,
            method: methods.join('+'),
          });

          await this.findCorrelatedExecutions(
            candidate,
            candidate.id,
            timeWindowMs,
            maxDepth,
            currentDepth + 1,
            results,
            visited
          );
        }
      }
    }
  }

  private scoreCorrelation(
    parent: N8nExecutionWithData,
    candidate: N8nExecutionWithData,
    parentContext: UserContext,
    httpCall: HttpCallInfo
  ): { confidence: number; method: string } {
    let confidence = 0;
    const methods: string[] = [];

    // Base score for webhook URL match
    confidence += 0.3;
    methods.push('webhook_url');

    // Timestamp proximity (closer = higher score)
    const candidateStart = new Date(candidate.startedAt).getTime();
    const timeDiff = Math.abs(candidateStart - httpCall.timestamp);

    if (timeDiff < 500) {
      confidence += 0.3;
      methods.push('timestamp_exact');
    } else if (timeDiff < 2000) {
      confidence += 0.2;
      methods.push('timestamp_close');
    } else if (timeDiff < 5000) {
      confidence += 0.1;
      methods.push('timestamp');
    }

    // User context match
    const candidateContext = this.client.extractUserContext(candidate);

    if (parentContext.userId && candidateContext.userId === parentContext.userId) {
      confidence += 0.3;
      methods.push('user_id');
    }

    if (parentContext.chatId && candidateContext.chatId === parentContext.chatId) {
      confidence += 0.2;
      methods.push('chat_id');
    }

    if (parentContext.correlationId && candidateContext.correlationId === parentContext.correlationId) {
      confidence += 0.5;
      methods.push('correlation_id');
    }

    // Response ID pattern match
    if (parentContext.responseId && candidateContext.responseId) {
      const parentPattern = parentContext.responseId.split('-').slice(0, 2).join('-');
      const candidatePattern = candidateContext.responseId.split('-').slice(0, 2).join('-');
      if (parentPattern === candidatePattern) {
        confidence += 0.1;
        methods.push('response_pattern');
      }
    }

    return {
      confidence: Math.min(confidence, 1.0),
      method: methods.join('+'),
    };
  }

  /**
   * Get workflow name by ID
   */
  getWorkflowName(workflowId: string): string {
    return this.workflowCache.get(workflowId)?.name || workflowId;
  }

  /**
   * Get all workflow names as a map
   */
  getWorkflowNames(): Map<string, string> {
    const names = new Map<string, string>();
    for (const [id, wf] of this.workflowCache.entries()) {
      names.set(id, wf.name);
    }
    return names;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear cache and reset
   */
  reset(): void {
    this.webhookMappings = [];
    this.workflowCache.clear();
    this.initialized = false;
  }
}

export default ExecutionCorrelator;
