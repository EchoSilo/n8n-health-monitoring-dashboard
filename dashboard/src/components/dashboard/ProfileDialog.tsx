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
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { User } from '@/types';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onUpdateProfile: (data: Partial<User>) => void;
  onConnectProvider: (provider: 'google' | 'github') => void;
  onDeleteAccount: () => void;
}

export function ProfileDialog({
  open,
  onClose,
  user,
  onUpdateProfile,
  onConnectProvider,
  onDeleteAccount,
}: ProfileDialogProps) {
  const [name, setName] = useState(user.name);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setHasChanges(value !== user.name);
  };

  const handleSave = () => {
    if (hasChanges) {
      onUpdateProfile({ name });
      setHasChanges(false);
    }
    onClose();
  };

  const handleClose = () => {
    setName(user.name);
    setHasChanges(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDeleteAccount = () => {
    if (showDeleteConfirm) {
      onDeleteAccount();
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'member':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <GoogleIcon />;
      case 'github':
        return <GitHubIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const isOAuthUser = user.provider === 'google' || user.provider === 'github';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <PersonIcon sx={{ color: '#fff' }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            My Profile
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Avatar Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={user.avatar}
              sx={{
                width: 100,
                height: 100,
                fontSize: '2rem',
                bgcolor: 'primary.main',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
              }}
            >
              {getInitials(user.name)}
            </Avatar>
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <PhotoCameraIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button size="small" sx={{ mt: 1, textTransform: 'none' }}>
            Change Photo
          </Button>
        </Box>

        {/* Profile Form */}
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Full Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Email"
            value={user.email}
            fullWidth
            size="small"
            disabled
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: isOAuthUser && (
                <Chip
                  label={`via ${user.provider.charAt(0).toUpperCase() + user.provider.slice(1)}`}
                  size="small"
                  icon={getProviderIcon(user.provider)}
                  sx={{ height: 24 }}
                />
              ),
            }}
            helperText={isOAuthUser ? 'Email is managed by your OAuth provider' : undefined}
          />

          <TextField
            label="Role"
            value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            fullWidth
            size="small"
            disabled
            InputProps={{
              endAdornment: (
                <Chip
                  label={user.role}
                  size="small"
                  color={getRoleColor(user.role)}
                  sx={{ height: 24, textTransform: 'capitalize' }}
                />
              ),
            }}
            helperText="Role is managed by team administrators"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Connected Accounts */}
        <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Connected Accounts
        </Typography>

        <List disablePadding>
          <ListItem
            sx={{
              px: 2,
              py: 1.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <GoogleIcon color={user.provider === 'google' ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Google"
              secondary={user.provider === 'google' ? user.email : 'Not connected'}
            />
            <ListItemSecondaryAction>
              {user.provider === 'google' ? (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Connected"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Button
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => onConnectProvider('google')}
                >
                  Connect
                </Button>
              )}
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem
            sx={{
              px: 2,
              py: 1.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <GitHubIcon color={user.provider === 'github' ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="GitHub"
              secondary={user.provider === 'github' ? user.email : 'Not connected'}
            />
            <ListItemSecondaryAction>
              {user.provider === 'github' ? (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Connected"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Button
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => onConnectProvider('github')}
                >
                  Connect
                </Button>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        </List>

        <Divider sx={{ my: 3 }} />

        {/* Danger Zone */}
        <Typography
          variant="subtitle2"
          sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'error.main' }}
        >
          Danger Zone
        </Typography>

        {showDeleteConfirm && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Are you sure you want to delete your account? This action cannot be undone. All your data will be
            permanently removed.
          </Alert>
        )}

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={handleDeleteAccount}
        >
          {showDeleteConfirm ? 'Confirm Delete Account' : 'Delete Account'}
        </Button>

        {showDeleteConfirm && (
          <Button
            variant="text"
            sx={{ ml: 1 }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
        )}
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
