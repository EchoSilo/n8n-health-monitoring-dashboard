/**
 * Types for Root Cause Analysis (RCA)
 */

import { ExecutionTraceContext, ExecutionChainContext } from './types';

// RCA Analysis Depth
export type RCADepth = 'quick' | 'standard' | 'deep';

// Single "Why" step in 5 Whys analysis
export interface WhyStep {
  question: string;      // "Why did X happen?"
  answer: string;        // "Because Y"
  evidence?: string;     // Supporting data from traces
}

// 5 Whys Analysis Result
export interface FiveWhysAnalysis {
  symptom: string;           // Initial error symptom
  whys: WhyStep[];           // The chain of whys (typically 3-5)
  rootCause: string;         // Final root cause determination
}

// Gap Analysis - safety nets that should have existed
export interface SafetyNetGap {
  name: string;              // e.g., "Input Validation", "Retry Logic"
  existed: boolean;          // Was it present?
  whyMissed: string;         // Why it wasn't there or didn't work
}

export interface GapAnalysis {
  safetyNets: SafetyNetGap[];
}

// Recommendation with effort estimate
export type RecommendationEffort = 'quick_win' | 'medium_term' | 'long_term';

export interface Recommendation {
  title: string;
  description: string;
  effort: RecommendationEffort;
  nodeChanges?: string[];    // Specific nodes to modify
  codeChanges?: string;      // Code snippet if applicable
  priority: number;          // 1 = highest priority
}

// Categorized Recommendations
export interface CategorizedRecommendations {
  quickWins: Recommendation[];      // < 1 hour to implement
  mediumTerm: Recommendation[];     // 1 day to implement
  longTerm: Recommendation[];       // 1+ week to implement
}

// Full RCA Result
export interface RCAResult {
  // 5 Whys Analysis
  fiveWhys: FiveWhysAnalysis;

  // Gap Analysis
  gapAnalysis: GapAnalysis;

  // Recommendations by effort
  recommendations: CategorizedRecommendations;

  // Error Classification
  errorCategory: string;     // e.g., "Connection", "Authentication", "Data Validation"
  errorPattern: string;      // e.g., "ECONNREFUSED", "401", "Missing Field"

  // Metadata
  confidence: number;        // 0-100
  dataSource: 'live' | 'database';  // Where trace data came from
  provider: string;          // AI provider used
  model: string;             // Model used
  skillsUsed: string[];      // Skills applied

  // Token usage
  tokenUsage?: number;

  // Raw response for debugging
  rawResponse?: unknown;
}

// RCA Context - input for RCA engine
export interface RCAContext {
  // Error info
  errorId: string;
  errorMessage: string;
  stackTrace: string | null;
  severity: string;
  nodeName: string | null;
  nodeType: string | null;

  // Workflow context
  workflowId: string;
  workflowName: string;
  serverName: string;

  // Timing
  timestamp: Date;

  // Execution data
  traces: ExecutionTraceContext[];
  executionChain?: ExecutionChainContext;

  // Correlated data from ExecutionCorrelator
  correlatedExecutions?: Array<{
    workflowName: string;
    status: string;
    confidence: number;
    matchMethod: string;  // How the correlation was made
    errorMessage?: string;
  }>;

  // Formatted traces (LLM-optimized)
  formattedTrace?: string;
  formattedCorrelationTree?: string;
}

// RCA Request options
export interface RCAOptions {
  depth: RCADepth;
  forceRefresh?: boolean;
  useSkills?: boolean;
}

// Database model shape (for Prisma)
export interface RCAAnalysisRecord {
  id: string;
  errorId: string;

  // 5 Whys
  symptom: string;
  fiveWhysData: WhyStep[];
  rootCause: string;

  // Gap Analysis
  gapAnalysisData: SafetyNetGap[];

  // Recommendations
  quickWins: Recommendation[];
  mediumTerm: Recommendation[];
  longTerm: Recommendation[];

  // Classification
  errorCategory: string;
  errorPattern: string;

  // Metadata
  confidence: number;
  dataSource: string;
  executionChain: ExecutionChainContext | null;

  // AI
  provider: string;
  model: string;
  skillsUsed: string[];
  tokenUsage: number | null;
  rawResponse: unknown | null;

  createdAt: Date;
  updatedAt: Date;
}
