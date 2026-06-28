import { NextRequest, NextResponse } from "next/server";
import { compareAnswerWithAI } from "@/lib/ai-answer-check";
import { evaluateAnswer } from "@/lib/answer-check";
import { resolveCurriculumContext } from "@/lib/curriculum-resolution";
import { getLearnerState } from "@/lib/learner-state";
import { normalizeLearnerId } from "@/lib/learner-id";
import { prisma } from "@/lib/prisma";
import { buildReasoningMemoryCoaching } from "@/lib/reasoning-memory";
import { buildTutorContent } from "@/lib/tutor-content";
import type { AnswerEvaluation, AnswerOutcome } from "@/types/practice";

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function conceptList(...values: Array<string | string[] | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function applyAiEquivalent(evaluation: AnswerEvaluation, aiMatch: boolean | null): AnswerEvaluation {
  if (evaluation.isCorrect || aiMatch !== true) {
    return evaluation;
  }

  return {
    ...evaluation,
    isCorrect: true,
    classification: "EQUIVALENT",
    learnerFacingClassification: {
      category: "Equivalent",
      message: "Semantically equivalent answer."
    },
    confidence: Math.max(evaluation.confidence, 0.8),
    requiresTeaching: false,
    partialCredit: 1,
    reason: "Answer was judged clinically equivalent by semantic review."
  };
}

function getAnswerOutcome(evaluation: AnswerEvaluation): AnswerOutcome {
  if (evaluation.isCorrect) {
    return "CORRECT";
  }

  if (evaluation.classification === "UNKNOWN") {
    return "UNKNOWN";
  }

  if (evaluation.classification === "TASK_MISMATCH") {
    return "TASK_MISMATCH";
  }

  if (evaluation.classification === "PARTIAL") {
    return "PARTIAL";
  }

  return "DECISION_ERROR";
}

function serializeList(values: string[]) {
  return JSON.stringify(values);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    questionId?: string;
    learnerId?: string;
    answer?: string;
    responseTimeMs?: number;
  };
  const learnerId = normalizeLearnerId(body.learnerId);

  if (!body.questionId || typeof body.answer !== "string") {
    return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
  }

  if (!learnerId) {
    return NextResponse.json({ error: "Learner id is required." }, { status: 400 });
  }

  const decision = await prisma.clinicalDecision.findUnique({
    where: { id: body.questionId }
  });

  if (decision) {
    const acceptedAnswers = parseJsonArray(decision.acceptedAnswers);
    const correctAnswer = acceptedAnswers[0] ?? decision.topic;
    const tags = parseJsonArray(decision.tags);
    const localEvaluation = evaluateAnswer({
      answer: body.answer,
      acceptedAnswers,
      canonicalAnswer: correctAnswer,
      expectedTask: decision.decisionType,
      clinicalConcepts: conceptList(decision.topic, decision.clinicalPattern, decision.commonTrap, tags)
    });
    const aiMatch = localEvaluation.isCorrect || localEvaluation.classification === "UNKNOWN"
      ? null
      : await compareAnswerWithAI({
          stem: decision.prompt,
          correctAnswer,
          acceptedAnswers,
          userAnswer: body.answer
        });
    const evaluation = applyAiEquivalent(localEvaluation, aiMatch);
    const isCorrect = evaluation.isCorrect;
    const answerOutcome = getAnswerOutcome(evaluation);
    const responseTimeMs = Math.max(0, Math.round(body.responseTimeMs ?? 0));
    const tutor = buildTutorContent(
      {
        ...decision,
        correctAnswer
      },
      body.answer,
      evaluation
    );
    const learnerState = await getLearnerState(learnerId);
    tutor.coaching = buildReasoningMemoryCoaching(tutor, answerOutcome, learnerState.recentReasoningAttempts);
    const curriculumContext = resolveCurriculumContext({
      topic: decision.topic,
      correctAnswer,
      system: decision.system,
      clinicalPattern: decision.clinicalPattern,
      decisionType: decision.decisionType,
      tags
    });
    const progressData = {
      clinicalDecisionId: decision.id,
      userId: learnerId,
      answer: body.answer.trim(),
      isCorrect,
      expectedAnswer: correctAnswer,
      answerOutcome,
      evaluationClassification: evaluation.classification,
      partialCredit: evaluation.partialCredit,
      confidence: evaluation.confidence,
      cognitiveErrorType: tutor.cognitiveError?.type,
      reasoningPattern: tutor.reasoningAnalysis.primaryError,
      repairType: tutor.repair.style,
      decisionType: decision.decisionType,
      curriculumNodeId: curriculumContext.primaryNode?.id,
      shelfTags: serializeList(curriculumContext.shelfTags),
      disciplineTags: serializeList(curriculumContext.disciplineTags),
      responseTimeMs,
      diagnosis: decision.topic,
      management: decision.managementPearl,
      pattern: decision.clinicalPattern
    };

    if (answerOutcome === "UNKNOWN") {
      await prisma.progress.create({
        data: progressData
      });

      return NextResponse.json({
        isCorrect,
        answerOutcome,
        correctAnswer,
        evaluation,
        boardPearl: decision.boardPearl,
        explanation: decision.pivotClue,
        tutor
      });
    }

    const [, previousStats] = await Promise.all([
      prisma.progress.create({
        data: progressData
      }),
      prisma.userStats.upsert({
        where: { userId: learnerId },
        update: {},
        create: { userId: learnerId }
      })
    ]);

    const questionsAnswered = previousStats.questionsAnswered + 1;
    const correctAnswers = previousStats.correctAnswers + (isCorrect ? 1 : 0);
    const currentStreak = isCorrect ? previousStats.currentStreak + 1 : 0;
    const longestStreak = Math.max(previousStats.longestStreak, currentStreak);
    const averageResponseTimeMs = Math.round(
      (previousStats.averageResponseTimeMs * previousStats.questionsAnswered + responseTimeMs) /
        questionsAnswered
    );

    await prisma.userStats.update({
      where: { userId: learnerId },
      data: {
        questionsAnswered,
        correctAnswers,
        currentStreak,
        longestStreak,
        averageResponseTimeMs
      }
    });

    return NextResponse.json({
      isCorrect,
      answerOutcome,
      correctAnswer,
      evaluation,
      boardPearl: decision.boardPearl,
      explanation: decision.pivotClue,
      tutor
    });
  }

  const question = await prisma.question.findUnique({
    where: { id: body.questionId },
    include: { topic: true }
  });

  if (!question) {
    return NextResponse.json({ error: "Clinical decision not found." }, { status: 404 });
  }

  const acceptedAnswers = parseJsonArray(question.acceptedAnswers);
  const localEvaluation = evaluateAnswer({
    answer: body.answer,
    acceptedAnswers,
    canonicalAnswer: question.correctAnswer,
    expectedTask: "Diagnosis",
    clinicalConcepts: conceptList(question.diagnosis, question.pattern, question.management, question.topic.name)
  });
  const aiMatch = localEvaluation.isCorrect || localEvaluation.classification === "UNKNOWN"
    ? null
    : await compareAnswerWithAI({
        stem: question.stem,
        correctAnswer: question.correctAnswer,
        acceptedAnswers,
        userAnswer: body.answer
      });
  const evaluation = applyAiEquivalent(localEvaluation, aiMatch);
  const isCorrect = evaluation.isCorrect;
  const answerOutcome = getAnswerOutcome(evaluation);
  const responseTimeMs = Math.max(0, Math.round(body.responseTimeMs ?? 0));
  const tutor = buildTutorContent(
    {
      ...question,
      topic: question.diagnosis
    },
    body.answer,
    evaluation
  );
  const learnerState = await getLearnerState(learnerId);
  tutor.coaching = buildReasoningMemoryCoaching(tutor, answerOutcome, learnerState.recentReasoningAttempts);
  const curriculumContext = resolveCurriculumContext({
    topic: question.diagnosis,
    correctAnswer: question.correctAnswer,
    clinicalPattern: question.pattern,
    decisionType: "Diagnosis",
    tags: question.tags
  });
  const progressData = {
    questionId: question.id,
    topicId: question.topicId,
    userId: learnerId,
    answer: body.answer.trim(),
    isCorrect,
    expectedAnswer: question.correctAnswer,
    answerOutcome,
    evaluationClassification: evaluation.classification,
    partialCredit: evaluation.partialCredit,
    confidence: evaluation.confidence,
    cognitiveErrorType: tutor.cognitiveError?.type,
    reasoningPattern: tutor.reasoningAnalysis.primaryError,
    repairType: tutor.repair.style,
    decisionType: "Diagnosis",
    curriculumNodeId: curriculumContext.primaryNode?.id,
    shelfTags: serializeList(curriculumContext.shelfTags),
    disciplineTags: serializeList(curriculumContext.disciplineTags),
    responseTimeMs,
    diagnosis: question.diagnosis,
    management: question.management,
    pattern: question.pattern
  };

  if (answerOutcome === "UNKNOWN") {
    await prisma.progress.create({
      data: progressData
    });

    return NextResponse.json({
      isCorrect,
      answerOutcome,
      correctAnswer: question.correctAnswer,
      evaluation,
      boardPearl: question.boardPearl,
      explanation: question.explanation,
      tutor
    });
  }

  const [, previousStats] = await Promise.all([
    prisma.progress.create({
      data: progressData
    }),
    prisma.userStats.upsert({
      where: { userId: learnerId },
      update: {},
      create: { userId: learnerId }
    })
  ]);

  const questionsAnswered = previousStats.questionsAnswered + 1;
  const correctAnswers = previousStats.correctAnswers + (isCorrect ? 1 : 0);
  const currentStreak = isCorrect ? previousStats.currentStreak + 1 : 0;
  const longestStreak = Math.max(previousStats.longestStreak, currentStreak);
  const averageResponseTimeMs = Math.round(
    (previousStats.averageResponseTimeMs * previousStats.questionsAnswered + responseTimeMs) /
      questionsAnswered
  );

  await prisma.userStats.update({
    where: { userId: learnerId },
    data: {
      questionsAnswered,
      correctAnswers,
      currentStreak,
      longestStreak,
      averageResponseTimeMs
    }
  });

  return NextResponse.json({
    isCorrect,
    answerOutcome,
    correctAnswer: question.correctAnswer,
    evaluation,
    boardPearl: question.boardPearl,
    explanation: question.explanation,
    tutor
  });
}
