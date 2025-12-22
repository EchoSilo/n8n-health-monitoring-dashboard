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
  Chip,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Workflow, WorkflowStatus } from '@/types';

interface WorkflowTableProps {
  limit?: number;
}

// Mock workflow data
const mockWorkflows: (Workflow & { serverName: string })[] = [
  {
    id: '1',
    n8nId: 'wf-001',
    name: 'Customer Sync',
    serverId: '1',
    serverName: 'Production-US',
    status: 'active',
    lastExecution: new Date(Date.now() - 5 * 60 * 1000),
    executionTime: 234,
    executionCount: 1523,
  },
  {
    id: '2',
    n8nId: 'wf-002',
    name: 'Order Processing',
    serverId: '1',
    serverName: 'Production-US',
    status: 'running',
    lastExecution: new Date(),
    executionTime: 1250,
    executionCount: 892,
  },
  {
    id: '3',
    n8nId: 'wf-003',
    name: 'Email Notifications',
    serverId: '2',
    serverName: 'Production-EU',
    status: 'active',
    lastExecution: new Date(Date.now() - 15 * 60 * 1000),
    executionTime: 156,
    executionCount: 4521,
  },
  {
    id: '4',
    n8nId: 'wf-004',
    name: 'Data Backup',
    serverId: '2',
    serverName: 'Production-EU',
    status: 'failed',
    lastExecution: new Date(Date.now() - 30 * 60 * 1000),
    executionTime: 0,
    executionCount: 756,
  },
  {
    id: '5',
    n8nId: 'wf-005',
    name: 'API Integration',
    serverId: '4',
    serverName: 'Client-A',
    status: 'inactive',
    lastExecution: new Date(Date.now() - 2 * 60 * 60 * 1000),
    executionTime: 890,
    executionCount: 234,
  },
  {
    id: '6',
    n8nId: 'wf-006',
    name: 'Report Generation',
    serverId: '1',
    serverName: 'Production-US',
    status: 'active',
    lastExecution: new Date(Date.now() - 60 * 60 * 1000),
    executionTime: 3450,
    executionCount: 125,
  },
  {
    id: '7',
    n8nId: 'wf-007',
    name: 'Slack Alerts',
    serverId: '2',
    serverName: 'Production-EU',
    status: 'active',
    lastExecution: new Date(Date.now() - 2 * 60 * 1000),
    executionTime: 89,
    executionCount: 8901,
  },
];

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

export function WorkflowTable({ limit }: WorkflowTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(limit || 10);

  const workflows = limit ? mockWorkflows.slice(0, limit) : mockWorkflows;
  const showPagination = !limit;

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
      }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>WORKFLOW</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>SERVER</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>STATUS</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>LAST RUN</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>EXEC TIME</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workflows.map((workflow) => {
              const status = statusConfig[workflow.status];
              return (
                <TableRow
                  key={workflow.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:last-child td, &:last-child th': { border: 0 },
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {workflow.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {workflow.n8nId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
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
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                      {formatTimeAgo(workflow.lastExecution)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {formatExecutionTime(workflow.executionTime)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Open in n8n">
                        <IconButton size="small">
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small">
                        <MoreVertIcon sx={{ fontSize: 16 }} />
                      </IconButton>
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
          count={mockWorkflows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}

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
            View All Workflows →
          </Button>
        </Box>
      )}
    </Card>
  );
}
