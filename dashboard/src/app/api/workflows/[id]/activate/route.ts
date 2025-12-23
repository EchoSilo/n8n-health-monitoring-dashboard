import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createN8nClient } from '@/lib/n8n-client';
import { requireScope, success, notFound, badRequest } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/workflows/[id]/activate - Activate workflow on n8n
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireScope(req, 'WRITE_WORKFLOWS');
  if (error) return error;

  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      server: {
        select: {
          id: true,
          url: true,
          apiKey: true,
          apiKeyIv: true,
          skipSSL: true,
        },
      },
    },
  });

  if (!workflow) {
    return notFound('Workflow');
  }

  try {
    const client = createN8nClient({
      url: workflow.server.url,
      apiKey: workflow.server.apiKey,
      apiKeyIv: workflow.server.apiKeyIv,
      skipSSL: workflow.server.skipSSL,
    });

    await client.activateWorkflow(workflow.n8nId);

    // Update local status
    await prisma.workflow.update({
      where: { id },
      data: {
        active: true,
        status: 'ACTIVE',
      },
    });

    return success({
      message: 'Workflow activated successfully',
      workflow: {
        id: workflow.id,
        n8nId: workflow.n8nId,
        name: workflow.name,
        active: true,
        status: 'active',
      },
    });
  } catch (err) {
    console.error('Activate workflow error:', err);
    return badRequest(
      err instanceof Error ? err.message : 'Failed to activate workflow'
    );
  }
}
