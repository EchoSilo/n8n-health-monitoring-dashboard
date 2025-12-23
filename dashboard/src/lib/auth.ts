import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    // Email/Password authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) {
          throw new Error('No account found with this email');
        }

        if (!user.passwordHash) {
          throw new Error('This account uses OAuth. Please sign in with Google or GitHub.');
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),

    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // GitHub OAuth
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    newUser: '/auth/welcome',
  },

  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, check if user exists or has a valid invite
      if (account?.provider !== 'credentials') {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Check if this is the first user (auto-admin)
          const userCount = await prisma.user.count();
          if (userCount === 0) {
            // First user - will be created by adapter, then promoted to admin
            return true;
          }

          // Check for valid invite
          const invite = await prisma.invite.findFirst({
            where: {
              email,
              status: 'PENDING',
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          });

          if (!invite) {
            // No invite found - deny access
            return '/auth/error?error=NoInvite';
          }

          // Invite found - allow sign in (invite will be consumed after user creation)
        }
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Refresh role from database on session update
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // First user becomes admin
      const userCount = await prisma.user.count();
      if (userCount === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
        });
      }

      // Check for and consume email invite
      const invite = await prisma.invite.findFirst({
        where: {
          email: user.email?.toLowerCase(),
          status: 'PENDING',
          type: 'EMAIL',
        },
      });

      if (invite) {
        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            useCount: { increment: 1 },
          },
        });

        // Update user role if invite specifies a different role
        if (invite.role !== 'MEMBER') {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: invite.role },
          });
        }
      }
    },
  },
};
