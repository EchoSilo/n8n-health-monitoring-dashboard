'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  List,
  ListItem,
  ListItemButton,
  Typography,
  Chip,
  Button,
  Drawer,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  Tooltip,
  Skeleton,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DataObjectIcon from '@mui/icons-material/DataObject';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import HistoryIcon from '@mui/icons-material/History';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { ErrorLog, ErrorSeverity, AIAnalysis } from '@/types';
import { useErrors, useResolveError, useErrorWithAnalysis, useAnalyzeError, useErrorTrace, useRefreshTrace, ApiErrorLog, ExecutionTrace, ApiAIAnalysis, ExecutionChainContext, ExecutionSummary, SimilarIssue } from '@/hooks/api';
import { RCASection } from './RCASection';

// Extended error type for display
interface DisplayError {
  id: string;
  workflowId: string;
  workflowName: string;
  serverId: string;
  serverName: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  stackTrace?: string;
  hasAIAnalysis: boolean;
  hasRca: boolean;
}

interface ErrorLogPanelProps {
  limit?: number;
  selectedServerId?: string | null;
  errors?: DisplayError[]; // Optional: pass pre-fetched data
  onViewAll?: () => void; // Callback when "View All" button is clicked
}

// Transform API error to display format
function transformApiError(e: ApiErrorLog): DisplayError {
  return {
    id: e.id,
    workflowId: e.workflow.id,
    workflowName: e.workflow.name,
    serverId: e.server.id,
    serverName: e.server.name,
    message: e.message,
    severity: e.severity,
    timestamp: new Date(e.timestamp),
    hasAIAnalysis: e.hasAiAnalysis,
    hasRca: e.hasRca,
  };
}

// Node status configuration
const nodeStatusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactElement }> = {
  success: {
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
  },
  error: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: <ErrorIcon sx={{ fontSize: 14 }} />,
  },
  skipped: {
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.1)',
    icon: <PlayArrowIcon sx={{ fontSize: 14, opacity: 0.5 }} />,
  },
};

