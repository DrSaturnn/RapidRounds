import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const [clinicalDecisionCount, legacyQuestionCount] = await Promise.all([
      prisma.clinicalDecision.count(),
      prisma.question.count()
    ]);
    const questionCount = clinicalDecisionCount + legacyQuestionCount;

    return NextResponse.json({
      ok: true,
      database: { connected: true },
      questionCount,
      clinicalDecisionCount,
      legacyQuestionCount
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        database: { connected: false },
        questionCount: 0
      },
      { status: 503 }
    );
  }
}
