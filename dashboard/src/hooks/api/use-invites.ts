import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: () => fetchApi<ApiInvite[]>('/api/invites'),
  });
}

export function useInvite(id: string) {
  return useQuery({
    queryKey: ['invites', id],
    queryFn: () => fetchApi<ApiInvite>(`/api/invites/${id}`),
    enabled: !!id,
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
