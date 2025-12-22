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
import { ManageServersDialog } from '@/components/dashboard/ManageServersDialog';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { ProfileDialog } from '@/components/dashboard/ProfileDialog';
import { TeamMembersDialog } from '@/components/dashboard/TeamMembersDialog';
import { Server, ServerFormData, User, TeamInvite, AppSettings } from '@/types';

// Mock data for initial development
const initialServers: Server[] = [
  { id: '1', name: 'Production-US', url: 'https://n8n.us.company.com', status: 'online', workflowCount: 156, errorCount: 2, lastPing: 32 },
  { id: '2', name: 'Production-EU', url: 'https://n8n.eu.company.com', status: 'online', workflowCount: 203, errorCount: 0, lastPing: 45 },
  { id: '3', name: 'Staging', url: 'https://n8n.staging.company.com', status: 'offline', workflowCount: 45, errorCount: 0, lastPing: 0 },
  { id: '4', name: 'Client-A', url: 'https://n8n.client-a.com', status: 'degraded', workflowCount: 89, errorCount: 3, lastPing: 120 },
];

const mockMetrics = {
  totalWorkflows: 493,
  activeExecutions: 12,
  errorRate: 4.2,
  avgExecutionTime: 234,
};

const mockCurrentUser: User = {
  id: '1',
  name: 'Jamal Ahmed',
  email: 'jamal@company.com',
  role: 'admin',
  provider: 'google',
  createdAt: new Date('2024-01-15'),
};

const mockTeamMembers: User[] = [
  mockCurrentUser,
  { id: '2', name: 'Sarah Kim', email: 'sarah@company.com', role: 'member', provider: 'github', createdAt: new Date('2024-02-01') },
  { id: '3', name: 'Mike Johnson', email: 'mike@company.com', role: 'viewer', provider: 'email', createdAt: new Date('2024-03-10') },
];

const mockInvites: TeamInvite[] = [
  { id: 'inv-1', email: 'alex@company.com', role: 'member', invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), invitedBy: '1' },
];

const defaultSettings: AppSettings = {
  theme: 'system',
  compactMode: false,
  defaultTab: 'overview',
  autoRefreshInterval: 30,
  showOfflineServers: true,
  aiProvider: 'openai',
  aiModel: 'gpt-4-turbo',
  aiCacheEnabled: true,
  notifications: {
    emailEnabled: true,
    emailAddress: 'team@company.com',
    slackEnabled: false,
    slackWebhook: '',
    discordEnabled: false,
    discordWebhook: '',
    errorRateThreshold: 5,
    offlineThreshold: 2,
  },
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
      {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
    </div>
  );
}

