'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DnsIcon from '@mui/icons-material/Dns';
import { useThemeMode } from '@/components/theme/ThemeProvider';

interface DashboardHeaderProps {
  onManageServersClick?: () => void;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onTeamMembersClick?: () => void;
  onSignOut?: () => void;
  userName?: string;
  userInitials?: string;
  userEmail?: string;
}

export function DashboardHeader({
  onManageServersClick,
  onSettingsClick,
  onProfileClick,
  onTeamMembersClick,
  onSignOut,
  userName = 'Moni',
  userInitials = 'MT',
  userEmail = 'moni@company.com',
}: DashboardHeaderProps) {
  const { toggleTheme, isDarkMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (handler?: () => void) => {
    handleClose();
    handler?.();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        mb: 4,
      }}
    >
      {/* Logo and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Logo Icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          <ShowChartIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Box>
        <Box>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1,
            }}
          >
            n8n Monitor
          </Typography>
          <Typography
            sx={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mt: 0.5,
            }}
          >
            Enterprise Dashboard
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<DnsIcon />}
          onClick={onManageServersClick}
          sx={{
            borderColor: 'divider',
            textTransform: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
            },
          }}
        >
          Manage Servers
        </Button>

        {/* Theme Toggle */}
        <IconButton
          onClick={toggleTheme}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(139, 92, 246, 0.1)'
                : 'rgba(139, 92, 246, 0.08)',
            color: 'secondary.main',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(139, 92, 246, 0.15)',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
            },
          }}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {/* User Menu */}
        <Button
          onClick={handleClick}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            px: 1.5,
            py: 0.75,
            border: 1,
            borderColor: 'divider',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
            },
          }}
          endIcon={<KeyboardArrowDownIcon />}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              mr: 1,
              bgcolor: 'primary.main',
              fontSize: '0.875rem',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
            }}
          >
            {userInitials}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {userName}
          </Typography>
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                minWidth: 200,
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {userEmail}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => handleMenuItemClick(onProfileClick)}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>My Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleMenuItemClick(onTeamMembersClick)}>
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Team Members</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleMenuItemClick(onSettingsClick)}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuItemClick(onSignOut)}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign Out</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
