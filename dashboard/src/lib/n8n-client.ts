import { decrypt } from './encryption';

export interface N8nClientConfig {
  url: string;
  apiKey: string;
  apiKeyIv: string | null;
  skipSSL?: boolean;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'waiting' | 'crashed' | 'canceled';
}

// Node execution data from n8n
export interface N8nNodeExecutionData {
  executionTime?: number;
  executionStatus?: string;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  data?: {
    main?: Array<Array<{
      json: Record<string, unknown>;
      binary?: Record<string, unknown>;
    }>>;
  };
}

// Full execution with trace data
export interface N8nExecutionWithData extends N8nExecution {
  data?: {
    resultData?: {
      runData?: Record<string, N8nNodeExecutionData[]>;
      error?: {
        message: string;
        stack?: string;
        node?: {
          name: string;
          type: string;
        };
      };
    };
    executionData?: {
      nodeExecutionStack?: Array<{
        node: { name: string; type: string };
        data: unknown;
      }>;
    };
  };
  workflowData?: {
    name: string;
    nodes?: Array<{
      name: string;
      type: string;
      parameters: Record<string, unknown>;
    }>;
  };
}

// Parsed execution trace for storage
export interface ParsedExecutionTrace {
  nodeName: string;
  nodeType: string;
  status: 'success' | 'error' | 'skipped';
  executionTime: number | null;
  inputData: string | null;
  outputData: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  orderIndex: number;
  // Sub-workflow execution tracking
  childExecutionId?: string | null;
}

// Child execution info extracted from Execute Workflow nodes
export interface ChildExecutionInfo {
  parentNodeName: string;
  childExecutionId: string;
  childWorkflowId?: string;
}

export interface N8nHealthResponse {
  status: 'ok' | 'error';
  message?: string;
}

