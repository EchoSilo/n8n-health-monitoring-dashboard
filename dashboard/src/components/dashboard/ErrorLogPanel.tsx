'use client';

import { useState } from 'react';
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
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ErrorLog, ErrorSeverity, AIAnalysis } from '@/types';

interface ErrorLogPanelProps {
  limit?: number;
}

// Mock error data
const mockErrors: (ErrorLog & { workflowName: string; serverName: string })[] = [
  {
    id: 'err-001',
    workflowId: 'wf-004',
    workflowName: 'Data Backup',
    serverId: '2',
    serverName: 'Production-EU',
    message: 'HTTP Request Timeout: Connection to api.example.com timed out after 30000ms',
    severity: 'critical',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    stackTrace: `ETIMEDOUT: Connection timed out after 30000ms
    at ClientRequest.<anonymous> (/app/node_modules/n8n-core/dist/NodeExecuteFunctions.js:892:24)
    at Object.onceWrapper (events.js:420:28)
    at ClientRequest.emit (events.js:314:20)
    at TLSSocket.socketErrorListener (_http_client.js:427:9)
    at TLSSocket.emit (events.js:314:20)
    at emitErrorNT (internal/streams/destroy.js:92:8)`,
    hasAIAnalysis: true,
  },
  {
    id: 'err-002',
    workflowId: 'wf-002',
    workflowName: 'Order Processing',
    serverId: '1',
    serverName: 'Production-US',
    message: 'Database connection lost: ECONNRESET',
    severity: 'critical',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    stackTrace: `Error: ECONNRESET
    at TLSWrap.onStreamRead (internal/stream_base_commons.js:209:20)`,
    hasAIAnalysis: true,
  },
  {
    id: 'err-003',
    workflowId: 'wf-006',
    workflowName: 'Report Generation',
    serverId: '1',
    serverName: 'Production-US',
    message: 'Rate limit exceeded for Slack API',
    severity: 'warning',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    stackTrace: `SlackAPIError: ratelimited
    at Object.platformErrorFromResult (/app/node_modules/@slack/web-api/dist/errors.js:62:12)`,
    hasAIAnalysis: false,
  },
  {
    id: 'err-004',
    workflowId: 'wf-001',
    workflowName: 'Customer Sync',
    serverId: '1',
    serverName: 'Production-US',
    message: 'Invalid JSON response from external API',
    severity: 'warning',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    hasAIAnalysis: true,
  },
  {
    id: 'err-005',
    workflowId: 'wf-005',
    workflowName: 'API Integration',
    serverId: '4',
    serverName: 'Client-A',
    message: 'Authentication token expired',
    severity: 'info',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    hasAIAnalysis: false,
  },
];

const mockAIAnalysis: AIAnalysis = {
  id: 'ai-001',
  errorId: 'err-001',
  confidence: 94,
  rootCause: 'The external API at api.example.com is experiencing high latency or is temporarily unavailable.',
  suggestedFix: [
    'Check api.example.com status page for any ongoing incidents',
    'Increase the HTTP request timeout from 30s to 60s in the workflow settings',
    'Add retry logic with exponential backoff (3 retries, starting at 1s)',
    'Consider implementing a circuit breaker pattern for this integration',
  ],
  similarIssues: [
    {
      id: 'ERR-2024-098',
      workflow: 'Order Sync',
      resolution: 'Increased timeout to 60s and added retry with backoff',
    },
    {
      id: 'ERR-2024-045',
      workflow: 'Customer Import',
      resolution: 'External API was down, resolved after vendor fix',
    },
  ],
  createdAt: new Date(),
};

const severityConfig: Record<ErrorSeverity, { color: 'error' | 'warning' | 'info'; icon: React.ReactElement; label: string }> = {
  critical: {
    color: 'error',
    icon: <ErrorIcon sx={{ fontSize: 16 }} />,
    label: 'Critical',
  },
  warning: {
    color: 'warning',
    icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
    label: 'Warning',
  },
  info: {
    color: 'info',
    icon: <InfoIcon sx={{ fontSize: 16 }} />,
    label: 'Info',
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

export function ErrorLogPanel({ limit }: ErrorLogPanelProps) {
  const [selectedError, setSelectedError] = useState<typeof mockErrors[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const errors = limit ? mockErrors.slice(0, limit) : mockErrors;

  const handleErrorClick = (error: typeof mockErrors[0]) => {
    setSelectedError(error);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <>
      <Card
        sx={{
          overflow: 'hidden',
        }}
      >
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
                  sx={{ py: 2, px: 2 }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          icon={severity.icon}
                          label={severity.label}
                          color={severity.color}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            '& .MuiChip-icon': {
                              marginLeft: '4px',
                            },
                          }}
                        />
                        {error.hasAIAnalysis && (
                          <Chip
                            size="small"
                            icon={<AutoAwesomeIcon sx={{ fontSize: 12 }} />}
                            label="AI Analysis"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: 'rgba(139, 92, 246, 0.15)',
                              color: '#8b5cf6',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              '& .MuiChip-icon': {
                                marginLeft: '4px',
                                color: 'inherit',
                              },
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {formatTimeAgo(error.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                      {error.message.length > 60 ? `${error.message.slice(0, 60)}...` : error.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {error.workflowName} • {error.serverName}
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {limit && (
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Button
              size="small"
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
                <IconButton onClick={handleCloseDrawer} size="small">
                  <CloseIcon />
                </IconButton>
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
              {/* AI Analysis Section */}
              {selectedError.hasAIAnalysis && (
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
                      borderBottom: 1,
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesomeIcon sx={{ color: '#8b5cf6' }} />
                      <Typography variant="subtitle1" fontWeight={600} color="secondary.main">
                        AI Root Cause Analysis
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${mockAIAnalysis.confidence}% Confidence`}
                      sx={{
                        height: 24,
                        bgcolor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    />
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.secondary', letterSpacing: 1 }}
                    >
                      SUGGESTED RESOLUTION STEPS
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, mt: 1, mb: 3 }}>
                      {mockAIAnalysis.suggestedFix.map((fix, index) => (
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

                    <Typography
                      variant="overline"
                      sx={{ color: 'text.secondary', letterSpacing: 1 }}
                    >
                      SIMILAR PAST ISSUES
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {mockAIAnalysis.similarIssues.map((issue) => (
                        <Box
                          key={issue.id}
                          sx={{
                            p: 1.5,
                            mb: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: 1,
                            borderStyle: 'dashed',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption" fontFamily="monospace">
                              {issue.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {issue.workflow}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {issue.resolution}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Card>
              )}

              {/* Stack Trace */}
              {selectedError.stackTrace && (
                <Card sx={{ overflow: 'hidden' }}>
                  <Box
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'action.hover',
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="subtitle2" fontFamily="monospace">
                      Stack Trace
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                      sx={{ textTransform: 'none' }}
                    >
                      Copy
                    </Button>
                  </Box>
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
                    }}
                  >
                    {selectedError.stackTrace}
                  </Box>
                </Card>
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
              <Button variant="contained" startIcon={<CheckCircleIcon />}>
                Mark Resolved
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </>
  );
}
