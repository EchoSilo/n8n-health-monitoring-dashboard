import { useQuery } from '@tanstack/react-query';

// Check if mock mode is enabled via environment variable
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export interface ApiExecution {
  id: string;
  n8nId: string;
  status: 'success' | 'error' | 'running' | 'waiting' | 'cancelled';
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  mode: string;
  retryOf: string | null;
  workflow: {
    id: string;
    name: string;
    n8nId: string;
  };
  server: {
    id: string;
    name: string;
  };
}

interface ExecutionsResponse {
  executions: ApiExecution[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface ExecutionFilters {
  workflowId?: string;
  serverId?: string;
  status?: 'success' | 'error' | 'running' | 'waiting' | 'cancelled';
  limit?: number;
  offset?: number;
}

// Mock data for demo mode
const MOCK_EXECUTIONS: ApiExecution[] = [
  {
    id: 'demo-exec-1',
    n8nId: '12345',
    status: 'success',
    startedAt: new Date(Date.now() - 60000).toISOString(),
    finishedAt: new Date().toISOString(),
    duration: 2500,
    mode: 'trigger',
    retryOf: null,
    workflow: { id: 'demo-workflow-1', name: 'Email Automation', n8nId: 'wf-1' },
    server: { id: 'demo-server-1', name: 'Production Server' },
  },
  {
    id: 'demo-exec-2',
    n8nId: '12346',
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    duration: null,
    mode: 'webhook',
    retryOf: null,
    workflow: { id: 'demo-workflow-2', name: 'Data Sync', n8nId: 'wf-2' },
    server: { id: 'demo-server-1', name: 'Production Server' },
  },
];

const MOCK_RUNNING_RESPONSE: ExecutionsResponse = {
  executions: MOCK_EXECUTIONS.filter(e => e.status === 'running'),
  pagination: { total: 1, limit: 100, offset: 0, hasMore: false },
};

const MOCK_RECENT_RESPONSE: ExecutionsResponse = {
  executions: MOCK_EXECUTIONS,
  pagination: { total: 2, limit: 100, offset: 0, hasMore: false },
};

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export function useExecutions(filters?: ExecutionFilters) {
  const params = new URLSearchParams();
  if (filters?.workflowId) params.append('workflowId', filters.workflowId);
  if (filters?.serverId) params.append('serverId', filters.serverId);
  if (filters?.status) params.append('status', filters.status.toUpperCase());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = `/api/executions${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['executions', filters],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_RECENT_RESPONSE)
      : fetchApi<ExecutionsResponse>(url),
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

// Hook to get running executions count
export function useRunningExecutions() {
  return useQuery({
    queryKey: ['executions', 'running'],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_RUNNING_RESPONSE)
      : fetchApi<ExecutionsResponse>('/api/executions?status=RUNNING&limit=100'),
    refetchInterval: USE_MOCK_DATA ? false : 5000, // Disable refresh in demo mode
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

// Hook to get recent executions for metrics calculation
export function useRecentExecutions(limit = 100) {
  return useQuery({
    queryKey: ['executions', 'recent', limit],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_RECENT_RESPONSE)
      : fetchApi<ExecutionsResponse>(`/api/executions?limit=${limit}`),
    refetchInterval: USE_MOCK_DATA ? false : 30000, // Disable refresh in demo mode
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}
