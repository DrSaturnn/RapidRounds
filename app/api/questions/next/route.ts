import { NextResponse } from "next/server";
import { getClinicalDecisionSubjectCounts, getNextClinicalDecision } from "@/database/clinical-decisions";
import { getAdaptiveDecisionRecommendation } from "@/lib/adaptive-decision";
import { selectAdaptiveGeneratedCase } from "@/lib/adaptive-schema-scheduler";
import { normalizeLearnerId } from "@/lib/learner-id";
import { getAdaptiveTargetConcept } from "@/lib/learning-trajectory";
import { prisma } from "@/lib/prisma";
import { getGeneratedCasesForSubject, getGeneratedSubjectCounts } from "@/lib/seed-case-generator";
import { toQuestionDto } from "@/lib/serializers";

function mergeSubjectCounts(
  persistedCounts: Array<{ subject: string; count: number }>,
  generatedCounts: Array<{ subject: string; count: number }>
) {
  const countBySubject = new Map<string, number>();
  for (const item of generatedCounts) {
    countBySubject.set(item.subject, item.count);
  }
  for (const item of persistedCounts) {
    countBySubject.set(item.subject, Math.max(countBySubject.get(item.subject) ?? 0, item.count));
  }
  return [...countBySubject.entries()].map(([subject, count]) => ({ subject, count }));
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const requestedConcept = searchParams.get("concept")?.trim();
  const requestedSubject = searchParams.get("subject")?.trim();
  const requestedSessionMode = searchParams.get("sessionMode")?.trim();
  const requestedQuestionBreadth = searchParams.get("questionBreadth")?.trim();
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
            isCorrect: true,
            answerOutcome: true,
            decisionType: true,
            createdAt: true
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
            clinicalDecisionId: true,
            diagnosis: true,
            isCorrect: true,
            answerOutcome: true,
            decisionType: true,
            createdAt: true
          }
        })
      : Promise.resolve([]),
    learnerId && requestedSessionMode !== "new_concepts" && requestedSessionMode !== "rapid_round"
      ? getAdaptiveDecisionRecommendation(learnerId, requestedConcept, requestedSubject)
      : Promise.resolve(undefined),
    getClinicalDecisionSubjectCounts()
  ]);
  const responseSubjectCounts = mergeSubjectCounts(subjectCounts, getGeneratedSubjectCounts());

  const answeredDecisionIds = new Set(
    completed.map((row) => row.clinicalDecisionId).filter((id): id is string => Boolean(id))
  );

  if (adaptiveRecommendation?.decision) {
    return NextResponse.json({
      question: adaptiveRecommendation.decision,
      subjectCounts: responseSubjectCounts,
      adaptive: {
        actionType: adaptiveRecommendation.actionType,
        explanation: adaptiveRecommendation.explanation
      }
    });
  }

  const adaptiveTarget = requestedConcept || getAdaptiveTargetConcept(answered)?.concept;
  const decision = await getNextClinicalDecision([...answeredDecisionIds], adaptiveTarget, requestedSubject);
  if (decision) {
    return NextResponse.json({ question: decision, subjectCounts: responseSubjectCounts });
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
    const generatedCases = getGeneratedCasesForSubject(requestedSubject, requestedQuestionBreadth);
    const generatedSelection = selectAdaptiveGeneratedCase(generatedCases, completed, {
      mode: requestedSessionMode,
      requestedConcept
    });
    const generatedCase = generatedSelection.case;

    if (generatedCase) {
      return NextResponse.json({
        question: generatedCase.question,
        subjectCounts: responseSubjectCounts,
        adaptive: {
          actionType: "practice_related_decision",
          explanation: generatedSelection.explanation
        }
      });
    }

    return NextResponse.json({ question: null, subjectCounts: responseSubjectCounts }, { status: 404 });
  }

  const question = questions[Math.floor(Math.random() * questions.length)];

  return NextResponse.json({ question: toQuestionDto(question), subjectCounts: responseSubjectCounts });
}
