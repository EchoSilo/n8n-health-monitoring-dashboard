import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types for RCA data
export interface WhyStep {
  question: string;
  answer: string;
  evidence?: string;
}

export interface SafetyNetGap {
  name: string;
  existed: boolean;
  whyMissed: string;
}

export interface Recommendation {
  title: string;
  description: string;
  effort: 'quick_win' | 'medium_term' | 'long_term';
  nodeChanges?: string[];
  codeChanges?: string;
  priority: number;
}

export interface RCAData {
  id: string;
  errorId: string;
  fiveWhys: {
    symptom: string;
    whys: WhyStep[];
    rootCause: string;
  };
  gapAnalysis: {
    safetyNets: SafetyNetGap[];
  };
  recommendations: {
    quickWins: Recommendation[];
    mediumTerm: Recommendation[];
    longTerm: Recommendation[];
  };
  errorCategory: string;
  errorPattern: string;
  confidence: number;
  dataSource: 'live' | 'database';
  provider: string;
  model: string;
  skillsUsed: string[];
  tokenUsage: number | null;
  createdAt: string;
  updatedAt: string;
  cached?: boolean;
}

export type RCADepth = 'quick' | 'standard' | 'deep';

interface RCARequest {
  errorId: string;
  depth?: RCADepth;
  forceRefresh?: boolean;
}

/**
 * Fetch cached RCA analysis
 */
export function useRCA(errorId: string | null) {
  return useQuery({
    queryKey: ['rca', errorId],
    queryFn: async (): Promise<RCAData | null> => {
      if (!errorId) return null;

      const res = await fetch(`/api/ai/rca?errorId=${encodeURIComponent(errorId)}`);

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch RCA analysis');
      }

      return await res.json();
    },
    enabled: !!errorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Run RCA analysis
 */
export function useRunRCA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RCARequest): Promise<RCAData> => {
      const res = await fetch('/api/ai/rca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId: request.errorId,
          depth: request.depth || 'standard',
          forceRefresh: request.forceRefresh || false,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to run RCA analysis');
      }

      return await res.json();
    },
    onSuccess: (data, variables) => {
      // Update the RCA cache and invalidate to ensure query sync
      queryClient.setQueryData(['rca', variables.errorId], data);
      queryClient.invalidateQueries({ queryKey: ['rca', variables.errorId] });
    },
  });
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): {
  label: string;
  color: 'success' | 'warning' | 'error';
} {
  if (confidence >= 80) {
    return { label: 'High Confidence', color: 'success' };
  }
  if (confidence >= 60) {
    return { label: 'Medium Confidence', color: 'warning' };
  }
  return { label: 'Low Confidence', color: 'error' };
}

/**
 * Get depth description
 */
export function getDepthDescription(depth: RCADepth): string {
  switch (depth) {
    case 'quick':
      return 'Fast analysis using cached traces only';
    case 'standard':
      return 'Balanced analysis with live n8n data';
    case 'deep':
      return 'Thorough analysis with execution correlation';
  }
}
