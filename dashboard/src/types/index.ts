// Server types
export type ServerStatus = 'online' | 'offline' | 'degraded';

export interface Server {
  id: string;
  name: string;
  url: string;
  status: ServerStatus;
  workflowCount: number;
  errorCount: number;
  lastPing: number; // in milliseconds
}

// Workflow types
export type WorkflowStatus = 'active' | 'inactive' | 'running' | 'failed';

export interface Workflow {
  id: string;
  n8nId: string;
  name: string;
  serverId: string;
  status: WorkflowStatus;
  lastExecution: Date | null;
  executionTime: number; // in milliseconds
  executionCount: number;
}

// Error types
export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface ErrorLog {
  id: string;
  workflowId: string;
  serverId: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  stackTrace?: string;
  hasAIAnalysis: boolean;
}

// AI Analysis types
export interface AIAnalysis {
  id: string;
  errorId: string;
  confidence: number; // percentage
  rootCause: string;
  suggestedFix: string[];
  similarIssues: SimilarIssue[];
  createdAt: Date;
}

export interface SimilarIssue {
  id: string;
  workflow: string;
  resolution: string;
}

// Metrics types
export interface DashboardMetrics {
  totalWorkflows: number;
  activeExecutions: number;
  errorRate: number; // percentage
  avgExecutionTime: number; // in milliseconds
}

// Chat types
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

// Filter types
export interface FilterState {
  searchQuery: string;
  serverFilter: string;
  statusFilter: string;
}
