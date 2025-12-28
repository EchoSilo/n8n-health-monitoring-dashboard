'use client';

import { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Collapse,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import LinkIcon from '@mui/icons-material/Link';
import KeyIcon from '@mui/icons-material/Key';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import { Server, ServerFormData } from '@/types';
import {
  useServers,
  useCreateServer,
  useUpdateServer,
  useDeleteServer,
  useTestServerConnection,
  useSyncServer,
  ApiServer,
} from '@/hooks/api';

// Transform API server to display format
function transformApiServer(s: ApiServer): Server {
  return {
    id: s.id,
    name: s.name,
    url: s.url,
    status: s.status,
    workflowCount: s.workflowCount,
    errorCount: s.errorCount,
    lastPing: s.lastChecked ? Date.now() - new Date(s.lastChecked).getTime() : 0,
  };
}

interface ManageServersDialogProps {
  open: boolean;
  onClose: () => void;
  servers?: Server[]; // Optional: pass pre-fetched data
}

const defaultFormData: ServerFormData = {
  name: '',
  url: '',
  apiKey: '',
  pollingInterval: 30,
  webhookEnabled: false,
  skipSslVerification: false,
};

export function ManageServersDialog({
  open,
  onClose,
  servers: propServers,
}: ManageServersDialogProps) {
  const [formData, setFormData] = useState<ServerFormData>(defaultFormData);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncingServerId, setSyncingServerId] = useState<string | null>(null);

  // API hooks
  const { data: apiServers, isLoading: loadingServers } = useServers();
  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const testConnection = useTestServerConnection();
  const syncServer = useSyncServer();

  // Determine which servers to display (use API data, fallback to props)
  const servers: Server[] = apiServers?.map(transformApiServer) || propServers || [];

  const handleInputChange = (field: keyof ServerFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setConnectionStatus('idle');
  };

  const handleTestConnection = async () => {
    if (!formData.url || !formData.apiKey) {
      setError('URL and API Key are required to test connection');
      return;
    }

    if (editingServerId) {
      // Test existing server connection via API
      try {
        const result = await testConnection.mutateAsync(editingServerId);
        setConnectionStatus(result.success ? 'success' : 'error');
        if (!result.success) {
          setError(result.message);
        }
      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : 'Connection test failed');
      }
    } else {
      // For new servers, validate URL format only (actual test happens after save)
      const isValidUrl = formData.url.startsWith('http://') || formData.url.startsWith('https://');
      if (!isValidUrl) {
        setConnectionStatus('error');
        setError('URL must start with http:// or https://');
      } else {
        setError('Save the server first to test the actual connection.');
      }
    }
  };

  const handleSyncServer = async (serverId: string) => {
    setSyncingServerId(serverId);
    try {
      await syncServer.mutateAsync(serverId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingServerId(null);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Server name is required');
      return;
    }
    if (!formData.url.trim()) {
      setError('Server URL is required');
      return;
    }
    if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    if (!editingServerId && !formData.apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    // Use API
    try {
      if (editingServerId) {
          await updateServer.mutateAsync({
            id: editingServerId,
            data: {
              name: formData.name,
              url: formData.url,
              apiKey: formData.apiKey || undefined,
              pollingInterval: formData.pollingInterval,
              enableWebhook: formData.webhookEnabled,
              skipSSL: formData.skipSslVerification,
            },
          });
        } else {
          // Create server and auto-sync to get workflows and test connection
          const newServer = await createServer.mutateAsync({
            name: formData.name,
            url: formData.url,
            apiKey: formData.apiKey,
            pollingInterval: formData.pollingInterval,
            enableWebhook: formData.webhookEnabled,
            skipSSL: formData.skipSslVerification,
          });
          // Auto-sync the new server to test connection and fetch workflows
          if (newServer?.id) {
            try {
              await syncServer.mutateAsync(newServer.id);
            } catch {
              // Sync failed, but server was created - user can retry manually
              console.warn('Auto-sync failed, server created with unknown status');
            }
          }
        }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
      return;
    }

    // Reset form
    setFormData(defaultFormData);
    setEditingServerId(null);
    setError('');
    setConnectionStatus('idle');
    setShowAdvanced(false);
  };

  const isSubmitting = createServer.isPending || updateServer.isPending;

  const handleEdit = (server: Server) => {
    setEditingServerId(server.id);
    setFormData({
      name: server.name,
      url: server.url,
      apiKey: '', // Don't show existing API key for security
      pollingInterval: 30,
      webhookEnabled: false,
      skipSslVerification: false,
    });
    setShowAdvanced(false);
    setConnectionStatus('idle');
  };

  const handleCancelEdit = () => {
    setEditingServerId(null);
    setFormData(defaultFormData);
    setError('');
    setConnectionStatus('idle');
  };

  const handleDelete = async (serverId: string, serverName: string) => {
    if (window.confirm(`Are you sure you want to delete "${serverName}"? This action cannot be undone.`)) {
      try {
        await deleteServer.mutateAsync(serverId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    }
  };

  const getStatusColor = (status: Server['status']) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'degraded':
      case 'unknown':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <DnsIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Manage n8n Servers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add or remove server connections and manage API credentials
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Add/Edit Server Form */}
        <Box
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <AddIcon fontSize="small" />
            {editingServerId ? 'Edit Server' : 'Add New Server'}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Server Name"
              placeholder="e.g. Production US-East"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DnsIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Server URL"
              placeholder="https://n8n.example.com"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TextField
            label="API Key"
            type="password"
            placeholder="n8n_api_..."
            value={formData.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            helperText="Your API key is stored securely and encrypted."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Advanced Options */}
          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: 'none' }}
            >
              Advanced Options
            </Button>
            <Collapse in={showAdvanced}>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
                  <InputLabel>Polling Interval</InputLabel>
                  <Select
                    value={formData.pollingInterval}
                    label="Polling Interval"
                    onChange={(e) => handleInputChange('pollingInterval', e.target.value as number)}
                  >
                    <MenuItem value={15}>15 seconds</MenuItem>
                    <MenuItem value={30}>30 seconds</MenuItem>
                    <MenuItem value={60}>1 minute</MenuItem>
                    <MenuItem value={300}>5 minutes</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.webhookEnabled}
                      onChange={(e) => handleInputChange('webhookEnabled', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Enable webhook receiver"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.skipSslVerification}
                      onChange={(e) => handleInputChange('skipSslVerification', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Skip SSL verification (dev only)"
                  sx={{ display: 'block', mt: 1 }}
                />
              </Box>
            </Collapse>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Connection Status */}
          {connectionStatus === 'success' && (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
              Connection successful!
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            {editingServerId && (
              <Button variant="outlined" onClick={handleCancelEdit} disabled={isSubmitting}>
                Cancel Edit
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testConnection.isPending || !formData.url || (!editingServerId && !formData.apiKey)}
              startIcon={
                testConnection.isPending ? (
                  <CircularProgress size={16} />
                ) : connectionStatus === 'success' ? (
                  <CheckCircleIcon color="success" />
                ) : connectionStatus === 'error' ? (
                  <ErrorIcon color="error" />
                ) : (
                  <LinkIcon />
                )
              }
            >
              {testConnection.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : editingServerId ? <EditIcon /> : <AddIcon />}
              disabled={isSubmitting || !formData.name || !formData.url || (!editingServerId && !formData.apiKey)}
            >
              {isSubmitting ? 'Saving...' : editingServerId ? 'Update Server' : 'Add Server'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Connected Servers List */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Connected Servers
          </Typography>
          <Chip label={`${servers.length} Connected`} size="small" variant="outlined" />
        </Box>

        {loadingServers ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading servers...
            </Typography>
          </Box>
        ) : servers.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              border: 1,
              borderStyle: 'dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <DnsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" fontWeight={500}>
              No servers configured
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Add your first server above to get started.
            </Typography>
          </Box>
        ) : (
          <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            {servers.map((server, index) => (
              <ListItem
                key={server.id}
                sx={{
                  borderRadius: 1,
                  mb: index < servers.length - 1 ? 1 : 0,
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 4,
                    height: 48,
                    borderRadius: 1,
                    mr: 2,
                    bgcolor:
                      server.status === 'online'
                        ? 'success.main'
                        : server.status === 'degraded' || server.status === 'unknown'
                          ? 'warning.main'
                          : 'error.main',
                  }}
                />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={600}>{server.name}</Typography>
                      <Chip
                        label={server.status}
                        size="small"
                        color={getStatusColor(server.status)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <LinkIcon sx={{ fontSize: 12 }} />
                      {server.url} &bull; {server.workflowCount} workflows
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Sync workflows from n8n">
                    <IconButton
                      size="small"
                      onClick={() => handleSyncServer(server.id)}
                      sx={{ mr: 0.5 }}
                      disabled={syncingServerId === server.id || editingServerId === server.id}
                    >
                      {syncingServerId === server.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SyncIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(server)}
                    sx={{ mr: 0.5 }}
                    disabled={editingServerId === server.id || syncingServerId === server.id}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(server.id, server.name)}
                    color="error"
                    disabled={editingServerId === server.id || deleteServer.isPending || syncingServerId === server.id}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
