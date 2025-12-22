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
import { Server, ServerFormData } from '@/types';

interface ManageServersDialogProps {
  open: boolean;
  onClose: () => void;
  servers: Server[];
  onAddServer: (data: ServerFormData) => void;
  onEditServer: (id: string, data: ServerFormData) => void;
  onDeleteServer: (id: string) => void;
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
  servers,
  onAddServer,
  onEditServer,
  onDeleteServer,
}: ManageServersDialogProps) {
  const [formData, setFormData] = useState<ServerFormData>(defaultFormData);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

    setTestingConnection(true);
    setConnectionStatus('idle');

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock success/failure based on URL format
    const isValidUrl = formData.url.startsWith('http://') || formData.url.startsWith('https://');
    setConnectionStatus(isValidUrl ? 'success' : 'error');
    setTestingConnection(false);

    if (!isValidUrl) {
      setError('Connection failed. Please check your URL and API key.');
    }
  };

  const handleSubmit = () => {
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
    if (!formData.apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    if (editingServerId) {
      onEditServer(editingServerId, formData);
    } else {
      onAddServer(formData);
    }

    // Reset form
    setFormData(defaultFormData);
    setEditingServerId(null);
    setError('');
    setConnectionStatus('idle');
    setShowAdvanced(false);
  };

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

  const handleDelete = (serverId: string, serverName: string) => {
    if (window.confirm(`Are you sure you want to delete "${serverName}"? This action cannot be undone.`)) {
      onDeleteServer(serverId);
    }
  };

  const getStatusColor = (status: Server['status']) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'degraded':
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
              <Button variant="outlined" onClick={handleCancelEdit}>
                Cancel Edit
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testingConnection || !formData.url || !formData.apiKey}
              startIcon={
                testingConnection ? (
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
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              startIcon={editingServerId ? <EditIcon /> : <AddIcon />}
              disabled={!formData.name || !formData.url || !formData.apiKey}
            >
              {editingServerId ? 'Update Server' : 'Add Server'}
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

        {servers.length === 0 ? (
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
                        : server.status === 'degraded'
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
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(server)}
                    sx={{ mr: 0.5 }}
                    disabled={editingServerId === server.id}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(server.id, server.name)}
                    color="error"
                    disabled={editingServerId === server.id}
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
