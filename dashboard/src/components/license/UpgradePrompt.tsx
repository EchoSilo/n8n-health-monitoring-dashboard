'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Rocket, Star, Sparkles } from 'lucide-react';
import { useOrganization } from '@/lib/organization';
import { TIER_NAMES, TIER_FEATURES, getNextTier, formatPrice } from '@/lib/license';
import type { FeatureFlag, LimitedResource } from '@/lib/license/types';

interface UpgradePromptProps {
  feature?: FeatureFlag;
  resource?: LimitedResource;
  variant?: 'inline' | 'card' | 'alert';
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  feature,
  resource,
  variant = 'inline',
  onUpgrade,
}: UpgradePromptProps) {
  const { license, hasFeature, canAdd } = useOrganization();

  // Check if upgrade is needed
  const tier = license?.tier || 'COMMUNITY';
  const nextTier = getNextTier(tier);

  // If already at highest tier, no upgrade needed
  if (!nextTier) return null;

  // Check specific feature/resource
  if (feature && hasFeature(feature)) return null;
  if (resource) {
    const { allowed } = canAdd(resource);
    if (allowed) return null;
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: navigate to billing page
      window.location.href = '/settings/billing';
    }
  };

  const message = feature
    ? `${feature.replace('_', ' ')} is available on ${TIER_NAMES[nextTier]} and above`
    : resource
    ? `You've reached your ${resource} limit`
    : `Upgrade to ${TIER_NAMES[nextTier]} for more features`;

  if (variant === 'alert') {
    return (
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={handleUpgrade}>
            Upgrade
          </Button>
        }
        sx={{ mb: 2 }}
      >
        <AlertTitle>Upgrade Available</AlertTitle>
        {message}. Get more with {TIER_NAMES[nextTier]}.
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <Card
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
          border: (theme) => `1px solid ${theme.palette.primary.main}30`,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Sparkles size={24} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Upgrade to {TIER_NAMES[nextTier]}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {message}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {TIER_FEATURES[nextTier].slice(0, 3).map((f) => (
                  <Chip key={f} label={f} size="small" variant="outlined" />
                ))}
              </Box>
              <Button
                variant="contained"
                startIcon={<Rocket size={16} />}
                onClick={handleUpgrade}
              >
                Upgrade Now
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        bgcolor: 'action.hover',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.selected',
        },
      }}
      onClick={handleUpgrade}
    >
      <Star size={14} />
      <Typography variant="caption" color="primary">
        Upgrade to {TIER_NAMES[nextTier]}
      </Typography>
    </Box>
  );
}

/**
 * Feature gate wrapper - shows upgrade prompt if feature not available
 */
interface FeatureGateProps {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature } = useOrganization();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return (
    fallback || (
      <Box sx={{ p: 2 }}>
        <UpgradePrompt feature={feature} variant="card" />
      </Box>
    )
  );
}

/**
 * Limit gate wrapper - shows upgrade prompt if limit reached
 */
interface LimitGateProps {
  resource: LimitedResource;
  children: React.ReactNode;
}

export function LimitGate({ resource, children }: LimitGateProps) {
  const { canAdd } = useOrganization();
  const { allowed, message } = canAdd(resource);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>Limit Reached</AlertTitle>
      {message}
      <Box sx={{ mt: 1 }}>
        <UpgradePrompt resource={resource} />
      </Box>
    </Alert>
  );
}
