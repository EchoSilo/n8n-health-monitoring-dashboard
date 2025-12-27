import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Check if mock mode is enabled via environment variable
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export interface ApiInvite {
  id: string;
  type: 'email' | 'code';
  email: string | null;
  code: string | null;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
}

interface CreateEmailInviteData {
  type: 'email';
  email: string;
  role?: 'admin' | 'member';
  expiresInDays?: number;
}

interface CreateCodeInviteData {
  type: 'code';
  role?: 'admin' | 'member';
  maxUses?: number;
  expiresInDays?: number;
}

type CreateInviteData = CreateEmailInviteData | CreateCodeInviteData;

interface CreateInviteResponse extends ApiInvite {
  inviteUrl?: string;
}

// Mock data for demo mode (empty array - no pending invites in demo)
const MOCK_INVITES: ApiInvite[] = [];

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

export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_INVITES)
      : fetchApi<ApiInvite[]>('/api/invites'),
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useInvite(id: string) {
  return useQuery({
    queryKey: ['invites', id],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_INVITES.find(i => i.id === id) || null)
      : fetchApi<ApiInvite>(`/api/invites/${id}`),
    enabled: !!id,
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInviteData) =>
      fetchApi<CreateInviteResponse>('/api/invites', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/api/invites/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}
