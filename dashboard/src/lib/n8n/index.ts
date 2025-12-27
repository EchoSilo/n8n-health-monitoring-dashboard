/**
 * n8n Integration Module
 *
 * Core functionality adapted from n8n-debug-mcp for dashboard integration:
 * - ExecutionCorrelator: Traces execution chains across workflows
 * - Formatters: LLM-optimized output formatting
 * - Validators: Input validation utilities
 */

export { ExecutionCorrelator } from './correlator';
export type {
  CorrelationResult,
  WebhookMapping,
  CorrelationOptions,
} from './correlator';

export {
  formatExecutionTrace,
  formatWorkflowList,
  formatExecutionList,
  formatFailedExecutions,
  formatCorrelationTree,
  formatErrorAnalysis,
  analyzeErrorPattern,
  formatExecutionOneLine,
} from './formatter';
export type { FormatOptions } from './formatter';

export {
  validateExecutionId,
  validateWorkflowId,
  validateApiKey,
  validateBaseUrl,
} from './validator';
