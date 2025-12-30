'use client';

/**
 * Organization Context
 *
 * Provides organization and license info to all components.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useSession } from 'next-auth/react';
import type { OrganizationInfo, LicenseInfo, FeatureFlag, LimitedResource } from '@/lib/license/types';
import { hasFeatureAccess, checkLimit, TIER_LIMITS } from '@/lib/license/tier-limits';

interface OrganizationContextValue {
  // Organization
  organization: OrganizationInfo | null;
  organizations: OrganizationInfo[];
  isLoading: boolean;
  error: string | null;

  // License
  license: LicenseInfo | null;

  // Workspace (for agency clients)
  workspace: { id: string; name: string } | null;

  // Actions
  switchOrganization: (orgId: string) => Promise<void>;
  switchWorkspace: (workspaceId: string | null) => Promise<void>;
  refreshOrganization: () => Promise<void>;

  // License helpers
  hasFeature: (feature: FeatureFlag) => boolean;
  canAdd: (resource: LimitedResource) => { allowed: boolean; message?: string };
  getUsage: (resource: LimitedResource) => { current: number; max: number; percentage: number };
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { data: session, status } = useSession();
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization data
  const fetchOrganization = useCallback(async () => {
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch current organization and license
      const response = await fetch('/api/organizations/current');
      if (!response.ok) {
        if (response.status === 404) {
          // User has no organization yet
          setOrganization(null);
          setLicense(null);
          return;
        }
        throw new Error('Failed to fetch organization');
      }

      const data = await response.json();
      setOrganization(data.organization);
      setLicense(data.license);
      setOrganizations(data.organizations || []);

      if (data.workspace) {
        setWorkspace(data.workspace);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  // Switch organization
  const switchOrganization = useCallback(async (orgId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch organization');
      }

      // Refresh data
      await fetchOrganization();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrganization]);

  // Switch workspace
  const switchWorkspace = useCallback(async (workspaceId: string | null) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/organizations/switch-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch workspace');
      }

      // Refresh data
      await fetchOrganization();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrganization]);

  // Check feature access
  const hasFeature = useCallback(
    (feature: FeatureFlag): boolean => {
      const tier = license?.tier || 'COMMUNITY';
      return hasFeatureAccess(tier, feature);
    },
    [license]
  );

  // Check if can add resource
  const canAdd = useCallback(
    (resource: LimitedResource): { allowed: boolean; message?: string } => {
      if (!license) {
        // Default to community limits
        const result = checkLimit('COMMUNITY', resource, 0);
        return { allowed: result.allowed, message: result.message };
      }

      const usage = license.usage[resource];
      const result = checkLimit(license.tier, resource, usage);
      return { allowed: result.allowed, message: result.message };
    },
    [license]
  );

  // Get usage stats
  const getUsage = useCallback(
    (resource: LimitedResource): { current: number; max: number; percentage: number } => {
      const tier = license?.tier || 'COMMUNITY';
      const limits = TIER_LIMITS[tier];
      const current = license?.usage[resource] || 0;

      const maxMap: Record<LimitedResource, number> = {
        servers: limits.maxServers,
        workflows: limits.maxWorkflows,
        workspaces: limits.maxWorkspaces,
        members: limits.maxMembers,
      };

      const max = maxMap[resource];
      const percentage = max === -1 ? 0 : max === 0 ? 100 : (current / max) * 100;

      return { current, max, percentage: Math.min(percentage, 100) };
    },
    [license]
  );

  const value = useMemo(
    (): OrganizationContextValue => ({
      organization,
      organizations,
      isLoading,
      error,
      license,
      workspace,
      switchOrganization,
      switchWorkspace,
      refreshOrganization: fetchOrganization,
      hasFeature,
      canAdd,
      getUsage,
    }),
    [
      organization,
      organizations,
      isLoading,
      error,
      license,
      workspace,
      switchOrganization,
      switchWorkspace,
      fetchOrganization,
      hasFeature,
      canAdd,
      getUsage,
    ]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

/**
 * Hook to check if user has access to a feature
 */
export function useFeatureAccess(feature: FeatureFlag): boolean {
  const { hasFeature } = useOrganization();
  return hasFeature(feature);
}

/**
 * Hook to check resource limits
 */
export function useResourceLimit(resource: LimitedResource) {
  const { canAdd, getUsage } = useOrganization();
  return {
    canAdd: canAdd(resource),
    usage: getUsage(resource),
  };
}