export default function DashboardPage() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [manageServersOpen, setManageServersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [teamMembersOpen, setTeamMembersOpen] = useState(false);

  // Data states
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [currentUser, setCurrentUser] = useState<User>(mockCurrentUser);
  const [teamMembers, setTeamMembers] = useState<User[]>(mockTeamMembers);
  const [invites, setInvites] = useState<TeamInvite[]>(mockInvites);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleServerClick = (serverId: string) => {
    // Toggle selection: if same server, deselect; otherwise select
    const newSelection = selectedServerId === serverId ? null : serverId;
    setSelectedServerId(newSelection);
    // Bidirectional sync: update server filter dropdown
    setServerFilter(newSelection || 'all');
  };

  // Handle server filter dropdown change - sync with card selection
  const handleServerFilterChange = (value: string) => {
    setServerFilter(value);
    // Sync card selection: if 'all' selected, deselect card; otherwise select matching card
    setSelectedServerId(value === 'all' ? null : value);
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
  };

  // Server handlers
  const handleAddServer = (data: ServerFormData) => {
    const newServer: Server = {
      id: `server-${Date.now()}`,
      name: data.name,
      url: data.url,
      status: 'online',
      workflowCount: 0,
      errorCount: 0,
      lastPing: 0,
    };
    setServers(prev => [...prev, newServer]);
  };

  const handleEditServer = (id: string, data: ServerFormData) => {
    setServers(prev => prev.map(server =>
      server.id === id
        ? { ...server, name: data.name, url: data.url }
        : server
    ));
  };

  const handleDeleteServer = (id: string) => {
    setServers(prev => prev.filter(server => server.id !== id));
    if (selectedServerId === id) {
      setSelectedServerId(null);
    }
  };

  // Profile handlers
  const handleUpdateProfile = (data: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...data }));
    setTeamMembers(prev => prev.map(member =>
      member.id === currentUser.id ? { ...member, ...data } : member
    ));
  };

  const handleConnectProvider = (provider: 'google' | 'github') => {
    console.log('Connecting to', provider);
  };

  const handleDeleteAccount = () => {
    console.log('Account deletion requested');
  };

  // Team handlers
  const handleInviteMember = (email: string, role: User['role']) => {
    const newInvite: TeamInvite = {
      id: `inv-${Date.now()}`,
      email,
      role,
      invitedAt: new Date(),
      invitedBy: currentUser.id,
    };
    setInvites(prev => [...prev, newInvite]);
  };

  const handleRemoveMember = (userId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== userId));
  };

  const handleChangeRole = (userId: string, role: User['role']) => {
    setTeamMembers(prev => prev.map(member =>
      member.id === userId ? { ...member, role } : member
    ));
  };

  const handleCancelInvite = (inviteId: string) => {
    setInvites(prev => prev.filter(invite => invite.id !== inviteId));
  };

  const handleResendInvite = (inviteId: string) => {
    console.log('Resending invite', inviteId);
  };

  // Settings handler
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  // Sign out handler
  const handleSignOut = () => {
    console.log('Signing out...');
  };

  // Get user initials for header
  const getUserInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
      }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, md: 4 } }}>
        {/* Header */}
        <DashboardHeader
          onManageServersClick={() => setManageServersOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          onProfileClick={() => setProfileOpen(true)}
          onTeamMembersClick={() => setTeamMembersOpen(true)}
          onSignOut={handleSignOut}
          userName={currentUser.name}
          userInitials={getUserInitials(currentUser.name)}
          userEmail={currentUser.email}
        />

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          serverFilter={serverFilter}
          onServerFilterChange={handleServerFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          servers={servers}
          onRefresh={handleRefresh}
        />

        {/* Metrics Cards */}
        <MetricsCards metrics={mockMetrics} />

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
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
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontWeight: 700,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 6,
                  height: 24,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                }}
              />
              Server Status
            </Typography>
            <ServerHealthGrid
              servers={servers}
              selectedServerId={selectedServerId}
              onServerClick={handleServerClick}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  mb: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontWeight: 700,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 24,
                    borderRadius: 1,
                    bgcolor: '#8b5cf6',
                  }}
                />
                Active Workflows
              </Typography>
              <WorkflowTable limit={5} selectedServerId={selectedServerId} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  mb: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontWeight: 700,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 24,
                    borderRadius: 1,
                    bgcolor: '#ef4444',
                  }}
                />
                Recent Errors
              </Typography>
              <ErrorLogPanel limit={5} selectedServerId={selectedServerId} />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Workflows Tab */}
          <WorkflowTable selectedServerId={selectedServerId} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Error Logs Tab */}
          <ErrorLogPanel selectedServerId={selectedServerId} />
        </TabPanel>
      </Container>

      {/* Floating AI Chatbot */}
      <AIChatbot />

      {/* Dialogs */}
      <ManageServersDialog
        open={manageServersOpen}
        onClose={() => setManageServersOpen(false)}
        servers={servers}
        onAddServer={handleAddServer}
        onEditServer={handleEditServer}
        onDeleteServer={handleDeleteServer}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={currentUser}
        onUpdateProfile={handleUpdateProfile}
        onConnectProvider={handleConnectProvider}
        onDeleteAccount={handleDeleteAccount}
      />

      <TeamMembersDialog
        open={teamMembersOpen}
        onClose={() => setTeamMembersOpen(false)}
        currentUser={currentUser}
        members={teamMembers}
        invites={invites}
        onInviteMember={handleInviteMember}
        onRemoveMember={handleRemoveMember}
        onChangeRole={handleChangeRole}
        onCancelInvite={handleCancelInvite}
        onResendInvite={handleResendInvite}
      />
    </Box>
  );
}
