'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ServerHealthGrid } from '@/components/dashboard/ServerHealthGrid';
import { WorkflowTable } from '@/components/dashboard/WorkflowTable';
import { ErrorLogPanel } from '@/components/dashboard/ErrorLogPanel';
import { AIChatbot } from '@/components/dashboard/AIChatbot';

// Mock data for initial development
const mockServers = [
  { id: '1', name: 'Production-US', url: 'https://n8n.us.company.com', status: 'online' as const, workflowCount: 156, errorCount: 2, lastPing: 32 },
  { id: '2', name: 'Production-EU', url: 'https://n8n.eu.company.com', status: 'online' as const, workflowCount: 203, errorCount: 0, lastPing: 45 },
  { id: '3', name: 'Staging', url: 'https://n8n.staging.company.com', status: 'offline' as const, workflowCount: 45, errorCount: 0, lastPing: 0 },
  { id: '4', name: 'Client-A', url: 'https://n8n.client-a.com', status: 'degraded' as const, workflowCount: 89, errorCount: 3, lastPing: 120 },
];

const mockMetrics = {
  totalWorkflows: 493,
  activeExecutions: 12,
  errorRate: 4.2,
  avgExecutionTime: 234,
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DashboardPage() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleServerClick = (serverId: string) => {
    setSelectedServerId(prev => prev === serverId ? null : serverId);
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <DashboardHeader />

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          serverFilter={serverFilter}
          onServerFilterChange={setServerFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          servers={mockServers}
          onRefresh={handleRefresh}
        />

        {/* Metrics Cards */}
        <MetricsCards metrics={mockMetrics} />

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="dashboard tabs"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
              },
            }}
          >
            <Tab
              icon={<GridViewIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Overview"
              id="dashboard-tab-0"
              aria-controls="dashboard-tabpanel-0"
            />
            <Tab
              icon={<ListAltIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Workflows"
              id="dashboard-tab-1"
              aria-controls="dashboard-tabpanel-1"
            />
            <Tab
              icon={<ErrorOutlineIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Error Logs"
              id="dashboard-tab-2"
              aria-controls="dashboard-tabpanel-2"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Overview Tab */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'text.secondary',
                }}
              />
              Server Status
            </Typography>
            <ServerHealthGrid
              servers={mockServers}
              selectedServerId={selectedServerId}
              onServerClick={handleServerClick}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.secondary',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'text.secondary',
                  }}
                />
                Active Workflows
              </Typography>
              <WorkflowTable limit={5} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.secondary',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'text.secondary',
                  }}
                />
                Recent Errors
              </Typography>
              <ErrorLogPanel limit={5} />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Workflows Tab */}
          <WorkflowTable />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Error Logs Tab */}
          <ErrorLogPanel />
        </TabPanel>
      </Container>

      {/* Floating AI Chatbot */}
      <AIChatbot />
    </Box>
  );
}