// Extended workflow type with full node info
export interface N8nWorkflowWithNodes extends N8nWorkflow {
  nodes?: Array<{
    id: string;
    name: string;
    type: string;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }>;
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

// User context for correlation
export interface UserContext {
  userId?: string;
  chatId?: string;
  correlationId?: string;
  responseId?: string;
}

// HTTP call info for correlation
export interface HttpCallInfo {
  nodeName: string;
  url: string;
  method: string;
  timestamp: number;
  responseData?: Record<string, unknown>;
}

// Error details extracted from execution
export interface ExtractedError {
  node: string;
  message: string;
  stack?: string;
}

/**
 * Create an n8n API client for a specific server
 */
export function createN8nClient(config: N8nClientConfig) {
  // Decrypt API key if encrypted
  let apiKey = config.apiKey;
  if (config.apiKeyIv) {
    try {
      apiKey = decrypt(config.apiKey, config.apiKeyIv);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  const baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash

  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${baseUrl}/api/v1${endpoint}`;

    const headers: Record<string, string> = {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Note: In Node.js, we'd need to handle SSL verification differently
    // For now, we'll trust the server's SSL settings
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`n8n API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  return {
    /**
     * Check n8n instance health
     */
    async checkHealth(): Promise<{ healthy: boolean; latency: number; version?: string }> {
      const start = Date.now();
      try {
        // Try to get workflows as a health check (n8n doesn't have a dedicated health endpoint)
        await request<{ data: N8nWorkflow[] }>('/workflows?limit=1');
        return {
          healthy: true,
          latency: Date.now() - start,
        };
      } catch (error) {
        return {
          healthy: false,
          latency: Date.now() - start,
        };
      }
    },

    /**
     * Get all workflows
     */
    async getWorkflows(): Promise<N8nWorkflow[]> {
      const response = await request<{ data: N8nWorkflow[] }>('/workflows');
      return response.data;
    },

    /**
     * Get a specific workflow
     */
    async getWorkflow(id: string): Promise<N8nWorkflow> {
      return request<N8nWorkflow>(`/workflows/${id}`);
    },

    /**
     * Activate a workflow
     */
    async activateWorkflow(id: string): Promise<N8nWorkflow> {
      return request<N8nWorkflow>(`/workflows/${id}/activate`, {
        method: 'POST',
      });
    },

    /**
     * Deactivate a workflow
     */
    async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
      return request<N8nWorkflow>(`/workflows/${id}/deactivate`, {
        method: 'POST',
      });
    },

    /**
     * Get executions for a workflow
     */
    async getExecutions(options?: {
      workflowId?: string;
      status?: N8nExecution['status'];
      limit?: number;
    }): Promise<N8nExecution[]> {
      const params = new URLSearchParams();
      if (options?.workflowId) params.append('workflowId', options.workflowId);
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', options.limit.toString());

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await request<{ data: N8nExecution[] }>(`/executions${query}`);
      return response.data;
    },

    /**
     * Get a specific execution
     */
    async getExecution(id: string): Promise<N8nExecution & { data?: unknown }> {
      return request<N8nExecution & { data?: unknown }>(`/executions/${id}`);
    },

    /**
     * Get execution with full data for trace analysis
     */
    async getExecutionWithData(id: string): Promise<N8nExecutionWithData> {
      // n8n API returns full data by default when requesting a specific execution
      return request<N8nExecutionWithData>(`/executions/${id}?includeData=true`);
    },

    /**
     * Parse execution data into trace format for storage
     * Truncates large payloads to ~10KB
     */
    parseExecutionTraces(execution: N8nExecutionWithData): ParsedExecutionTrace[] {
      const traces: ParsedExecutionTrace[] = [];
      const runData = execution.data?.resultData?.runData;

      if (!runData) {
        // Log diagnostic info to help debug missing traces
        console.warn(`[parseExecutionTraces] No runData for execution ${execution.id}`, {
          hasData: !!execution.data,
          hasResultData: !!execution.data?.resultData,
          resultDataKeys: Object.keys(execution.data?.resultData || {}),
          executionStatus: execution.status,
          workflowId: execution.workflowId,
        });
        return traces;
      }

      const MAX_PAYLOAD_SIZE = 10000; // 10KB limit

      function truncateJson(obj: unknown): string | null {
        if (!obj) return null;
        const str = JSON.stringify(obj);
        if (str.length > MAX_PAYLOAD_SIZE) {
          return str.substring(0, MAX_PAYLOAD_SIZE) + '... (truncated)';
        }
        return str;
      }

      let orderIndex = 1;
      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        for (const run of nodeRuns) {
          // Find node type from workflow data
          const nodeInfo = execution.workflowData?.nodes?.find(n => n.name === nodeName);
          const nodeType = nodeInfo?.type || 'unknown';

          // Determine status
          let status: 'success' | 'error' | 'skipped' = 'success';
          if (run.error) {
            status = 'error';
          } else if (run.executionStatus === 'skipped') {
            status = 'skipped';
          }

          // Extract input/output data
          const inputData = run.data?.main?.[0]?.[0]?.json;
          const outputData = run.data?.main?.[0]?.[0]?.json;

          // Detect Execute Workflow nodes and extract child execution ID
          let childExecutionId: string | null = null;
          if (nodeType.includes('executeWorkflow') || nodeType.includes('ExecuteWorkflow')) {
            // Child execution ID might be in the output data
            const outputJson = run.data?.main?.[0]?.[0]?.json as Record<string, unknown> | undefined;
            if (outputJson?.executionId) {
              childExecutionId = String(outputJson.executionId);
            }
          }

          traces.push({
            nodeName,
            nodeType,
            status,
            executionTime: run.executionTime ?? null,
            inputData: truncateJson(inputData),
            outputData: truncateJson(outputData),
            errorMessage: run.error?.message ?? null,
            errorStack: run.error?.stack ?? null,
            orderIndex: orderIndex++,
            childExecutionId,
          });
        }
      }

      return traces;
    },

    /**
     * Extract all child execution IDs from an execution trace
     */
    extractChildExecutions(execution: N8nExecutionWithData): ChildExecutionInfo[] {
      const children: ChildExecutionInfo[] = [];
      const runData = execution.data?.resultData?.runData;

      if (!runData) return children;

      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        const nodeInfo = execution.workflowData?.nodes?.find(n => n.name === nodeName);
        const nodeType = nodeInfo?.type || '';

        if (nodeType.includes('executeWorkflow') || nodeType.includes('ExecuteWorkflow')) {
          for (const run of nodeRuns) {
            const outputJson = run.data?.main?.[0]?.[0]?.json as Record<string, unknown> | undefined;
            if (outputJson?.executionId) {
              children.push({
                parentNodeName: nodeName,
                childExecutionId: String(outputJson.executionId),
                childWorkflowId: nodeInfo?.parameters?.workflowId as string | undefined,
              });
            }
          }
        }
      }

      return children;
    },

    /**
     * Test connection to n8n instance
     */
    async testConnection(): Promise<{
      success: boolean;
      message: string;
      workflowCount?: number;
      latency: number;
    }> {
      const start = Date.now();
      try {
        const workflows = await this.getWorkflows();
        return {
          success: true,
          message: 'Connection successful',
          workflowCount: workflows.length,
          latency: Date.now() - start,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed',
          latency: Date.now() - start,
        };
      }
    },

    // ============ Correlation Helper Methods ============

    /**
     * List workflows with optional filters (for correlator)
     */
    async listWorkflows(params: { active?: boolean; limit?: number } = {}): Promise<{
      data: N8nWorkflow[];
      nextCursor?: string;
    }> {
      const queryParams = new URLSearchParams();
      if (params.active !== undefined) queryParams.append('active', String(params.active));
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return request<{ data: N8nWorkflow[]; nextCursor?: string }>(`/workflows${query}`);
    },

    /**
     * Get workflow with full node data (for correlation)
     */
    async getWorkflowWithNodes(id: string): Promise<N8nWorkflowWithNodes> {
      return request<N8nWorkflowWithNodes>(`/workflows/${id}`);
    },

    /**
     * List executions with optional filters (for correlator)
     */
    async listExecutions(params: {
      workflowId?: string;
      status?: N8nExecution['status'];
      limit?: number;
      includeData?: boolean;
    } = {}): Promise<{ data: N8nExecutionWithData[]; nextCursor?: string }> {
      const queryParams = new URLSearchParams();
      if (params.workflowId) queryParams.append('workflowId', params.workflowId);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.includeData) queryParams.append('includeData', 'true');

      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return request<{ data: N8nExecutionWithData[]; nextCursor?: string }>(`/executions${query}`);
    },

