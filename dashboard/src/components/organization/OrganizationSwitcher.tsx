'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  CreditCard,
} from 'lucide-react';
import { useOrganization } from '@/lib/organization';
import { TIER_NAMES } from '@/lib/license';

interface OrganizationSwitcherProps {
  variant?: 'button' | 'compact';
  showTier?: boolean;
}

export function OrganizationSwitcher({
  variant = 'button',
  showTier = true,
}: OrganizationSwitcherProps) {
  const {
    organization,
    organizations,
    license,
    switchOrganization,
    isLoading,
  } = useOrganization();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    handleClose();
  };

  if (!organization) {
    return (
      <Button
        variant="outlined"
        startIcon={<Plus size={16} />}
        onClick={() => (window.location.href = '/onboarding')}
      >
        Create Organization
      </Button>
    );
  }

  const tier = license?.tier || 'COMMUNITY';

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        sx={{
          textTransform: 'none',
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: 'action.hover',
          color: 'text.primary',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        }}
        endIcon={<ChevronDown size={16} />}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: organization.primaryColor || 'primary.main',
              fontSize: '0.875rem',
            }}
            src={organization.logoUrl || undefined}
          >
            {organization.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={500}>
              {organization.name}
            </Typography>
            {showTier && (
              <Typography variant="caption" color="text.secondary">
                {TIER_NAMES[tier]}
              </Typography>
            )}
          </Box>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 280, mt: 1 },
        }}
      >
        {/* Current org header */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="overline" color="text.secondary">
            Current Organization
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="body1" fontWeight={500}>
              {organization.name}
            </Typography>
            <Chip
              label={TIER_NAMES[tier]}
              size="small"
              color={tier === 'ENTERPRISE' ? 'secondary' : tier === 'AGENCY' ? 'primary' : 'default'}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Role: {organization.role}
          </Typography>
        </Box>

        <Divider />

        {/* Organization list */}
        {organizations.length > 1 && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Switch Organization
              </Typography>
            </Box>
            {organizations.map((org) => (
              <MenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                selected={org.id === organization.id}
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: org.primaryColor || 'grey.500',
                      fontSize: '0.75rem',
                    }}
                    src={org.logoUrl || undefined}
                  >
                    {org.name.charAt(0)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={org.name}
                  secondary={org.role}
                />
                {org.id === organization.id && (
                  <Check size={16} color="inherit" />
                )}
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

        {/* Actions */}
        <MenuItem
          onClick={() => {
            handleClose();
            window.location.href = '/settings/organization';
          }}
        >
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          <ListItemText primary="Organization Settings" />
        </MenuItem>

        {organization.role === 'OWNER' && (
          <MenuItem
            onClick={() => {
              handleClose();
              window.location.href = '/settings/billing';
            }}
          >
            <ListItemIcon>
              <CreditCard size={18} />
            </ListItemIcon>
            <ListItemText primary="Billing & Plans" />
          </MenuItem>
        )}

        <Divider />

        <MenuItem
          onClick={() => {
            handleClose();
            window.location.href = '/settings/organization/new';
          }}
        >
          <ListItemIcon>
            <Plus size={18} />
          </ListItemIcon>
          <ListItemText primary="Create New Organization" />
        </MenuItem>
      </Menu>
    </>
  );
}
