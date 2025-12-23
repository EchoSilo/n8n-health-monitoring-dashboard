'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  ListItemIcon,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import { User, UserRole, TeamInvite } from '@/types';

interface TeamMembersDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
  members: User[];
  invites: TeamInvite[];
  onInviteMember: (email: string, role: UserRole) => void;
  onRemoveMember: (userId: string) => void;
  onChangeRole: (userId: string, role: UserRole) => void;
  onCancelInvite: (inviteId: string) => void;
  onResendInvite: (inviteId: string) => void;
}

export function TeamMembersDialog({
  open,
  onClose,
  currentUser,
  members,
  invites,
  onInviteMember,
  onRemoveMember,
  onChangeRole,
  onCancelInvite,
  onResendInvite,
}: TeamMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [roleMenuAnchorEl, setRoleMenuAnchorEl] = useState<null | HTMLElement>(null);

  const isAdmin = currentUser.role === 'admin';

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, memberId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedMemberId(memberId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedMemberId(null);
  };

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setRoleMenuAnchorEl(event.currentTarget);
  };

  const handleRoleMenuClose = () => {
    setRoleMenuAnchorEl(null);
  };

  const handleRoleChange = (role: UserRole) => {
    if (selectedMemberId) {
      onChangeRole(selectedMemberId, role);
    }
    handleRoleMenuClose();
    handleMenuClose();
  };

  const handleRemoveMember = () => {
    if (selectedMemberId) {
      const member = members.find((m) => m.id === selectedMemberId);
      if (member && window.confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
        onRemoveMember(selectedMemberId);
      }
    }
    handleMenuClose();
  };

  const handleInvite = () => {
    if (inviteEmail && inviteEmail.includes('@')) {
      onInviteMember(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
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

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'member':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}
          >
            <GroupIcon sx={{ color: '#fff' }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Team Members
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => setShowInviteForm(true)}
            >
              Invite
            </Button>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Invite Form */}
        {showInviteForm && isAdmin && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              border: 1,
              borderColor: 'primary.main',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Invite New Member
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Email Address"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={inviteRole}
                  label="Role"
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Member</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button size="small" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleInvite}
                disabled={!inviteEmail || !inviteEmail.includes('@')}
              >
                Send Invite
              </Button>
            </Box>
          </Box>
        )}

        {/* Search */}
        <TextField
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Members List */}
        <List disablePadding>
          {filteredMembers.map((member) => (
            <ListItem
              key={member.id}
              sx={{
                px: 2,
                py: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
                },
              }}
              secondaryAction={
                isAdmin && member.id !== currentUser.id && (
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, member.id)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemAvatar>
                <Avatar
                  src={member.avatar}
                  sx={{
                    bgcolor: 'primary.main',
                    width: 40,
                    height: 40,
                  }}
                >
                  {getInitials(member.name)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={500}>{member.name}</Typography>
                    {member.id === currentUser.id && (
                      <Chip label="You" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {member.email}
                    </Typography>
                    <Chip
                      label={member.role}
                      size="small"
                      color={getRoleColor(member.role)}
                      sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {/* Member Action Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleRoleMenuOpen}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Change Role</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleRemoveMember} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Remove Member</ListItemText>
          </MenuItem>
        </Menu>

        {/* Role Change Menu */}
        <Menu
          anchorEl={roleMenuAnchorEl}
          open={Boolean(roleMenuAnchorEl)}
          onClose={handleRoleMenuClose}
        >
          <MenuItem onClick={() => handleRoleChange('admin')}>
            <Chip label="Admin" size="small" color="error" sx={{ mr: 1 }} />
            Full access, manage team
          </MenuItem>
          <MenuItem onClick={() => handleRoleChange('member')}>
            <Chip label="Member" size="small" color="primary" sx={{ mr: 1 }} />
            View all, manage servers
          </MenuItem>
        </Menu>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Invites
            </Typography>

            <List disablePadding>
              {invites.map((invite) => (
                <ListItem
                  key={invite.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderStyle: 'dashed',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'action.disabledBackground' }}>
                      <EmailIcon color="disabled" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography color="text.secondary">{invite.email}</Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.disabled">
                          Invited {formatDate(invite.invitedAt)}
                        </Typography>
                        <Chip
                          label={invite.role}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
                        />
                      </Box>
                    }
                  />
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => onResendInvite(invite.id)}
                      >
                        Resend
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => onCancelInvite(invite.id)}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Role Legend */}
        <Divider sx={{ my: 3 }} />

        <Alert severity="info" icon={false}>
          <Typography variant="caption" component="div">
            <strong>Roles:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            <Chip label="Admin" size="small" color="error" sx={{ mr: 0.5, height: 18 }} /> Full access, manage team & settings
          </Typography>
          <Typography variant="caption" component="div">
            <Chip label="Member" size="small" color="primary" sx={{ mr: 0.5, height: 18 }} /> View all, manage servers, use AI
          </Typography>
          <Typography variant="caption" component="div">
            <Chip label="Viewer" size="small" sx={{ mr: 0.5, height: 18 }} /> View only, no modifications
          </Typography>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
