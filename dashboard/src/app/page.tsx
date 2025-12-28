'use client';

import { useState, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';

import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
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
import { Server, User, TeamInvite, AppSettings } from '@/types';

// API hooks
import { useServers, useAutoSync } from '@/hooks/api/use-servers';
import { useCurrentUser, useUsers, useUpdateProfile, useDeleteUser, useUpdateUser } from '@/hooks/api/use-users';
import { useInvites, useCreateInvite, useRevokeInvite } from '@/hooks/api/use-invites';
import { useRunningExecutions, useRecentExecutions, useTodayExecutionMetrics } from '@/hooks/api/use-executions';

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
  const { data: session, status } = useSession();

  // API data hooks
  const { data: apiCurrentUser, isLoading: userLoading } = useCurrentUser();
  const { data: apiServers, isLoading: serversLoading } = useServers();
  const { data: apiUsers, isLoading: usersLoading } = useUsers();
  const { data: apiInvites, isLoading: invitesLoading } = useInvites();
  const { data: runningExecutionsData } = useRunningExecutions();
  const { data: recentExecutionsData } = useRecentExecutions(100);
  const { data: todayMetrics } = useTodayExecutionMetrics();

  // Auto-sync hook - polls servers at their configured intervals
  useAutoSync(status === 'authenticated');

  // API mutation hooks
  const updateProfileMutation = useUpdateProfile();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const createInviteMutation = useCreateInvite();
  const revokeInviteMutation = useRevokeInvite();

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

  // Local settings state (not yet persisted to API)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Transform API data to component types
  const currentUser: User = useMemo(() => {
    if (apiCurrentUser) {
      return {
        id: apiCurrentUser.id,
        name: apiCurrentUser.name || 'Unknown',
        email: apiCurrentUser.email,
        role: (apiCurrentUser.role || 'member') as 'admin' | 'member',
        provider: 'email' as const,
        createdAt: new Date(apiCurrentUser.createdAt),
      };
    }
    // Fallback to session data
    if (session?.user) {
      return {
        id: session.user.id || '1',
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: (session.user.role as 'admin' | 'member') || 'member',
        provider: 'email' as const,
        createdAt: new Date(),
      };
    }
    return {
      id: '1',
      name: 'User',
      email: '',
      role: 'member' as const,
      provider: 'email' as const,
      createdAt: new Date(),
    };
  }, [apiCurrentUser, session]);

  const servers: Server[] = useMemo(() => {
    if (apiServers) {
      return apiServers.map(s => ({
        id: s.id,
        name: s.name,
        url: s.url,
        status: s.status,
        workflowCount: s.workflowCount || 0,
        errorCount: s.errorCount || 0,
        lastPing: s.lastChecked ? Math.floor((Date.now() - new Date(s.lastChecked).getTime()) / 1000) : 0,
      }));
    }
    return [];
  }, [apiServers]);

  const teamMembers: User[] = useMemo(() => {
    if (apiUsers) {
      return apiUsers.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        email: u.email,
        role: u.role as 'admin' | 'member',
        provider: 'email' as const,
        createdAt: new Date(u.createdAt),
      }));
    }
    return [currentUser];
  }, [apiUsers, currentUser]);

  const invites: TeamInvite[] = useMemo(() => {
    if (apiInvites) {
      return apiInvites.map(inv => ({
        id: inv.id,
        email: inv.email || '',
        role: inv.role as 'admin' | 'member',
        status: inv.status as 'pending' | 'accepted' | 'expired',
        invitedAt: new Date(inv.createdAt),
        invitedBy: inv.invitedBy.id,
        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }));
    }
    return [];
  }, [apiInvites]);

  // Compute metrics from real data
  const metrics = useMemo(() => {
    const totalWorkflows = servers.reduce((sum, s) => sum + s.workflowCount, 0);
    const totalErrors = servers.reduce((sum, s) => sum + s.errorCount, 0);
    const errorRate = totalWorkflows > 0 ? (totalErrors / totalWorkflows) * 100 : 0;

    // Get active executions count from running executions
    const activeExecutions = runningExecutionsData?.executions?.length ?? 0;

    // Calculate average execution time from recent executions
    const recentExecutions = recentExecutionsData?.executions ?? [];
    const executionsWithDuration = recentExecutions.filter(e => e.duration !== null && e.duration > 0);
    const avgExecutionTime = executionsWithDuration.length > 0
      ? Math.round(executionsWithDuration.reduce((sum, e) => sum + (e.duration ?? 0), 0) / executionsWithDuration.length)
      : 0;

    return {
      totalWorkflows,
      activeExecutions,
      errorRate: Math.round(errorRate * 10) / 10,
      avgExecutionTime,
    };
  }, [servers, runningExecutionsData, recentExecutionsData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleServerClick = (serverId: string) => {
    const newSelection = selectedServerId === serverId ? null : serverId;
    setSelectedServerId(newSelection);
    setServerFilter(newSelection || 'all');
  };

  const handleServerFilterChange = (value: string) => {
    setServerFilter(value);
    setSelectedServerId(value === 'all' ? null : value);
  };

  const handleRefresh = () => {
    // Refetch all data
    window.location.reload();
  };

  // Profile handlers - use API
  const handleUpdateProfile = async (data: Partial<User>) => {
    try {
      await updateProfileMutation.mutateAsync({
        name: data.name,
        email: data.email,
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleConnectProvider = (provider: 'google' | 'github') => {
    console.log('Connecting to', provider);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserMutation.mutateAsync(currentUser.id);
      await signOut({ callbackUrl: '/auth/login' });
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  // Team handlers - use API
  const handleInviteMember = async (email: string, role: User['role']) => {
    try {
      await createInviteMutation.mutateAsync({
        type: 'email',
        email,
        role: role as 'admin' | 'member',
        expiresInDays: 7,
      });
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleChangeRole = async (userId: string, role: User['role']) => {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        data: { role: role as 'admin' | 'member' },
      });
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await revokeInviteMutation.mutateAsync(inviteId);
    } catch (error) {
      console.error('Failed to cancel invite:', error);
    }
  };

  const handleResendInvite = (inviteId: string) => {
    console.log('Resending invite', inviteId);
  };

  // Settings handler
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  // Sign out handler - use NextAuth
  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  // Get user initials for header
  const getUserInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  // Show loading state
  if (status === 'loading' || userLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0f172a',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
        <MetricsCards metrics={metrics} todayMetrics={todayMetrics} />

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
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
              <WorkflowTable
                limit={5}
                selectedServerId={selectedServerId}
                onViewAll={() => setTabValue(1)}
                defaultSortBy="lastExecution"
                defaultSortOrder="desc"
              />
            </Box>
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
              <ErrorLogPanel limit={5} selectedServerId={selectedServerId} onViewAll={() => setTabValue(2)} />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Workflows Tab */}
          <WorkflowTable
            selectedServerId={selectedServerId}
            showSorting={true}
            defaultSortBy="lastExecution"
            defaultSortOrder="desc"
          />
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
