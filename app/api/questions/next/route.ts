import { NextResponse } from "next/server";
import { getClinicalDecisionSubjectCounts, getNextClinicalDecision } from "@/database/clinical-decisions";
import { getAdaptiveDecisionRecommendation } from "@/lib/adaptive-decision";
import { normalizeLearnerId } from "@/lib/learner-id";
import { getAdaptiveTargetConcept } from "@/lib/learning-trajectory";
import { prisma } from "@/lib/prisma";
import { toQuestionDto } from "@/lib/serializers";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const requestedConcept = searchParams.get("concept")?.trim();
  const requestedSubject = searchParams.get("subject")?.trim();
  const learnerId = normalizeLearnerId(searchParams.get("learnerId"));
  const [answered, completed, adaptiveRecommendation, subjectCounts] = await Promise.all([
    learnerId
      ? prisma.progress.findMany({
          where: { userId: learnerId },
          select: {
            questionId: true,
            clinicalDecisionId: true,
            diagnosis: true,
            answer: true,
            isCorrect: true
          },
          orderBy: { createdAt: "desc" },
          take: 20
        })
      : Promise.resolve([]),
    learnerId
      ? prisma.progress.findMany({
          where: { userId: learnerId },
          select: {
            questionId: true,
            clinicalDecisionId: true
          }
        })
      : Promise.resolve([]),
    learnerId ? getAdaptiveDecisionRecommendation(learnerId, requestedConcept, requestedSubject) : Promise.resolve(undefined),
    getClinicalDecisionSubjectCounts()
  ]);

  const answeredDecisionIds = new Set(
    completed.map((row) => row.clinicalDecisionId).filter((id): id is string => Boolean(id))
  );

  if (adaptiveRecommendation?.decision) {
    return NextResponse.json({
      question: adaptiveRecommendation.decision,
      subjectCounts,
      adaptive: {
        actionType: adaptiveRecommendation.actionType,
        explanation: adaptiveRecommendation.explanation
      }
    });
  }

  const adaptiveTarget = requestedConcept || getAdaptiveTargetConcept(answered)?.concept;
  const decision = await getNextClinicalDecision([...answeredDecisionIds], adaptiveTarget, requestedSubject);
  if (decision) {
    return NextResponse.json({ question: decision, subjectCounts });
  }

  const answeredQuestionIds = new Set(
    completed.map((row) => row.questionId).filter((id): id is string => Boolean(id))
  );

  let questions = await prisma.question.findMany({
    where: {
      ...(requestedSubject ? { specialty: requestedSubject } : {}),
      ...(answeredQuestionIds.size > 0 ? { id: { notIn: [...answeredQuestionIds] } } : {})
    },
    include: { topic: true },
    take: 25
  });

  if (questions.length === 0) {
    questions = await prisma.question.findMany({
      where: requestedSubject ? { specialty: requestedSubject } : undefined,
      include: { topic: true },
      take: 25
    });
  }

  if (questions.length === 0) {
    return NextResponse.json({ question: null, subjectCounts }, { status: 404 });
  }

  const question = questions[Math.floor(Math.random() * questions.length)];

  return NextResponse.json({ question: toQuestionDto(question), subjectCounts });
}
