'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorInfo = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Configuration Error',
          message: 'There is a problem with the server configuration. Please contact an administrator.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have permission to access this resource.',
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'The verification link may have expired or already been used.',
        };
      case 'NoInvite':
        return {
          title: 'Invite Required',
          message: 'You need an invite to create an account. Please request one from an administrator.',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Exists',
          message: 'An account with this email already exists using a different sign-in method. Please sign in with your original method.',
        };
      case 'OAuthSignin':
      case 'OAuthCallback':
        return {
          title: 'OAuth Error',
          message: 'There was a problem signing in with your provider. Please try again.',
        };
      case 'CredentialsSignin':
        return {
          title: 'Sign In Failed',
          message: 'The email or password you entered is incorrect.',
        };
      case 'SessionRequired':
        return {
          title: 'Session Required',
          message: 'You need to be signed in to access this page.',
        };
      default:
        return {
          title: 'Authentication Error',
          message: error || 'An unknown error occurred during authentication.',
        };
    }
  };

  const errorInfo = getErrorInfo(error);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" color="error" gutterBottom>
            {errorInfo.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {errorInfo.message}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Link href="/auth/login" style={{ textDecoration: 'none' }}>
              <Button variant="contained" startIcon={<ArrowBackIcon />}>
                Back to Login
              </Button>
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function LoadingFallback() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
