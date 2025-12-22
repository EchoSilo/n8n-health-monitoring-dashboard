'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  Radio,
  Divider,
  InputAdornment,
  Slider,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StorageIcon from '@mui/icons-material/Storage';
import EmailIcon from '@mui/icons-material/Email';
import KeyIcon from '@mui/icons-material/Key';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';
import { AppSettings, NotificationSettings } from '@/types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function SettingsModal({ open, onClose, settings, onSave }: SettingsModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateNotification = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localSettings);
    setHasChanges(false);
    onClose();
  };

  const handleClose = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '70vh',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            <SettingsIcon sx={{ color: '#fff' }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Settings
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex' }}>
        {/* Sidebar Tabs */}
        <Box
          sx={{
            width: 180,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <Tabs
            orientation="vertical"
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                textTransform: 'none',
                minHeight: 48,
                px: 2,
              },
            }}
          >
            <Tab icon={<PaletteIcon />} iconPosition="start" label="General" />
            <Tab icon={<SmartToyIcon />} iconPosition="start" label="AI Provider" />
            <Tab icon={<NotificationsIcon />} iconPosition="start" label="Notifications" />
            <Tab icon={<StorageIcon />} iconPosition="start" label="Data & Logs" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, px: 3, overflow: 'auto' }}>
          {/* General Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Appearance
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                Theme
              </Typography>
              <RadioGroup
                row
                value={localSettings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as AppSettings['theme'])}
              >
                <FormControlLabel value="light" control={<Radio size="small" />} label="Light" />
                <FormControlLabel value="dark" control={<Radio size="small" />} label="Dark" />
                <FormControlLabel value="system" control={<Radio size="small" />} label="System" />
              </RadioGroup>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.compactMode}
                  onChange={(e) => updateSetting('compactMode', e.target.checked)}
                  size="small"
                />
              }
              label="Use compact table rows"
              sx={{ mb: 3, display: 'block' }}
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dashboard
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Default Tab</InputLabel>
                <Select
                  value={localSettings.defaultTab}
                  label="Default Tab"
                  onChange={(e) => updateSetting('defaultTab', e.target.value as AppSettings['defaultTab'])}
                >
                  <MenuItem value="overview">Overview</MenuItem>
                  <MenuItem value="workflows">Workflows</MenuItem>
                  <MenuItem value="errors">Error Logs</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Auto-refresh Interval</InputLabel>
                <Select
                  value={localSettings.autoRefreshInterval}
                  label="Auto-refresh Interval"
                  onChange={(e) => updateSetting('autoRefreshInterval', e.target.value as number)}
                >
                  <MenuItem value={0}>Disabled</MenuItem>
                  <MenuItem value={15}>15 seconds</MenuItem>
                  <MenuItem value={30}>30 seconds</MenuItem>
                  <MenuItem value={60}>1 minute</MenuItem>
                  <MenuItem value={300}>5 minutes</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                Show Offline Servers
              </Typography>
              <RadioGroup
                row
                value={localSettings.showOfflineServers ? 'yes' : 'no'}
                onChange={(e) => updateSetting('showOfflineServers', e.target.value === 'yes')}
              >
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
              </RadioGroup>
            </Box>
          </TabPanel>

          {/* AI Provider Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Configuration
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                Primary Provider
              </Typography>
              <RadioGroup
                value={localSettings.aiProvider}
                onChange={(e) => updateSetting('aiProvider', e.target.value as AppSettings['aiProvider'])}
              >
                <FormControlLabel value="openai" control={<Radio size="small" />} label="OpenAI (GPT-4)" />
                <FormControlLabel value="anthropic" control={<Radio size="small" />} label="Anthropic (Claude)" />
                <FormControlLabel value="ollama" control={<Radio size="small" />} label="Local (Ollama)" />
              </RadioGroup>
            </Box>

            {localSettings.aiProvider !== 'ollama' && (
              <TextField
                label={`${localSettings.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key`}
                type="password"
                placeholder={localSettings.aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                fullWidth
                size="small"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Box sx={{ mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Model</InputLabel>
                <Select value={localSettings.aiModel} label="Model" onChange={(e) => updateSetting('aiModel', e.target.value)}>
                  {localSettings.aiProvider === 'openai' && [
                    <MenuItem key="gpt-4-turbo" value="gpt-4-turbo">gpt-4-turbo</MenuItem>,
                    <MenuItem key="gpt-4o" value="gpt-4o">gpt-4o</MenuItem>,
                    <MenuItem key="gpt-3.5-turbo" value="gpt-3.5-turbo">gpt-3.5-turbo</MenuItem>,
                  ]}
                  {localSettings.aiProvider === 'anthropic' && [
                    <MenuItem key="claude-3-opus" value="claude-3-opus">claude-3-opus</MenuItem>,
                    <MenuItem key="claude-3-sonnet" value="claude-3-sonnet">claude-3-sonnet</MenuItem>,
                    <MenuItem key="claude-3-haiku" value="claude-3-haiku">claude-3-haiku</MenuItem>,
                  ]}
                  {localSettings.aiProvider === 'ollama' && [
                    <MenuItem key="llama2" value="llama2">llama2</MenuItem>,
                    <MenuItem key="mistral" value="mistral">mistral</MenuItem>,
                    <MenuItem key="codellama" value="codellama">codellama</MenuItem>,
                  ]}
                </Select>
              </FormControl>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.aiCacheEnabled}
                  onChange={(e) => updateSetting('aiCacheEnabled', e.target.checked)}
                  size="small"
                />
              }
              label="Cache AI responses (saves costs)"
              sx={{ mb: 2, display: 'block' }}
            />
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notification Channels
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.notifications.emailEnabled}
                    onChange={(e) => updateNotification('emailEnabled', e.target.checked)}
                    size="small"
                  />
                }
                label="Email Alerts"
              />
              {localSettings.notifications.emailEnabled && (
                <TextField
                  placeholder="team@company.com"
                  value={localSettings.notifications.emailAddress}
                  onChange={(e) => updateNotification('emailAddress', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mt: 1, ml: 4, maxWidth: 300 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.notifications.slackEnabled}
                    onChange={(e) => updateNotification('slackEnabled', e.target.checked)}
                    size="small"
                  />
                }
                label="Slack Webhook"
              />
              {localSettings.notifications.slackEnabled && (
                <TextField
                  placeholder="https://hooks.slack.com/services/..."
                  value={localSettings.notifications.slackWebhook}
                  onChange={(e) => updateNotification('slackWebhook', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mt: 1, ml: 4, maxWidth: 400 }}
                />
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.notifications.discordEnabled}
                    onChange={(e) => updateNotification('discordEnabled', e.target.checked)}
                    size="small"
                  />
                }
                label="Discord Webhook"
              />
              {localSettings.notifications.discordEnabled && (
                <TextField
                  placeholder="https://discord.com/api/webhooks/..."
                  value={localSettings.notifications.discordWebhook}
                  onChange={(e) => updateNotification('discordWebhook', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mt: 1, ml: 4, maxWidth: 400 }}
                />
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Alert Thresholds
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Notify when error rate exceeds: {localSettings.notifications.errorRateThreshold}%
              </Typography>
              <Slider
                value={localSettings.notifications.errorRateThreshold}
                onChange={(_, value) => updateNotification('errorRateThreshold', value as number)}
                min={1}
                max={20}
                marks={[
                  { value: 1, label: '1%' },
                  { value: 5, label: '5%' },
                  { value: 10, label: '10%' },
                  { value: 20, label: '20%' },
                ]}
                sx={{ maxWidth: 300 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Notify when server offline for: {localSettings.notifications.offlineThreshold} minutes
              </Typography>
              <Slider
                value={localSettings.notifications.offlineThreshold}
                onChange={(_, value) => updateNotification('offlineThreshold', value as number)}
                min={1}
                max={30}
                marks={[
                  { value: 1, label: '1m' },
                  { value: 5, label: '5m' },
                  { value: 15, label: '15m' },
                  { value: 30, label: '30m' },
                ]}
                sx={{ maxWidth: 300 }}
              />
            </Box>
          </TabPanel>

          {/* Data & Logs Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Data Management
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              These actions affect your local dashboard data. Server data from n8n instances is not affected.
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                Log Retention
              </Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select defaultValue={30}>
                  <MenuItem value={7}>7 days</MenuItem>
                  <MenuItem value={14}>14 days</MenuItem>
                  <MenuItem value={30}>30 days</MenuItem>
                  <MenuItem value={90}>90 days</MenuItem>
                  <MenuItem value={0}>Keep forever</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Export & Cleanup
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export Data
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export Logs
              </Button>
              <Button variant="outlined" color="warning" startIcon={<DeleteSweepIcon />}>
                Clear Cache
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'error.main' }}>
              Danger Zone
            </Typography>

            <Button variant="outlined" color="error" startIcon={<DeleteSweepIcon />}>
              Reset All Settings
            </Button>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={!hasChanges}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
