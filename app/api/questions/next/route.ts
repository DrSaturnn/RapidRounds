import { NextResponse } from "next/server";
import { getNextClinicalDecision } from "@/database/clinical-decisions";
import { prisma } from "@/lib/prisma";
import { toQuestionDto } from "@/lib/serializers";

export async function GET() {
  const answered = await prisma.progress.findMany({
    where: { userId: "default" },
    select: { questionId: true, clinicalDecisionId: true }
  });

  const answeredDecisionIds = new Set(
    answered.map((row) => row.clinicalDecisionId).filter((id): id is string => Boolean(id))
  );

  const decision = await getNextClinicalDecision([...answeredDecisionIds]);
  if (decision) {
    return NextResponse.json({ question: decision });
  }

  const answeredQuestionIds = new Set(
    answered.map((row) => row.questionId).filter((id): id is string => Boolean(id))
  );

  let questions = await prisma.question.findMany({
    where: answeredQuestionIds.size > 0 ? { id: { notIn: [...answeredQuestionIds] } } : undefined,
    include: { topic: true },
    take: 25
  });

  if (questions.length === 0) {
    questions = await prisma.question.findMany({
      include: { topic: true },
      take: 25
    });
  }

  if (questions.length === 0) {
    return NextResponse.json({ question: null }, { status: 404 });
  }

  const question = questions[Math.floor(Math.random() * questions.length)];

  return NextResponse.json({ question: toQuestionDto(question) });
}
