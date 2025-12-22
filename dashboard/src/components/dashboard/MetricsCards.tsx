'use client';

import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SpeedIcon from '@mui/icons-material/Speed';
import { DashboardMetrics } from '@/types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

type GlowColor = 'primary' | 'success' | 'warning' | 'error' | 'secondary';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  warning?: boolean;
  glowColor?: GlowColor;
}

const glowColors = {
  primary: {
    border: 'rgba(59, 130, 246, 0.5)',
    shadow: 'rgba(59, 130, 246, 0.3)',
    orb: '#3b82f6',
    iconBg: 'rgba(59, 130, 246, 0.15)',
  },
  secondary: {
    border: 'rgba(139, 92, 246, 0.5)',
    shadow: 'rgba(139, 92, 246, 0.3)',
    orb: '#8b5cf6',
    iconBg: 'rgba(139, 92, 246, 0.15)',
  },
  success: {
    border: 'rgba(16, 185, 129, 0.5)',
    shadow: 'rgba(16, 185, 129, 0.3)',
    orb: '#10b981',
    iconBg: 'rgba(16, 185, 129, 0.15)',
  },
  warning: {
    border: 'rgba(245, 158, 11, 0.5)',
    shadow: 'rgba(245, 158, 11, 0.3)',
    orb: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.15)',
  },
  error: {
    border: 'rgba(239, 68, 68, 0.5)',
    shadow: 'rgba(239, 68, 68, 0.3)',
    orb: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.15)',
  },
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  warning,
  glowColor = 'primary',
}: MetricCardProps) {
  const colors = glowColors[glowColor];

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
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
          filter: 'blur(64px)',
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease-in-out',
        }}
      />

      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 2,
              bgcolor: colors.iconBg,
              color: colors.orb,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography
          sx={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            letterSpacing: '-0.025em',
          }}
        >
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {trend && (
            <Chip
              size="small"
              icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
              label={trend.value}
              sx={{
                height: 22,
                fontSize: '0.75rem',
                bgcolor: trend.isPositive
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
                color: trend.isPositive ? '#10b981' : '#ef4444',
                border: '1px solid',
                borderColor: trend.isPositive
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)',
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {warning && (
            <Chip
              size="small"
              icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
              label="High"
              sx={{
                height: 22,
                fontSize: '0.75rem',
                bgcolor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                '& .MuiChip-icon': {
                  color: 'inherit',
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
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2,
        mb: 4,
      }}
    >
      <MetricCard
        title="TOTAL WORKFLOWS"
        value={metrics.totalWorkflows.toLocaleString()}
        icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}
        trend={{ value: '+12%', isPositive: true }}
        glowColor="primary"
      />
      <MetricCard
        title="ACTIVE EXECUTIONS"
        value={metrics.activeExecutions}
        subtitle="running"
        icon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
        glowColor="secondary"
      />
      <MetricCard
        title="ERROR RATE"
        value={`${metrics.errorRate}%`}
        icon={<WarningAmberIcon sx={{ fontSize: 18 }} />}
        warning={metrics.errorRate > 5}
        glowColor={metrics.errorRate > 5 ? 'error' : 'warning'}
      />
      <MetricCard
        title="AVG EXECUTION TIME"
        value={`${metrics.avgExecutionTime}ms`}
        icon={<SpeedIcon sx={{ fontSize: 18 }} />}
        glowColor="success"
      />
    </Box>
  );
}
