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
  status: 'success' | 'error' | 'running' | 'waiting';
}

export interface N8nHealthResponse {
  status: 'ok' | 'error';
  message?: string;
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
      status?: 'success' | 'error' | 'running' | 'waiting';
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
  };
}

export type N8nClient = ReturnType<typeof createN8nClient>;
