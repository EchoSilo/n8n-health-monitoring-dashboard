import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ApiWorkflow {
  id: string;
  n8nId: string;
  name: string;
  active: boolean;
  status: 'active' | 'inactive' | 'running' | 'failed';
  lastExecution: string | null;
  executionCount: number;
  avgExecTime: number;
  serverId: string;
  serverName: string;
  createdAt: string;
  updatedAt: string;
  totalExecutions: number;
  unresolvedErrors: number;
}

interface WorkflowsResponse {
  workflows: ApiWorkflow[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface WorkflowFilters {
  serverId?: string;
  status?: string;
  search?: string;
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

  return data.data;
}

export function useWorkflows(filters?: WorkflowFilters) {
  const params = new URLSearchParams();
  if (filters?.serverId) params.append('serverId', filters.serverId);
  if (filters?.status) params.append('status', filters.status.toUpperCase());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = `/api/workflows${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['workflows', filters],
    queryFn: () => fetchApi<WorkflowsResponse>(url),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => fetchApi<ApiWorkflow>(`/api/workflows/${id}`),
    enabled: !!id,
  });
}

export function useActivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/api/workflows/${id}/activate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeactivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/api/workflows/${id}/deactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
