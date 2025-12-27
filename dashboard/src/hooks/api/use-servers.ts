import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

// Check if mock mode is enabled via environment variable
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export interface ApiServer {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  lastChecked: string | null;
  pollingInterval: number;
  enableWebhook: boolean;
  skipSSL: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  workflowCount: number;
  errorCount: number;
}

interface CreateServerData {
  name: string;
  url: string;
  apiKey: string;
  pollingInterval?: number;
  enableWebhook?: boolean;
  skipSSL?: boolean;
}

interface UpdateServerData {
  name?: string;
  url?: string;
  apiKey?: string;
  pollingInterval?: number;
  enableWebhook?: boolean;
  skipSSL?: boolean;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  workflowCount?: number;
  latency: number;
  status: string;
}

interface SyncResult {
  message: string;
  stats: {
    total: number;
    created: number;
    updated: number;
    deactivated: number;
  };
}

// Mock data for demo mode
const MOCK_SERVERS: ApiServer[] = [
  {
    id: 'demo-server-1',
    name: 'Production Server',
    url: 'https://n8n-prod.example.com',
    status: 'online',
    lastChecked: new Date().toISOString(),
    pollingInterval: 60,
    enableWebhook: false,
    skipSSL: false,
    createdById: 'demo-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflowCount: 45,
    errorCount: 2,
  },
  {
    id: 'demo-server-2',
    name: 'Staging Server',
    url: 'https://n8n-staging.example.com',
    status: 'online',
    lastChecked: new Date().toISOString(),
    pollingInterval: 120,
    enableWebhook: false,
    skipSSL: false,
    createdById: 'demo-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflowCount: 28,
    errorCount: 0,
  },
  {
    id: 'demo-server-3',
    name: 'Development Server',
    url: 'https://n8n-dev.example.com',
    status: 'degraded',
    lastChecked: new Date().toISOString(),
    pollingInterval: 300,
    enableWebhook: false,
    skipSSL: true,
    createdById: 'demo-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflowCount: 12,
    errorCount: 5,
  },
];

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

export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_SERVERS)
      : fetchApi<ApiServer[]>('/api/servers'),
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ['servers', id],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_SERVERS.find(s => s.id === id) || MOCK_SERVERS[0])
      : fetchApi<ApiServer>(`/api/servers/${id}`),
    enabled: !!id,
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServerData) =>
      fetchApi<ApiServer>('/api/servers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServerData }) =>
      fetchApi<ApiServer>(`/api/servers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['servers', id] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/api/servers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useTestServerConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<TestConnectionResult>(`/api/servers/${id}/test`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useSyncServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<SyncResult>(`/api/servers/${id}/sync`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['errors'] });
    },
  });
}

/**
 * Auto-sync hook that automatically syncs all servers at their configured polling interval.
 * Uses the pollingInterval from each server's settings.
 * @param enabled - Whether auto-sync is enabled (default: true)
 * @param defaultInterval - Default sync interval in seconds if server doesn't specify one (default: 60)
 */
export function useAutoSync(enabled: boolean = true, defaultInterval: number = 60) {
  const queryClient = useQueryClient();
  const { data: servers } = useServers();
  const syncingRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const syncServer = useCallback(async (serverId: string) => {
    // Skip syncing in demo mode
    if (USE_MOCK_DATA) return;

    // Skip if already syncing this server
    if (syncingRef.current.has(serverId)) return;

    try {
      syncingRef.current.add(serverId);
      await fetchApi<SyncResult>(`/api/servers/${serverId}/sync`, {
        method: 'POST',
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['errors'] });
    } catch (error) {
      console.error(`Auto-sync failed for server ${serverId}:`, error);
    } finally {
      syncingRef.current.delete(serverId);
    }
  }, [queryClient]);

  useEffect(() => {
    // Skip setting up timers in demo mode
    if (USE_MOCK_DATA || !enabled || !servers || servers.length === 0) {
      // Clear all timers when disabled or in demo mode
      timersRef.current.forEach((timer) => clearInterval(timer));
      timersRef.current.clear();
      return;
    }

    // Set up polling for each server
    servers.forEach((server) => {
      // Skip if already has a timer
      if (timersRef.current.has(server.id)) return;

      // Use server's polling interval or default (convert to milliseconds)
      const intervalMs = (server.pollingInterval || defaultInterval) * 1000;

      // Do an initial sync
      syncServer(server.id);

      // Set up recurring sync
      const timer = setInterval(() => {
        syncServer(server.id);
      }, intervalMs);

      timersRef.current.set(server.id, timer);
    });

    // Clean up timers for removed servers
    timersRef.current.forEach((timer, serverId) => {
      if (!servers.find((s) => s.id === serverId)) {
        clearInterval(timer);
        timersRef.current.delete(serverId);
      }
    });

    // Cleanup on unmount
    return () => {
      timersRef.current.forEach((timer) => clearInterval(timer));
      timersRef.current.clear();
    };
  }, [enabled, servers, syncServer, defaultInterval]);

  return {
    isSyncing: syncingRef.current.size > 0,
    syncNow: (serverId: string) => syncServer(serverId),
  };
}
