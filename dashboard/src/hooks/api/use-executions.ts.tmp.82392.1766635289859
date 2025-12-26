import { useQuery } from '@tanstack/react-query';

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
    queryFn: () => fetchApi<ExecutionsResponse>(url),
  });
}

// Hook to get running executions count
export function useRunningExecutions() {
  return useQuery({
    queryKey: ['executions', 'running'],
    queryFn: () => fetchApi<ExecutionsResponse>('/api/executions?status=RUNNING&limit=100'),
    refetchInterval: 5000, // Refresh every 5 seconds for live data
  });
}

// Hook to get recent executions for metrics calculation
export function useRecentExecutions(limit = 100) {
  return useQuery({
    queryKey: ['executions', 'recent', limit],
    queryFn: () => fetchApi<ExecutionsResponse>(`/api/executions?limit=${limit}`),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
