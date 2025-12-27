import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Check if mock mode is enabled via environment variable
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export interface ApiUser {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'member';
  image: string | null;
  emailVerified: string | null;
  createdAt: string;
}

// Mock data for demo mode
const MOCK_CURRENT_USER: ApiUser = {
  id: 'demo-user-1',
  name: 'Demo User',
  email: 'demo@example.com',
  role: 'admin',
  image: null,
  emailVerified: null,
  createdAt: new Date().toISOString(),
};

const MOCK_USERS: ApiUser[] = [
  MOCK_CURRENT_USER,
  {
    id: 'demo-user-2',
    name: 'Team Member',
    email: 'team@example.com',
    role: 'member',
    image: null,
    emailVerified: null,
    createdAt: new Date().toISOString(),
  },
];

interface UpdateProfileData {
  name?: string;
  email?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface UpdateUserData {
  name?: string;
  role?: 'admin' | 'member';
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

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_CURRENT_USER)
      : fetchApi<ApiUser>('/api/users/me'),
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_USERS)
      : fetchApi<ApiUser[]>('/api/users'),
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_USERS.find(u => u.id === id) || MOCK_CURRENT_USER)
      : fetchApi<ApiUser>(`/api/users/${id}`),
    enabled: !!id,
    staleTime: USE_MOCK_DATA ? Infinity : undefined,
    retry: USE_MOCK_DATA ? false : 3,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) =>
      fetchApi<ApiUser>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) =>
      fetchApi<{ message: string }>('/api/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      fetchApi<ApiUser>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/api/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
