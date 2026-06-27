import { NextRequest, NextResponse } from "next/server";
import { compareAnswerWithAI } from "@/lib/ai-answer-check";
import { evaluateAnswer } from "@/lib/answer-check";
import { prisma } from "@/lib/prisma";
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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    questionId?: string;
    answer?: string;
    responseTimeMs?: number;
  };

  if (!body.questionId || typeof body.answer !== "string") {
    return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
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

    if (answerOutcome === "UNKNOWN") {
      return NextResponse.json({
        isCorrect,
        answerOutcome,
        correctAnswer,
        evaluation,
        boardPearl: decision.boardPearl,
        explanation: decision.pivotClue,
        tutor: buildTutorContent(
          {
            ...decision,
            correctAnswer
          },
          body.answer,
          evaluation
        )
      });
    }

    const [, previousStats] = await Promise.all([
      prisma.progress.create({
        data: {
          clinicalDecisionId: decision.id,
          userId: "default",
          answer: body.answer.trim(),
          isCorrect,
          responseTimeMs,
          diagnosis: decision.topic,
          management: decision.managementPearl,
          pattern: decision.clinicalPattern
        }
      }),
      prisma.userStats.upsert({
        where: { userId: "default" },
        update: {},
        create: { userId: "default" }
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
      where: { userId: "default" },
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
      tutor: isCorrect
        ? undefined
        : buildTutorContent(
            {
              ...decision,
              correctAnswer
            },
            body.answer,
            evaluation
          )
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

  if (answerOutcome === "UNKNOWN") {
    return NextResponse.json({
      isCorrect,
      answerOutcome,
      correctAnswer: question.correctAnswer,
      evaluation,
      boardPearl: question.boardPearl,
      explanation: question.explanation,
      tutor: buildTutorContent(
        {
          ...question,
          topic: question.diagnosis
        },
        body.answer,
        evaluation
      )
    });
  }

  const [, previousStats] = await Promise.all([
    prisma.progress.create({
      data: {
        questionId: question.id,
        topicId: question.topicId,
        userId: "default",
        answer: body.answer.trim(),
        isCorrect,
        responseTimeMs,
        diagnosis: question.diagnosis,
        management: question.management,
        pattern: question.pattern
      }
    }),
    prisma.userStats.upsert({
      where: { userId: "default" },
      update: {},
      create: { userId: "default" }
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
    where: { userId: "default" },
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
    tutor: isCorrect
      ? undefined
      : buildTutorContent(
          {
            ...question,
            topic: question.diagnosis
          },
          body.answer,
          evaluation
        )
  });
}