    /**
     * Extract webhook paths from a workflow's nodes
     */
    extractWebhookPaths(workflow: N8nWorkflowWithNodes): string[] {
      const paths: string[] = [];
      if (!workflow.nodes) return paths;

      for (const node of workflow.nodes) {
        if (node.type === 'n8n-nodes-base.webhook') {
          const path = node.parameters?.path as string;
          if (path) {
            paths.push(path.startsWith('/') ? path : `/${path}`);
          }
        }
      }
      return paths;
    },

    /**
     * Check if workflow has executeWorkflowTrigger (can be called as sub-workflow)
     */
    hasSubWorkflowTrigger(workflow: N8nWorkflowWithNodes): boolean {
      if (!workflow.nodes) return false;
      return workflow.nodes.some(n => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
    },

    /**
     * Get execution duration in seconds
     */
    getExecutionDuration(execution: N8nExecution): number | null {
      if (!execution.startedAt || !execution.stoppedAt) return null;
      const start = new Date(execution.startedAt).getTime();
      const end = new Date(execution.stoppedAt).getTime();
      return (end - start) / 1000;
    },

    /**
     * Extract error details from execution
     */
    extractError(execution: N8nExecutionWithData): ExtractedError | null {
      if (execution.status !== 'error') return null;

      const resultData = execution.data?.resultData;
      if (resultData?.error) {
        return {
          node: resultData.error.node?.name || 'Unknown',
          message: resultData.error.message,
          stack: resultData.error.stack,
        };
      }

      // Check individual node errors
      const runData = resultData?.runData;
      if (runData) {
        for (const [nodeName, nodeRuns] of Object.entries(runData)) {
          for (const run of nodeRuns) {
            if (run.error) {
              return {
                node: nodeName,
                message: run.error.message,
                stack: run.error.stack,
              };
            }
          }
        }
      }

      return null;
    },

    /**
     * Extract HTTP request calls from execution data (for correlation)
     */
    extractHttpCalls(execution: N8nExecutionWithData): HttpCallInfo[] {
      const calls: HttpCallInfo[] = [];

      const runData = execution.data?.resultData?.runData;
      if (!runData) return calls;

      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        for (const run of nodeRuns) {
          // Check if this is an HTTP Request node by examining the output
          const mainOutput = run.data?.main?.[0]?.[0];
          if (mainOutput?.json) {
            const json = mainOutput.json as Record<string, unknown>;
            // HTTP nodes often have these fields in output
            if (json.url || json.requestUrl) {
              calls.push({
                nodeName,
                url: (json.url || json.requestUrl) as string,
                method: (json.method || 'GET') as string,
                timestamp: (run as { startTime?: number }).startTime || Date.now(),
                responseData: json,
              });
            }
          }
        }
      }

      return calls;
    },

    /**
     * Extract user/chat ID from execution input data (for correlation)
     */
    extractUserContext(execution: N8nExecutionWithData): UserContext {
      const result: UserContext = {};

      const runData = execution.data?.resultData?.runData;
      if (!runData) return result;

      // Check first few nodes for user context
      for (const nodeRuns of Object.values(runData)) {
        for (const run of nodeRuns) {
          const mainOutput = run.data?.main?.[0]?.[0];
          if (mainOutput?.json) {
            const json = mainOutput.json as Record<string, unknown>;
            if (json.user_id) result.userId = String(json.user_id);
            if (json.chat_id) result.chatId = String(json.chat_id);
            if (json.correlation_id) result.correlationId = String(json.correlation_id);
            if (json.response_id) result.responseId = String(json.response_id);

            // Check nested body
            const body = json.body as Record<string, unknown> | undefined;
            if (body) {
              if (body.user_id) result.userId = String(body.user_id);
              if (body.chat_id) result.chatId = String(body.chat_id);
              if (body.correlation_id) result.correlationId = String(body.correlation_id);
              if (body.response_id) result.responseId = String(body.response_id);
            }

            // If we found user context, return early
            if (result.userId || result.chatId) return result;
          }
        }
      }

      return result;
    },
  };
}

export type N8nClient = ReturnType<typeof createN8nClient>;
