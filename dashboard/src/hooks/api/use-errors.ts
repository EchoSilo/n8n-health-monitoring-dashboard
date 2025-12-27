import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ApiErrorLog {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  nodeType: string | null;
  nodeName: string | null;
  executionId: string | null;
  stackTrace: string | null;
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
  execution?: {
    id: string;
    hasFullTrace: boolean;
    traces?: ExecutionTrace[];
  };
  hasAiAnalysis: boolean;
  hasRca: boolean;
  aiConfidence?: number;
  aiAnalysis?: ApiAIAnalysis | null;
}

export interface ExecutionTrace {
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
}

export interface SimilarIssue {
  id: string;
  workflow: string;
  resolution: string;
}

export interface ExecutionSummary {
  id: string;
  n8nId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  errorMessage?: string;
}

export interface ExecutionChainContext {
  parent?: ExecutionSummary;
  children?: ExecutionSummary[];
  failedBranch?: ExecutionSummary[];
  depth: number;
}

export interface ApiAIAnalysis {
  id: string;
  errorId: string;
  provider: string;
  model: string;
  confidence: number;
  rootCause: string;
  suggestedFix: string[];
  similarIssues: SimilarIssue[];
  tokenUsage: number | null;
  createdAt: string;
  cached?: boolean;
  investigation?: {
    investigatedLive?: boolean;
    mainTracesCount?: number;
    childExecutionsCount?: number;
    correlatedExecutionsCount?: number;
    investigationError?: string;
  };
  executionChain?: ExecutionChainContext | null;
}

export interface TraceResponse {
  source: 'database' | 'n8n' | 'n8n-matched' | 'none' | 'error';
  executionId?: string;
  message?: string;
  traces: ExecutionTrace[];
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

  return data;
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

export function useErrorWithAnalysis(id: string) {
  return useQuery({
    queryKey: ['errors', id, 'full'],
    queryFn: () => fetchApi<ApiErrorLog>(`/api/errors/${id}?include=analysis,traces`),
    enabled: !!id,
  });
}

export function useAnalyzeError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ errorId, forceRefresh, deepInvestigate }: {
      errorId: string;
      forceRefresh?: boolean;
      deepInvestigate?: boolean;
    }) =>
      fetchApi<ApiAIAnalysis>('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ errorId, forceRefresh, deepInvestigate }),
      }),
    onSuccess: (_, { errorId }) => {
      queryClient.invalidateQueries({ queryKey: ['errors', errorId] });
      queryClient.invalidateQueries({ queryKey: ['errors'] });
    },
  });
}

export function useErrorTrace(errorId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['errors', errorId, 'trace'],
    queryFn: () => fetchApi<TraceResponse>(`/api/errors/${errorId}/trace`),
    enabled: !!errorId && enabled,
  });
}

export function useRefreshTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (errorId: string) =>
      fetchApi<TraceResponse>(`/api/errors/${errorId}/trace`, {
        method: 'POST',
      }),
    onSuccess: (_, errorId) => {
      queryClient.invalidateQueries({ queryKey: ['errors', errorId, 'trace'] });
      queryClient.invalidateQueries({ queryKey: ['errors', errorId] });
    },
  });
}
