import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createN8nClient } from '@/lib/n8n-client';
import { requireScope, success, notFound, badRequest } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/servers/[id]/sync - Sync workflows from n8n server
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'WRITE_SERVERS');
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

    // Fetch workflows from n8n
    const n8nWorkflows = await client.getWorkflows();

    // Get existing workflows for this server
    const existingWorkflows = await prisma.workflow.findMany({
      where: { serverId: id },
      select: { id: true, n8nId: true },
    });

    const existingN8nIds = new Set(existingWorkflows.map((w) => w.n8nId));
    const incomingN8nIds = new Set(n8nWorkflows.map((w) => w.id));

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    // Create or update workflows
    for (const workflow of n8nWorkflows) {
      const status = workflow.active ? 'ACTIVE' : 'INACTIVE';

      if (existingN8nIds.has(workflow.id)) {
        // Update existing workflow
        await prisma.workflow.updateMany({
          where: { serverId: id, n8nId: workflow.id },
          data: {
            name: workflow.name,
            status,
            active: workflow.active,
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Create new workflow
        await prisma.workflow.create({
          data: {
            serverId: id,
            n8nId: workflow.id,
            name: workflow.name,
            status,
            active: workflow.active,
          },
        });
        created++;
      }
    }

    // Mark workflows that no longer exist in n8n as inactive
    for (const existing of existingWorkflows) {
      if (!incomingN8nIds.has(existing.n8nId)) {
        await prisma.workflow.update({
          where: { id: existing.id },
          data: { status: 'INACTIVE', active: false },
        });
        deactivated++;
      }
    }

    // Update server status and last checked
    await prisma.server.update({
      where: { id },
      data: {
        status: 'ONLINE',
        lastChecked: new Date(),
      },
    });

    return success({
      message: 'Sync completed successfully',
      stats: {
        total: n8nWorkflows.length,
        created,
        updated,
        deactivated,
      },
    });
  } catch (err) {
    console.error('Sync error:', err);

    // Update server status to indicate degraded state
    await prisma.server.update({
      where: { id },
      data: {
        status: 'DEGRADED',
        lastChecked: new Date(),
      },
    });

    return badRequest(
      err instanceof Error ? err.message : 'Failed to sync workflows'
    );
  }
}
