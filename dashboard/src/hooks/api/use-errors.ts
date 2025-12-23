import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ApiErrorLog {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  nodeType: string | null;
  nodeName: string | null;
  executionId: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  timestamp: string;
  workflow: {
    id: string;
    name: string;
    n8nId: string;
  };
  server: {
    id: string;
    name: string;
  };
  hasAiAnalysis: boolean;
  aiConfidence?: number;
}

interface ErrorsResponse {
  errors: ApiErrorLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface ErrorFilters {
  workflowId?: string;
  serverId?: string;
  severity?: string;
  resolved?: boolean;
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

export function useErrors(filters?: ErrorFilters) {
  const params = new URLSearchParams();
  if (filters?.workflowId) params.append('workflowId', filters.workflowId);
  if (filters?.serverId) params.append('serverId', filters.serverId);
  if (filters?.severity) params.append('severity', filters.severity.toUpperCase());
  if (filters?.resolved !== undefined) params.append('resolved', filters.resolved.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = `/api/errors${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['errors', filters],
    queryFn: () => fetchApi<ErrorsResponse>(url),
  });
}

export function useError(id: string) {
  return useQuery({
    queryKey: ['errors', id],
    queryFn: () => fetchApi<ApiErrorLog>(`/api/errors/${id}`),
    enabled: !!id,
  });
}

export function useResolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      fetchApi<ApiErrorLog>(`/api/errors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errors'] });
    },
  });
}
