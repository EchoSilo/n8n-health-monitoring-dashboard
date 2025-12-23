import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createN8nClient } from '@/lib/n8n-client';
import { requireScope, success, notFound, badRequest } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/servers/[id]/test - Test connection to n8n server
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'READ_SERVERS');
  if (error) return error;

  const { id } = await params;

  const server = await prisma.server.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      apiKey: true,
      apiKeyIv: true,
      skipSSL: true,
    },
  });

  if (!server) {
    return notFound('Server');
  }

  try {
    const client = createN8nClient({
      url: server.url,
      apiKey: server.apiKey,
      apiKeyIv: server.apiKeyIv,
      skipSSL: server.skipSSL,
    });

    const result = await client.testConnection();

    // Update server status based on test result
    const newStatus = result.success ? 'ONLINE' : 'OFFLINE';
    await prisma.server.update({
      where: { id },
      data: {
        status: newStatus,
        lastChecked: new Date(),
      },
    });

    return success({
      success: result.success,
      message: result.message,
      workflowCount: result.workflowCount,
      latency: result.latency,
      status: newStatus.toLowerCase(),
    });
  } catch (err) {
    console.error('Test connection error:', err);

    // Update server status to offline
    await prisma.server.update({
      where: { id },
      data: {
        status: 'OFFLINE',
        lastChecked: new Date(),
      },
    });

    return badRequest(
      err instanceof Error ? err.message : 'Failed to test connection'
    );
  }
}
