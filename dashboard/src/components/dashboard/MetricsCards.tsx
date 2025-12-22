'use client';

import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import { DashboardMetrics } from '@/types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

type GlowColor = 'primary' | 'success' | 'warning' | 'error' | 'secondary';

interface MetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  badge?: {
    label: string;
    variant: 'success' | 'error' | 'warning' | 'info' | 'live';
  };
  change?: {
    value: string;
    direction: 'up' | 'down';
  };
  glowColor?: GlowColor;
}

const glowColors = {
  primary: {
    border: 'rgba(59, 130, 246, 0.3)',
    shadow: 'rgba(59, 130, 246, 0.2)',
    orb: '#3b82f6',
    iconBg: 'rgba(59, 130, 246, 0.1)',
    iconBorder: 'rgba(59, 130, 246, 0.2)',
  },
  secondary: {
    border: 'rgba(139, 92, 246, 0.3)',
    shadow: 'rgba(139, 92, 246, 0.2)',
    orb: '#8b5cf6',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    iconBorder: 'rgba(139, 92, 246, 0.2)',
  },
  success: {
    border: 'rgba(16, 185, 129, 0.3)',
    shadow: 'rgba(16, 185, 129, 0.2)',
    orb: '#10b981',
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconBorder: 'rgba(16, 185, 129, 0.2)',
  },
  warning: {
    border: 'rgba(245, 158, 11, 0.3)',
    shadow: 'rgba(245, 158, 11, 0.2)',
    orb: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconBorder: 'rgba(245, 158, 11, 0.2)',
  },
  error: {
    border: 'rgba(239, 68, 68, 0.3)',
    shadow: 'rgba(239, 68, 68, 0.2)',
    orb: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconBorder: 'rgba(239, 68, 68, 0.2)',
  },
};

const badgeStyles = {
  success: {
    bgcolor: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  error: {
    bgcolor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warning: {
    bgcolor: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  info: {
    bgcolor: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  live: {
    bgcolor: 'rgba(139, 92, 246, 0.1)',
    color: '#a78bfa',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
};

function MetricCard({
  title,
  value,
  suffix,
  icon,
  badge,
  change,
  glowColor = 'primary',
}: MetricCardProps) {
  const colors = glowColors[glowColor];

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.5)'
            : 'background.paper',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          borderColor: colors.border,
          boxShadow: `0 0 30px ${colors.shadow}`,
          '& .orb': {
            opacity: 0.2,
          },
        },
      }}
    >
      {/* Decorative blur orb */}
      <Box
        className="orb"
        sx={{
          position: 'absolute',
          top: -64,
          right: -64,
          width: 128,
          height: 128,
          borderRadius: '50%',
          bgcolor: colors.orb,
          opacity: 0.1,
          filter: 'blur(48px)',
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease-in-out',
        }}
      />

      <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5 }}>
        {/* Top row: Icon left, Badge right */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: colors.iconBg,
              border: '1px solid',
              borderColor: colors.iconBorder,
              color: colors.orb,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {badge && (
            <Chip
              size="small"
              label={
                badge.variant === 'live' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: badgeStyles[badge.variant].color,
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                        },
                      }}
                    />
                    {badge.label}
                  </Box>
                ) : (
                  badge.label
                )
              }
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 500,
                ...badgeStyles[badge.variant],
                border: '1px solid',
              }}
            />
          )}
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'text.secondary',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>

        {/* Value row */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'text.primary',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          {suffix && (
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'text.secondary',
                fontFamily: 'monospace',
              }}
            >
              {suffix}
            </Typography>
          )}
          {change && (
            <Chip
              size="small"
              icon={<TrendingDownIcon sx={{ fontSize: 14 }} />}
              label={change.value}
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 600,
                ml: 1,
                bgcolor: change.direction === 'down' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: change.direction === 'down' ? '#10b981' : '#ef4444',
                border: '1px solid',
                borderColor: change.direction === 'down' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                '& .MuiChip-icon': {
                  color: change.direction === 'down' ? '#10b981' : '#ef4444',
                  marginLeft: '4px',
                },
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  // Determine error rate status
  const errorRateStatus = metrics.errorRate > 5 ? 'error' : metrics.errorRate > 1 ? 'warning' : 'success';
  const errorRateLabel = metrics.errorRate > 5 ? 'High' : 'Normal';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 3,
        mb: 4,
      }}
    >
      <MetricCard
        title="Total Workflows"
        value={metrics.totalWorkflows.toLocaleString()}
        icon={<StorageIcon sx={{ fontSize: 20 }} />}
        glowColor="primary"
      />
      <MetricCard
        title="Active Executions"
        value={metrics.activeExecutions}
        suffix="running"
        icon={<PlayArrowIcon sx={{ fontSize: 20 }} />}
        badge={{ label: 'Live', variant: 'live' }}
        glowColor="secondary"
      />
      <MetricCard
        title="Error Rate"
        value={`${metrics.errorRate}%`}
        icon={<WarningAmberIcon sx={{ fontSize: 20 }} />}
        badge={{ label: errorRateLabel, variant: errorRateStatus }}
        change={{ value: '-2.3%', direction: 'down' }}
        glowColor={metrics.errorRate > 5 ? 'error' : 'warning'}
      />
      <MetricCard
        title="Execution Time"
        value={metrics.avgExecutionTime}
        suffix="ms"
        icon={<AccessTimeIcon sx={{ fontSize: 20 }} />}
        badge={{ label: 'Avg', variant: 'info' }}
        glowColor="warning"
      />
    </Box>
  );
}
