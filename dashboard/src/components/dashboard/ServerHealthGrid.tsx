'use client';

import { Box, Card, CardContent, Typography, Chip, Avatar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import NetworkPingIcon from '@mui/icons-material/NetworkPing';
import { Server, ServerStatus } from '@/types';

interface ServerHealthGridProps {
  servers: Server[];
  selectedServerId: string | null;
  onServerClick: (serverId: string) => void;
}

const statusConfig: Record<
  ServerStatus,
  {
    color: 'success' | 'error' | 'warning';
    icon: React.ReactElement;
    label: string;
    glow: string;
    border: string;
    orb: string;
  }
> = {
  online: {
    color: 'success',
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    label: 'Online',
    glow: 'rgba(16, 185, 129, 0.3)',
    border: 'rgba(16, 185, 129, 0.5)',
    orb: '#10b981',
  },
  offline: {
    color: 'error',
    icon: <ErrorIcon sx={{ fontSize: 14 }} />,
    label: 'Offline',
    glow: 'rgba(239, 68, 68, 0.3)',
    border: 'rgba(239, 68, 68, 0.5)',
    orb: '#ef4444',
  },
  degraded: {
    color: 'warning',
    icon: <WarningIcon sx={{ fontSize: 14 }} />,
    label: 'Degraded',
    glow: 'rgba(245, 158, 11, 0.3)',
    border: 'rgba(245, 158, 11, 0.5)',
    orb: '#f59e0b',
  },
};

function getInitials(name: string): string {
  return name
    .split(/[-\s]/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ServerHealthGrid({
  servers,
  selectedServerId,
  onServerClick,
}: ServerHealthGridProps) {
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
      {servers.map((server) => {
        const status = statusConfig[server.status];
        const isSelected = selectedServerId === server.id;

        return (
          <Card
            key={server.id}
            onClick={() => onServerClick(server.id)}
            sx={{
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderLeft: 4,
              borderLeftColor: status.orb,
              transition: 'all 0.3s ease-in-out',
              ...(isSelected && {
                borderColor: 'primary.main',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
              }),
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: status.border,
                boxShadow: `0 0 30px ${status.glow}`,
                '& .status-orb': {
                  opacity: 0.2,
                },
              },
            }}
          >
            {/* Status-colored blur orb */}
            <Box
              className="status-orb"
              sx={{
                position: 'absolute',
                top: -48,
                right: -48,
                width: 96,
                height: 96,
                borderRadius: '50%',
                bgcolor: status.orb,
                opacity: 0.08,
                filter: 'blur(30px)',
                pointerEvents: 'none',
                transition: 'opacity 0.3s ease-in-out',
              }}
            />

            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.08)',
                      color: 'text.primary',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {getInitials(server.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {server.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontFamily: 'monospace',
                        display: 'block',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {server.url.replace(/^https?:\/\//, '')}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  size="small"
                  icon={status.icon}
                  label={status.label}
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    bgcolor: `${status.orb}20`,
                    color: status.orb,
                    border: '1px solid',
                    borderColor: `${status.orb}40`,
                    '& .MuiChip-icon': {
                      marginLeft: '4px',
                      color: status.orb,
                    },
                  }}
                />
              </Box>

              {/* Stats */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Box>
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
                    WORKFLOWS
                  </Typography>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {server.workflowCount}
                  </Typography>
                </Box>
                <Box>
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
                    ERRORS (24H)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: server.errorCount > 0 ? '#ef4444' : 'text.primary',
                    }}
                  >
                    {server.errorCount}
                  </Typography>
                </Box>
              </Box>

              {/* Ping */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 2,
                  color: 'text.secondary',
                }}
              >
                <NetworkPingIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontFamily="monospace">
                  Ping: {server.status === 'offline' ? '--' : `${server.lastPing}ms`}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
