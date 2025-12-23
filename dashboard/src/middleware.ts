import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/error',
  '/auth/verify-email',
];

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth',
  '/api/health',
  '/api/invites/accept',
];

// Routes that require admin role
const adminRoutes = ['/admin', '/api/users', '/api/invites'];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Check for API key header (allow API key auth to bypass session check)
    const apiKey = req.headers.get('x-api-key');
    if (apiKey && pathname.startsWith('/api/')) {
      // API key authentication is handled in route handlers
      return NextResponse.next();
    }

    // Check admin routes
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (publicRoutes.some((route) => pathname.startsWith(route))) {
          return true;
        }

        // Allow public API routes
        if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
          return true;
        }

        // Allow static files and Next.js internals
        if (
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon') ||
          pathname.includes('.')
        ) {
          return true;
        }

        // Allow API routes with API key (actual auth check in route handlers)
        if (pathname.startsWith('/api/') && req.headers.get('x-api-key')) {
          return true;
        }

        // Require session for all other routes
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/login',
      error: '/auth/error',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
