'use client';

import { forwardRef, ReactNode } from 'react';
import { Card, CardProps, Box, styled } from '@mui/material';

type GlowColor = 'primary' | 'success' | 'warning' | 'error' | 'secondary';

interface GlassCardProps extends Omit<CardProps, 'variant'> {
  glowColor?: GlowColor;
  variant?: 'glass' | 'elevated' | 'outlined';
  showOrb?: boolean;
  orbPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  children: ReactNode;
}

const glowColors = {
  primary: {
    border: 'rgba(59, 130, 246, 0.5)',
    shadow: 'rgba(59, 130, 246, 0.3)',
    orb: '#3b82f6',
  },
  secondary: {
    border: 'rgba(139, 92, 246, 0.5)',
    shadow: 'rgba(139, 92, 246, 0.3)',
    orb: '#8b5cf6',
  },
  success: {
    border: 'rgba(16, 185, 129, 0.5)',
    shadow: 'rgba(16, 185, 129, 0.3)',
    orb: '#10b981',
  },
  warning: {
    border: 'rgba(245, 158, 11, 0.5)',
    shadow: 'rgba(245, 158, 11, 0.3)',
    orb: '#f59e0b',
  },
  error: {
    border: 'rgba(239, 68, 68, 0.5)',
    shadow: 'rgba(239, 68, 68, 0.3)',
    orb: '#ef4444',
  },
};

const orbPositions = {
  'top-right': { top: -64, right: -64 },
  'top-left': { top: -64, left: -64 },
  'bottom-right': { bottom: -64, right: -64 },
  'bottom-left': { bottom: -64, left: -64 },
};

const StyledGlassCard = styled(Card, {
  shouldForwardProp: (prop) =>
    !['glowColor', 'glassVariant', 'showOrb'].includes(prop as string),
})<{ glowColor: GlowColor; glassVariant: string }>(
  ({ theme, glowColor, glassVariant }) => ({
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    border: '1px solid',
    borderColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)',
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(30, 41, 59, 0.8)'
        : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      borderColor: glowColors[glowColor].border,
      boxShadow: `0 0 30px ${glowColors[glowColor].shadow}`,
    },
  })
);

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      glowColor = 'primary',
      variant = 'glass',
      showOrb = false,
      orbPosition = 'top-right',
      children,
      sx,
      ...props
    },
    ref
  ) => {
    const orbPos = orbPositions[orbPosition];

    return (
      <StyledGlassCard
        ref={ref}
        glowColor={glowColor}
        glassVariant={variant}
        sx={sx}
        {...props}
      >
        {/* Decorative blur orb */}
        {showOrb && (
          <Box
            sx={{
              position: 'absolute',
              ...orbPos,
              width: 128,
              height: 128,
              borderRadius: '50%',
              bgcolor: glowColors[glowColor].orb,
              opacity: 0.15,
              filter: 'blur(40px)',
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease-in-out',
            }}
          />
        )}
        {children}
      </StyledGlassCard>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
