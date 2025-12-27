// AI Analysis Types

export interface ExecutionTraceContext {
  nodeName: string;
  nodeType: string;
  status: 'success' | 'error' | 'skipped';
  executionTime: number | null;
  inputData: string | null;
  outputData: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  orderIndex: number;
}

// Execution summary for chain visualization
export interface ExecutionSummary {
  id: string;
  n8nId: string;
  workflowName: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  duration: number | null;
  errorMessage?: string;
}

// Execution chain context for sub-workflow correlation
export interface ExecutionChainContext {
  parent?: ExecutionSummary;
  children?: ExecutionSummary[];
  failedBranch?: ExecutionSummary[]; // Path from root to actual failure
  depth: number;
}

export interface ErrorAnalysisContext {
  errorId: string;
  errorMessage: string;
  stackTrace: string | null;
  severity: string;
  nodeName: string | null;
  nodeType: string | null;
  workflowName: string;
  serverName: string;
  timestamp: Date;
  traces: ExecutionTraceContext[];
  // Sub-workflow correlation
  executionChain?: ExecutionChainContext;
}

export interface SimilarIssue {
  id: string;
  workflow: string;
  resolution: string;
}

export interface AIAnalysisResult {
  confidence: number; // 0-100
  rootCause: string;
  suggestedFix: string[];
  similarIssues: SimilarIssue[];
  rawResponse?: unknown;
  tokenUsage?: number;
}

export interface AIProvider {
  name: string;
  model: string;
  analyze(context: ErrorAnalysisContext): Promise<AIAnalysisResult>;
}

export type AIProviderType = 'openai' | 'anthropic' | 'ollama';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
