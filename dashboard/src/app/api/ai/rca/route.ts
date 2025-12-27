import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireScope, success, badRequest, notFound } from '@/lib/auth-helpers';
import { createRCAEngine } from '@/lib/ai/rca-engine';
import { RCADepth } from '@/lib/ai/rca-types';

const rcaSchema = z.object({
  errorId: z.string().min(1, 'Error ID is required'),
  depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  forceRefresh: z.boolean().optional(),
});

// POST /api/ai/rca - Run Root Cause Analysis on an error
export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireScope(req, 'AI_ANALYSIS');
  if (authError) return authError;

  // Check if Anthropic API is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return badRequest(
      'RCA requires ANTHROPIC_API_KEY environment variable to be set.'
    );
  }

  try {
    const body = await req.json();
    const result = rcaSchema.safeParse(body);

    if (!result.success) {
      return badRequest('Validation failed',
        Object.fromEntries(
          Object.entries(result.error.flatten().fieldErrors)
            .map(([k, v]) => [k, v?.join(', ') || ''])
        )
      );
    }

    const { errorId, depth, forceRefresh } = result.data;

    // Check if cached RCA exists
    if (!forceRefresh) {
      const cached = await prisma.rCAAnalysis.findUnique({
        where: { errorId },
      });

      if (cached) {
        return success({
          ...formatRCAResponse(cached),
          cached: true,
        });
      }
    }

    // Verify error exists
    const errorLog = await prisma.errorLog.findUnique({
      where: { id: errorId },
      select: { id: true },
    });

    if (!errorLog) {
      return notFound('Error');
    }

    // Run RCA analysis
    const engine = createRCAEngine();
    const rcaResult = await engine.analyze(errorId, { depth: depth as RCADepth });

    // Store result in database (cast arrays to JSON for Prisma)
    const stored = await prisma.rCAAnalysis.upsert({
      where: { errorId },
      create: {
        errorId,
        symptom: rcaResult.fiveWhys.symptom,
        fiveWhysData: JSON.parse(JSON.stringify(rcaResult.fiveWhys.whys)),
        rootCause: rcaResult.fiveWhys.rootCause,
        gapAnalysisData: JSON.parse(JSON.stringify(rcaResult.gapAnalysis.safetyNets)),
        quickWins: JSON.parse(JSON.stringify(rcaResult.recommendations.quickWins)),
        mediumTerm: JSON.parse(JSON.stringify(rcaResult.recommendations.mediumTerm)),
        longTerm: JSON.parse(JSON.stringify(rcaResult.recommendations.longTerm)),
        errorCategory: rcaResult.errorCategory,
        errorPattern: rcaResult.errorPattern,
        confidence: rcaResult.confidence,
        dataSource: rcaResult.dataSource,
        provider: rcaResult.provider,
        model: rcaResult.model,
        skillsUsed: rcaResult.skillsUsed,
        tokenUsage: rcaResult.tokenUsage || null,
        rawResponse: rcaResult.rawResponse as object || null,
      },
      update: {
        symptom: rcaResult.fiveWhys.symptom,
        fiveWhysData: JSON.parse(JSON.stringify(rcaResult.fiveWhys.whys)),
        rootCause: rcaResult.fiveWhys.rootCause,
        gapAnalysisData: JSON.parse(JSON.stringify(rcaResult.gapAnalysis.safetyNets)),
        quickWins: JSON.parse(JSON.stringify(rcaResult.recommendations.quickWins)),
        mediumTerm: JSON.parse(JSON.stringify(rcaResult.recommendations.mediumTerm)),
        longTerm: JSON.parse(JSON.stringify(rcaResult.recommendations.longTerm)),
        errorCategory: rcaResult.errorCategory,
        errorPattern: rcaResult.errorPattern,
        confidence: rcaResult.confidence,
        dataSource: rcaResult.dataSource,
        provider: rcaResult.provider,
        model: rcaResult.model,
        skillsUsed: rcaResult.skillsUsed,
        tokenUsage: rcaResult.tokenUsage || null,
        rawResponse: rcaResult.rawResponse as object || null,
      },
    });

    return success({
      ...formatRCAResponse(stored),
      cached: false,
    });
  } catch (err) {
    console.error('RCA analysis error:', err);
    return badRequest(
      err instanceof Error ? err.message : 'Failed to run RCA analysis'
    );
  }
}

// GET /api/ai/rca?errorId=xxx - Get cached RCA analysis
export async function GET(req: NextRequest) {
  const { error: authError } = await requireScope(req, 'READ_ERRORS');
  if (authError) return authError;

  const errorId = req.nextUrl.searchParams.get('errorId');

  if (!errorId) {
    return badRequest('errorId query parameter is required');
  }

  const rca = await prisma.rCAAnalysis.findUnique({
    where: { errorId },
  });

  if (!rca) {
    return notFound('RCA Analysis');
  }

  return success(formatRCAResponse(rca));
}

/**
 * Format RCA database record for API response
 */
function formatRCAResponse(rca: {
  id: string;
  errorId: string;
  symptom: string;
  fiveWhysData: unknown;
  rootCause: string;
  gapAnalysisData: unknown;
  quickWins: unknown;
  mediumTerm: unknown;
  longTerm: unknown;
  errorCategory: string;
  errorPattern: string;
  confidence: number;
  dataSource: string;
  provider: string;
  model: string;
  skillsUsed: unknown;
  tokenUsage: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rca.id,
    errorId: rca.errorId,
    fiveWhys: {
      symptom: rca.symptom,
      whys: rca.fiveWhysData,
      rootCause: rca.rootCause,
    },
    gapAnalysis: {
      safetyNets: rca.gapAnalysisData,
    },
    recommendations: {
      quickWins: rca.quickWins,
      mediumTerm: rca.mediumTerm,
      longTerm: rca.longTerm,
    },
    errorCategory: rca.errorCategory,
    errorPattern: rca.errorPattern,
    confidence: rca.confidence,
    dataSource: rca.dataSource,
    provider: rca.provider,
    model: rca.model,
    skillsUsed: rca.skillsUsed,
    tokenUsage: rca.tokenUsage,
    createdAt: rca.createdAt,
    updatedAt: rca.updatedAt,
  };
}
