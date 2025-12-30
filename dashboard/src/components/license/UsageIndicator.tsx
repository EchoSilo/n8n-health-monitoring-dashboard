'use client';

import React from 'react';
import { Box, LinearProgress, Typography, Tooltip, Chip } from '@mui/material';
import { useOrganization } from '@/lib/organization';
import type { LimitedResource } from '@/lib/license/types';

interface UsageIndicatorProps {
  resource: LimitedResource;
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  servers: 'Servers',
  workflows: 'Workflows',
  workspaces: 'Workspaces',
  members: 'Team Members',
};

export function UsageIndicator({
  resource,
  showLabel = true,
  size = 'medium',
}: UsageIndicatorProps) {
  const { getUsage, license } = useOrganization();
  const usage = getUsage(resource);

  // Don't show for unlimited resources
  if (usage.max === -1) {
    return (
      <Tooltip title="Unlimited">
        <Chip
          label={`${usage.current} ${RESOURCE_LABELS[resource]}`}
          size="small"
          color="success"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  // Feature disabled
  if (usage.max === 0) {
    return (
      <Tooltip title="Upgrade to enable this feature">
        <Chip
          label={`${RESOURCE_LABELS[resource]} (Upgrade)`}
          size="small"
          color="default"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  const isNearLimit = usage.percentage >= 80;
  const isAtLimit = usage.percentage >= 100;

  const color = isAtLimit ? 'error' : isNearLimit ? 'warning' : 'primary';

  return (
    <Box sx={{ width: '100%', minWidth: size === 'small' ? 100 : 150 }}>
      {showLabel && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography
            variant={size === 'small' ? 'caption' : 'body2'}
            color="text.secondary"
          >
            {RESOURCE_LABELS[resource]}
          </Typography>
          <Typography
            variant={size === 'small' ? 'caption' : 'body2'}
            color={isAtLimit ? 'error.main' : 'text.primary'}
            fontWeight={isAtLimit ? 600 : 400}
          >
            {usage.current}/{usage.max}
          </Typography>
        </Box>
      )}
      <Tooltip title={`${usage.current} of ${usage.max} ${RESOURCE_LABELS[resource].toLowerCase()} used`}>
        <LinearProgress
          variant="determinate"
          value={Math.min(usage.percentage, 100)}
          color={color}
          sx={{
            height: size === 'small' ? 4 : 8,
            borderRadius: 1,
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.08)',
          }}
        />
      </Tooltip>
    </Box>
  );
}

/**
 * Compact usage display for headers/sidebars
 */
export function UsageSummary() {
  const { license } = useOrganization();

  if (!license) return null;

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <UsageIndicator resource="servers" size="small" />
      <UsageIndicator resource="workflows" size="small" />
    </Box>
  );
}