// Execution Trace Section Component
function ExecutionTraceSection({
  traces,
  isLoading,
  collapseTrigger,
  expandTrigger,
}: {
  traces?: ExecutionTrace[];
  isLoading?: boolean;
  collapseTrigger?: number;
  expandTrigger?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Respond to collapse trigger
  useEffect(() => {
    if (collapseTrigger && collapseTrigger > 0) {
      setExpanded(false);
      setExpandedNodes(new Set());
    }
  }, [collapseTrigger]);

  // Respond to expand trigger
  useEffect(() => {
    if (expandTrigger && expandTrigger > 0) {
      setExpanded(true);
    }
  }, [expandTrigger]);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const truncateJson = (json: string | null, maxLength = 500) => {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted.length > maxLength) {
        return formatted.slice(0, maxLength) + '\n... (truncated)';
      }
      return formatted;
    } catch {
      return json.length > maxLength ? json.slice(0, maxLength) + '...' : json;
    }
  };

  if (isLoading) {
    return (
      <Card sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
        </Box>
      </Card>
    );
  }

  if (!traces || traces.length === 0) {
    return (
      <Card sx={{ mb: 3, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <DataObjectIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No execution trace available
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Sync the server to capture trace data for new executions
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrowIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Execution Trace
          </Typography>
          <Chip
            size="small"
            label={`${traces.length} nodes`}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 0 }}>
          {traces.map((trace, index) => {
            const status = nodeStatusConfig[trace.status] || nodeStatusConfig.skipped;
            const isNodeExpanded = expandedNodes.has(trace.id);
            const hasData = trace.inputData || trace.outputData || trace.errorMessage;

            return (
              <Box key={trace.id}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: hasData ? 'pointer' : 'default',
                    '&:hover': hasData ? { bgcolor: 'action.hover' } : {},
                    borderLeft: 4,
                    borderLeftColor: status.color,
                  }}
                  onClick={() => hasData && toggleNodeExpand(trace.id)}
                >
                  {/* Order number */}
                  <Typography
                    variant="caption"
                    fontFamily="monospace"
                    sx={{
                      width: 20,
                      textAlign: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    {trace.orderIndex}
                  </Typography>

                  {/* Status icon */}
                  <Box
                    sx={{
                      p: 0.5,
                      borderRadius: 1,
                      bgcolor: status.bgColor,
                      color: status.color,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {status.icon}
                  </Box>

                  {/* Node name and type */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {trace.nodeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {trace.nodeType.replace('n8n-nodes-base.', '')}
                    </Typography>
                  </Box>

                  {/* Duration */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {formatDuration(trace.executionTime)}
                    </Typography>
                  </Box>

                  {/* Expand indicator */}
                  {hasData && (
                    <ChevronRightIcon
                      sx={{
                        fontSize: 18,
                        color: 'text.disabled',
                        transform: isNodeExpanded ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  )}
                </Box>

                {/* Expanded node details */}
                <Collapse in={isNodeExpanded}>
                  <Box
                    sx={{
                      mx: 2,
                      mb: 1.5,
                      ml: 6,
                      p: 1.5,
                      bgcolor: 'grey.900',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: 'grey.300',
                      overflow: 'auto',
                      maxHeight: 200,
                    }}
                  >
                    {trace.errorMessage && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="error.light" fontWeight={600}>
                          Error:
                        </Typography>
                        <Box component="pre" sx={{ m: 0, mt: 0.5, whiteSpace: 'pre-wrap', color: '#f87171' }}>
                          {trace.errorMessage}
                        </Box>
                      </Box>
                    )}
                    {trace.inputData && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="info.light" fontWeight={600}>
                          Input:
                        </Typography>
                        <Box component="pre" sx={{ m: 0, mt: 0.5, whiteSpace: 'pre-wrap' }}>
                          {truncateJson(trace.inputData)}
                        </Box>
                      </Box>
                    )}
                    {trace.outputData && (
                      <Box>
                        <Typography variant="caption" color="success.light" fontWeight={600}>
                          Output:
                        </Typography>
                        <Box component="pre" sx={{ m: 0, mt: 0.5, whiteSpace: 'pre-wrap' }}>
                          {truncateJson(trace.outputData)}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>

                {index < traces.length - 1 && <Divider />}
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Card>
  );
}

// Execution Chain Visualization Component
function ExecutionChainSection({
  chain,
  collapseTrigger,
  expandTrigger,
}: {
  chain: ExecutionChainContext;
  collapseTrigger?: number;
  expandTrigger?: number;
}) {
  const [expanded, setExpanded] = useState(true);

  // Respond to collapse trigger
  useEffect(() => {
    if (collapseTrigger && collapseTrigger > 0) {
      setExpanded(false);
    }
  }, [collapseTrigger]);

  // Respond to expand trigger
  useEffect(() => {
    if (expandTrigger && expandTrigger > 0) {
      setExpanded(true);
    }
  }, [expandTrigger]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'error':
        return '#ef4444';
      case 'success':
        return '#10b981';
      default:
        return '#94a3b8';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!chain.failedBranch?.length && !chain.children?.length) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, border: 1, borderColor: 'rgba(251, 146, 60, 0.3)' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeIcon sx={{ color: '#fb923c' }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Execution Chain
          </Typography>
          <Chip
            size="small"
            label={`Depth: ${chain.depth}`}
            sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(251, 146, 60, 0.1)' }}
          />
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          {/* Failed Branch Path */}
          {chain.failedBranch && chain.failedBranch.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                FAILURE PATH (trace to root cause)
              </Typography>
              {chain.failedBranch.map((exec, index) => {
                const isLast = index === chain.failedBranch!.length - 1;
                return (
                  <Box
                    key={exec.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      ml: index * 2,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: getStatusColor(exec.status),
                        mt: 0.8,
                        mr: 1,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {exec.workflowName}
                        </Typography>
                        {isLast && (
                          <Chip
                            size="small"
                            label="ROOT CAUSE"
                            color="error"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        )}
                      </Box>
                      {exec.errorMessage && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{
                            display: 'block',
                            mt: 0.25,
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {exec.errorMessage}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        {formatDuration(exec.duration)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Child Executions */}
          {chain.children && chain.children.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                CHILD WORKFLOWS ({chain.children.length})
              </Typography>
              {chain.children.map((child) => (
                <Box
                  key={child.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    mb: 0.5,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: getStatusColor(child.status),
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {child.workflowName}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {formatDuration(child.duration)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

// AI Analysis Section Component
function AIAnalysisSection({
  errorId,
  analysis,
  isLoading,
  collapseTrigger,
  expandTrigger,
}: {
  errorId: string;
  analysis?: ApiAIAnalysis | null;
  isLoading?: boolean;
  collapseTrigger?: number;
  expandTrigger?: number;
}) {
  const analyzeError = useAnalyzeError();
  const [expanded, setExpanded] = useState(true);

  // Respond to collapse trigger
  useEffect(() => {
    if (collapseTrigger && collapseTrigger > 0) {
      setExpanded(false);
    }
  }, [collapseTrigger]);

  // Respond to expand trigger
  useEffect(() => {
    if (expandTrigger && expandTrigger > 0) {
      setExpanded(true);
    }
  }, [expandTrigger]);

  const displayAnalysis = analysis;

  const handleAnalyze = async (deep: boolean = false, forceRefresh: boolean = false) => {
    await analyzeError.mutateAsync({ errorId, deepInvestigate: deep, forceRefresh });
  };

  const isAnalyzing = analyzeError.isPending;

  if (isLoading) {
    return (
      <Card sx={{ mb: 3, border: 1, borderColor: 'rgba(139, 92, 246, 0.3)' }}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="rectangular" height={150} sx={{ mt: 2 }} />
        </Box>
      </Card>
    );
  }

  if (!displayAnalysis) {
    return (
      <Card
        sx={{
          mb: 3,
          border: 1,
          borderColor: 'rgba(139, 92, 246, 0.3)',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(139, 92, 246, 0.05)'
              : 'rgba(139, 92, 246, 0.03)',
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <AutoAwesomeIcon sx={{ fontSize: 40, color: '#8b5cf6', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            AI Root Cause Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Get intelligent insights into the error cause and suggested fixes
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={isAnalyzing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={() => handleAnalyze(false)}
              disabled={isAnalyzing}
              sx={{
                bgcolor: '#8b5cf6',
                '&:hover': { bgcolor: '#7c3aed' },
                textTransform: 'none',
                px: 3,
              }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
            <Tooltip title="Fetch live data from n8n server for deeper analysis including sub-workflows">
              <Button
                variant="outlined"
                startIcon={isAnalyzing ? <CircularProgress size={16} /> : <AccountTreeIcon />}
                onClick={() => handleAnalyze(true)}
                disabled={isAnalyzing}
                sx={{
                  borderColor: '#fb923c',
                  color: '#fb923c',
                  '&:hover': { borderColor: '#ea580c', bgcolor: 'rgba(251, 146, 60, 0.08)' },
                  textTransform: 'none',
                }}
              >
                Deep Investigate
              </Button>
            </Tooltip>
          </Box>
          {analyzeError.error && (
            <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
              {analyzeError.error.message}
            </Alert>
          )}
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        mb: 3,
        border: 1,
        borderColor: 'rgba(139, 92, 246, 0.5)',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(139, 92, 246, 0.1)'
            : 'rgba(139, 92, 246, 0.08)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.15)',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'rgba(139, 92, 246, 0.3)',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.05)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#8b5cf6' }} />
          <Typography variant="subtitle1" fontWeight={600} color="secondary.main">
            AI Root Cause Analysis
          </Typography>
          {(displayAnalysis as ApiAIAnalysis).cached && (
            <Chip
              size="small"
              label="Cached"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: 'rgba(139, 92, 246, 0.2)',
                color: '#a78bfa',
              }}
            />
          )}
          <Chip
            size="small"
            label={`${displayAnalysis.confidence}% Confidence`}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: displayAnalysis.confidence >= 80
                ? 'rgba(16, 185, 129, 0.15)'
                : displayAnalysis.confidence >= 50
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              color: displayAnalysis.confidence >= 80
                ? '#10b981'
                : displayAnalysis.confidence >= 50
                ? '#f59e0b'
                : '#ef4444',
              border: '1px solid',
              borderColor: displayAnalysis.confidence >= 80
                ? 'rgba(16, 185, 129, 0.3)'
                : displayAnalysis.confidence >= 50
                ? 'rgba(245, 158, 11, 0.3)'
                : 'rgba(239, 68, 68, 0.3)',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Re-analyze with AI">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyze(false, true);
              }}
              disabled={isAnalyzing}
              sx={{
                color: '#8b5cf6',
                '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.1)' },
              }}
            >
              {isAnalyzing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {expanded ? <ExpandLessIcon sx={{ color: '#8b5cf6' }} /> : <ExpandMoreIcon sx={{ color: '#8b5cf6' }} />}
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
        {/* Root Cause */}
        {'rootCause' in displayAnalysis && displayAnalysis.rootCause && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', letterSpacing: 1 }}
            >
              ROOT CAUSE
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {displayAnalysis.rootCause}
            </Typography>
          </Box>
        )}

        {/* Suggested Fixes */}
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', letterSpacing: 1 }}
        >
          SUGGESTED RESOLUTION STEPS
        </Typography>
        <Box component="ol" sx={{ pl: 2, mt: 1, mb: 3 }}>
          {displayAnalysis.suggestedFix.map((fix, index) => (
            <Box
              component="li"
              key={index}
              sx={{
                mb: 1.5,
                color: 'text.primary',
              }}
            >
              <Typography variant="body2">{fix}</Typography>
            </Box>
          ))}
        </Box>

        {/* Provider info */}
        {'provider' in displayAnalysis && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.disabled">
              Analyzed by {(displayAnalysis as ApiAIAnalysis).provider} ({(displayAnalysis as ApiAIAnalysis).model})
              {(displayAnalysis as ApiAIAnalysis).tokenUsage && ` • ${(displayAnalysis as ApiAIAnalysis).tokenUsage} tokens`}
            </Typography>
          </Box>
        )}
        </Box>
      </Collapse>
    </Card>
  );
}

// Similar Past Issues Section Component
function SimilarIssuesSection({
  similarIssues,
  collapseTrigger,
  expandTrigger,
}: {
  similarIssues: SimilarIssue[];
  collapseTrigger?: number;
  expandTrigger?: number;
}) {
  const [expanded, setExpanded] = useState(true);

  // Respond to collapse trigger
  useEffect(() => {
    if (collapseTrigger && collapseTrigger > 0) {
      setExpanded(false);
    }
  }, [collapseTrigger]);

  // Respond to expand trigger
  useEffect(() => {
    if (expandTrigger && expandTrigger > 0) {
      setExpanded(true);
    }
  }, [expandTrigger]);

  if (!similarIssues || similarIssues.length === 0) {
    return null;
  }

  return (
    <Card
      sx={{
        mb: 2,
        border: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderRadius: 2,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.02)',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'rgba(16, 185, 129, 0.2)',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.05)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon sx={{ color: '#10b981' }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#10b981' }}>
            Similar Past Issues
          </Typography>
          <Chip
            size="small"
            label={similarIssues.length}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          />
        </Box>
        {expanded ? (
          <ExpandLessIcon sx={{ color: '#10b981' }} />
        ) : (
          <ExpandMoreIcon sx={{ color: '#10b981' }} />
        )}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {similarIssues.map((issue, index) => (
            <Box
              key={issue.id}
              sx={{
                p: 1.5,
                mb: index < similarIssues.length - 1 ? 1.5 : 0,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'background.paper',
                borderRadius: 1.5,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                <Typography variant="body2" fontWeight={600}>
                  {issue.workflow}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    color: '#a78bfa',
                    bgcolor: 'rgba(167, 139, 250, 0.1)',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.5,
                  }}
                >
                  {issue.id}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                {issue.resolution}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Card>
  );
}

// Stack Trace Section Component
function StackTraceSection({
  stackTrace,
  collapseTrigger,
  expandTrigger,
}: {
  stackTrace: string;
  collapseTrigger?: number;
  expandTrigger?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Respond to collapse trigger
  useEffect(() => {
    if (collapseTrigger && collapseTrigger > 0) {
      setExpanded(false);
    }
  }, [collapseTrigger]);

  // Respond to expand trigger
  useEffect(() => {
    if (expandTrigger && expandTrigger > 0) {
      setExpanded(true);
    }
  }, [expandTrigger]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stackTrace);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'action.hover',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
          <Typography variant="subtitle2" fontFamily="monospace">
            Stack Trace
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={copied ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          sx={{ textTransform: 'none' }}
          color={copied ? 'success' : 'inherit'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </Box>
      <Collapse in={expanded}>
        <Box
          component="pre"
          sx={{
            p: 2,
            m: 0,
            bgcolor: 'grey.900',
            color: 'grey.100',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            maxHeight: 300,
          }}
        >
          {stackTrace}
        </Box>
      </Collapse>
    </Card>
  );
}

const severityConfig: Record<ErrorSeverity, {
  color: 'error' | 'warning' | 'info';
  icon: React.ReactElement;
  label: string;
  iconBoxBg: string;
  iconBoxBorder: string;
  iconColor: string;
}> = {
  critical: {
    color: 'error',
    icon: <ReportProblemIcon sx={{ fontSize: 18 }} />,
    label: 'Critical',
    iconBoxBg: 'rgba(239, 68, 68, 0.1)',
    iconBoxBorder: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#ef4444',
  },
  warning: {
    color: 'warning',
    icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
    label: 'Warning',
    iconBoxBg: 'rgba(245, 158, 11, 0.1)',
    iconBoxBorder: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#f59e0b',
  },
  info: {
    color: 'info',
    icon: <InfoIcon sx={{ fontSize: 18 }} />,
    label: 'Info',
    iconBoxBg: 'rgba(59, 130, 246, 0.1)',
    iconBoxBorder: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
  },
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ErrorLogPanel({ limit, selectedServerId, errors: propErrors, onViewAll }: ErrorLogPanelProps) {
  const [selectedError, setSelectedError] = useState<DisplayError | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Collapse/Expand all sections triggers
  const [collapseTrigger, setCollapseTrigger] = useState(0);
  const [expandTrigger, setExpandTrigger] = useState(0);

  const handleCollapseAll = () => setCollapseTrigger(prev => prev + 1);
  const handleExpandAll = () => setExpandTrigger(prev => prev + 1);

  // Fetch from API
  const { data: apiData, isLoading, error: fetchError } = useErrors({
    serverId: selectedServerId || undefined,
    limit: limit || 50,
    resolved: false,
  });

  // Fetch full error details when drawer is open
  const { data: fullErrorData, isLoading: isLoadingFullError } = useErrorWithAnalysis(
    selectedError ? selectedError.id : ''
  );

  // Resolve error mutation
  const resolveError = useResolveError();

  // Determine which data to use
  let displayErrors: DisplayError[];
  if (propErrors) {
    displayErrors = propErrors;
  } else if (apiData?.errors) {
    displayErrors = apiData.errors.map(transformApiError);
  } else {
    displayErrors = [];
  }

  const errors = displayErrors;

  const handleErrorClick = (error: DisplayError) => {
    setSelectedError(error);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const handleMarkResolved = async () => {
    if (selectedError) {
      await resolveError.mutateAsync({ id: selectedError.id, resolved: true });
      setDrawerOpen(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading errors...
        </Typography>
      </Card>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <Alert severity="error" sx={{ borderRadius: 3 }}>
        Failed to load errors: {fetchError.message}
      </Alert>
    );
  }

  // Empty state
  if (errors.length === 0) {
    return (
      <>
        <Card
          sx={{
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'background.paper',
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              px: 3,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 24, color: '#10b981' }} />
            </Box>
            <Typography variant="body1" color="text.secondary" fontWeight={500}>
              All systems operational
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.7 }}>
              No errors detected in the last 24 hours.
            </Typography>
          </Box>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card
        sx={{
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'background.paper',
          ...(limit && {
            height: 367, // Match WorkflowTable height when in limited view
            display: 'flex',
            flexDirection: 'column',
          }),
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <List disablePadding>
          {errors.map((error, index) => {
            const severity = severityConfig[error.severity];
            return (
              <ListItem
                key={error.id}
                disablePadding
                sx={{
                  borderBottom: index < errors.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <ListItemButton
                  onClick={() => handleErrorClick(error)}
                  sx={{
                    py: 2,
                    px: 2,
                    borderLeft: '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(241, 245, 249, 0.8)',
                      borderLeftColor: 'primary.main',
                    },
                    '&:hover .error-message': {
                      color: 'primary.main',
                    },
                    '&:hover .chevron-icon': {
                      color: 'primary.main',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                    {/* Severity Icon Box */}
                    <Box
                      sx={{
                        p: 1,
                        bgcolor: severity.iconBoxBg,
                        border: '1px solid',
                        borderColor: severity.iconBoxBorder,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: 0.5,
                        '& svg': {
                          color: severity.iconColor,
                        },
                      }}
                    >
                      {severity.icon}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Metadata line */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {error.timestamp.toLocaleTimeString()}
                        </Typography>
                        <Chip
                          size="small"
                          label={severity.label}
                          color={severity.color}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>•</Typography>
                        <Typography
                          variant="caption"
                          fontWeight={500}
                          sx={{
                            fontSize: '0.75rem',
                            maxWidth: 120,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {error.workflowName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>on</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {error.serverName}
                        </Typography>
                      </Box>

                      {/* Error message */}
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        className="error-message"
                        sx={{
                          mb: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.2s',
                        }}
                      >
                        {error.message}
                      </Typography>

                      {/* AI Analysis tag - shown when AI Analysis or RCA is available */}
                      {(error.hasAIAnalysis || error.hasRca) && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: 4,
                            px: 1,
                            py: 0.25,
                          }}
                        >
                          <AutoAwesomeIcon sx={{ fontSize: 12, color: '#a78bfa' }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.625rem',
                              fontWeight: 500,
                              color: '#a78bfa',
                            }}
                          >
                            AI Analysis Available
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Chevron */}
                    <ChevronRightIcon
                      className="chevron-icon"
                      sx={{
                        fontSize: 18,
                        color: 'text.secondary',
                        opacity: 0.5,
                        transition: 'all 0.2s',
                        alignSelf: 'center',
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
          </List>
        </Box>

        {limit && onViewAll && (
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Button
              size="small"
              onClick={onViewAll}
              sx={{
                textTransform: 'none',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                },
              }}
            >
              View All Errors →
            </Button>
          </Box>
        )}
      </Card>

      {/* AI Analysis Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480 },
            bgcolor: 'background.default',
          },
        }}
      >
        {selectedError && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    size="small"
                    label={severityConfig[selectedError.severity].label}
                    color={severityConfig[selectedError.severity].color}
                    sx={{ height: 24 }}
                  />
                  <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                    {selectedError.id}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="Collapse all sections">
                    <IconButton
                      size="small"
                      onClick={handleCollapseAll}
                      sx={{ color: 'text.secondary' }}
                    >
                      <UnfoldLessIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Expand all sections">
                    <IconButton
                      size="small"
                      onClick={handleExpandAll}
                      sx={{ color: 'text.secondary' }}
                    >
                      <UnfoldMoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={handleCloseDrawer} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {selectedError.message}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Workflow:</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedError.workflowName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Server:</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedError.serverName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Time:</Typography>
                  <Typography variant="body2" fontFamily="monospace">{selectedError.timestamp.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Execution Trace Section */}
              <ExecutionTraceSection
                traces={fullErrorData?.execution?.traces}
                isLoading={isLoadingFullError}
                collapseTrigger={collapseTrigger}
                expandTrigger={expandTrigger}
              />

              {/* AI Analysis Section */}
              <AIAnalysisSection
                errorId={selectedError.id}
                analysis={fullErrorData?.aiAnalysis}
                isLoading={isLoadingFullError}
                collapseTrigger={collapseTrigger}
                expandTrigger={expandTrigger}
              />

              {/* Similar Past Issues Section */}
              {fullErrorData?.aiAnalysis?.similarIssues && (
                <SimilarIssuesSection
                  similarIssues={fullErrorData.aiAnalysis.similarIssues}
                  collapseTrigger={collapseTrigger}
                  expandTrigger={expandTrigger}
                />
              )}

              {/* Root Cause Analysis Section (5 Whys) */}
              <RCASection
                errorId={selectedError.id}
                collapseTrigger={collapseTrigger}
                expandTrigger={expandTrigger}
              />

              {/* Execution Chain Section (shown when deep investigation finds sub-workflows) */}
              {fullErrorData?.aiAnalysis?.executionChain && (
                <ExecutionChainSection
                  chain={fullErrorData.aiAnalysis.executionChain}
                  collapseTrigger={collapseTrigger}
                  expandTrigger={expandTrigger}
                />
              )}

              {/* Stack Trace */}
              {(selectedError.stackTrace || fullErrorData?.stackTrace) && (
                <StackTraceSection
                  stackTrace={fullErrorData?.stackTrace || selectedError.stackTrace || ''}
                  collapseTrigger={collapseTrigger}
                  expandTrigger={expandTrigger}
                />
              )}
            </Box>

            {/* Drawer Footer */}
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
              }}
            >
              <Button variant="outlined" onClick={handleCloseDrawer}>
                Close
              </Button>
              <Button variant="outlined" startIcon={<OpenInNewIcon />}>
                Open in n8n
              </Button>
              <Button
                variant="contained"
                startIcon={resolveError.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                onClick={handleMarkResolved}
                disabled={resolveError.isPending}
              >
                {resolveError.isPending ? 'Resolving...' : 'Mark Resolved'}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </>
  );
}
