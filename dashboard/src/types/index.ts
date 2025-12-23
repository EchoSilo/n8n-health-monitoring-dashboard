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
  successRate?: number; // percentage (0-100)
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

// User types (matches Prisma UserRole enum)
export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  provider: 'google' | 'github' | 'email';
  createdAt: Date;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: UserRole;
  invitedAt: Date;
  invitedBy: string;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  defaultTab: 'overview' | 'workflows' | 'errors';
  autoRefreshInterval: number;
  showOfflineServers: boolean;
  aiProvider: 'openai' | 'anthropic' | 'ollama';
  aiModel: string;
  aiCacheEnabled: boolean;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress: string;
  slackEnabled: boolean;
  slackWebhook: string;
  discordEnabled: boolean;
  discordWebhook: string;
  errorRateThreshold: number;
  offlineThreshold: number;
}

// Extended Server type for form
export interface ServerFormData {
  name: string;
  url: string;
  apiKey: string;
  pollingInterval: number;
  webhookEnabled: boolean;
  skipSslVerification: boolean;
}
