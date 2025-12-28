'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { Workflow, WorkflowStatus } from '@/types';
import { useWorkflows, ApiWorkflow } from '@/hooks/api';

// Extended workflow type for display
interface DisplayWorkflow {
  id: string;
  n8nId: string;
  name: string;
  serverId: string;
  serverName: string;
  status: WorkflowStatus;
  lastExecution: Date | null;
  executionTime: number;
  executionCount: number;
  successRate?: number;
}

type SortField = 'name' | 'lastExecution' | 'executionCount' | 'avgExecTime' | 'status' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface WorkflowTableProps {
  limit?: number;
  selectedServerId?: string | null;
  workflows?: DisplayWorkflow[]; // Optional: pass pre-fetched data
  onViewAll?: () => void; // Callback when "View All" button is clicked
  defaultSortBy?: SortField; // Default sort field
  defaultSortOrder?: SortOrder; // Default sort order
  showSorting?: boolean; // Whether to show sortable headers
}

// Transform API workflow to display format
function transformApiWorkflow(w: ApiWorkflow): DisplayWorkflow {
  return {
    id: w.id,
    n8nId: w.n8nId,
    name: w.name,
    serverId: w.serverId,
    serverName: w.serverName,
    status: w.status,
    lastExecution: w.lastExecution ? new Date(w.lastExecution) : null,
    executionTime: w.avgExecTime,
    executionCount: w.executionCount,
    successRate: w.totalExecutions > 0
      ? ((w.totalExecutions - w.unresolvedErrors) / w.totalExecutions) * 100
      : undefined,
  };
}

const statusConfig: Record<
  WorkflowStatus,
  {
    color: 'success' | 'error' | 'warning' | 'default';
    icon: React.ReactElement;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  active: {
    color: 'success',
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    label: 'Active',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    textColor: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  running: {
    color: 'warning',
    icon: <PlayArrowIcon sx={{ fontSize: 14 }} />,
    label: 'Running',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#f59e0b',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  failed: {
    color: 'error',
    icon: <ErrorIcon sx={{ fontSize: 14 }} />,
    label: 'Failed',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  inactive: {
    color: 'default',
    icon: <PauseCircleIcon sx={{ fontSize: 14 }} />,
    label: 'Inactive',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    textColor: '#94a3b8',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
};

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatExecutionTime(ms: number): string {
  if (ms === 0) return '--';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function WorkflowTable({
  limit,
  selectedServerId,
  workflows: propWorkflows,
  onViewAll,
  defaultSortBy = 'lastExecution',
  defaultSortOrder = 'desc',
  showSorting = false,
}: WorkflowTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(limit || 10);
  const [sortBy, setSortBy] = useState<SortField>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  // Fetch from API
  const { data: apiData, isLoading, error } = useWorkflows({
    serverId: selectedServerId || undefined,
    limit: limit || 50,
    sortBy,
    sortOrder,
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Determine which data to use
  let displayWorkflows: DisplayWorkflow[];
  if (propWorkflows) {
    displayWorkflows = propWorkflows;
  } else if (apiData?.workflows) {
    displayWorkflows = apiData.workflows.map(transformApiWorkflow);
  } else {
    displayWorkflows = [];
  }

  const workflows = displayWorkflows;
  const showPagination = !limit;

  // Loading state
  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading workflows...
        </Typography>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 3 }}>
        Failed to load workflows: {error.message}
      </Alert>
    );
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Empty state
  if (workflows.length === 0) {
    return (
      <Card
        sx={{
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.3)' : 'rgba(248, 250, 252, 0.5)',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.8)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <PlayCircleOutlineIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
          </Box>
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            No workflows found matching your criteria.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.7 }}>
            Try adjusting your filters or search query.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
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
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
              }}
            >
              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                {showSorting ? (
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortOrder : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Workflow Name
                  </TableSortLabel>
                ) : 'Workflow Name'}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Server</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                {showSorting ? (
                  <TableSortLabel
                    active={sortBy === 'status'}
                    direction={sortBy === 'status' ? sortOrder : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                ) : 'Status'}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                {showSorting ? (
                  <TableSortLabel
                    active={sortBy === 'lastExecution'}
                    direction={sortBy === 'lastExecution' ? sortOrder : 'asc'}
                    onClick={() => handleSort('lastExecution')}
                  >
                    Last Run
                  </TableSortLabel>
                ) : 'Last Run'}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }} align="right">
                {showSorting ? (
                  <TableSortLabel
                    active={sortBy === 'avgExecTime'}
                    direction={sortBy === 'avgExecTime' ? sortOrder : 'asc'}
                    onClick={() => handleSort('avgExecTime')}
                  >
                    Duration
                  </TableSortLabel>
                ) : 'Duration'}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }} align="right">Success Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workflows.map((workflow) => {
              const status = statusConfig[workflow.status];
              const successRate = workflow.successRate ?? 0;
              const isLowSuccessRate = successRate < 90;
              return (
                <TableRow
                  key={workflow.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:last-child td, &:last-child th': { border: 0 },
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(241, 245, 249, 0.8)',
                    },
                    '&:hover .workflow-name': {
                      color: 'primary.main',
                    },
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        className="workflow-name"
                        sx={{ transition: 'color 0.2s' }}
                      >
                        {workflow.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ fontSize: '0.7rem' }}>
                        {workflow.n8nId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                      {workflow.serverName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={status.icon}
                      label={status.label}
                      sx={{
                        height: 24,
                        fontSize: '0.75rem',
                        bgcolor: status.bgColor,
                        color: status.textColor,
                        border: '1px solid',
                        borderColor: status.borderColor,
                        '& .MuiChip-icon': {
                          marginLeft: '4px',
                          color: status.textColor,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary" fontSize="0.875rem">
                      {formatTimeAgo(workflow.lastExecution)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }} />
                      <Typography variant="body2" fontFamily="monospace" color="text.secondary" fontSize="0.875rem">
                        {formatExecutionTime(workflow.executionTime)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight={500}
                        sx={{
                          color: isLowSuccessRate ? '#ef4444' : '#10b981',
                        }}
                      >
                        {successRate}%
                      </Typography>
                      <Box
                        sx={{
                          width: 80,
                          height: 6,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 0.8)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${successRate}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: isLowSuccessRate
                              ? 'linear-gradient(to right, #dc2626, #ef4444)'
                              : 'linear-gradient(to right, #059669, #10b981)',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {showPagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={workflows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}

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
            View All Workflows →
          </Button>
        </Box>
      )}
    </Card>
  );
}
