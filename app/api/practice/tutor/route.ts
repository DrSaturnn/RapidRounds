import { NextRequest, NextResponse } from "next/server";
import { evaluateAnswer } from "@/lib/answer-check";
import { prisma } from "@/lib/prisma";
import { buildTutorContent } from "@/lib/tutor-content";

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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    questionId?: string;
    answer?: string;
  };

  if (!body.questionId) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const decision = await prisma.clinicalDecision.findUnique({
    where: { id: body.questionId }
  });

  if (decision) {
    const acceptedAnswers = parseJsonArray(decision.acceptedAnswers);
    const correctAnswer = acceptedAnswers[0] ?? decision.topic;
    const evaluation = typeof body.answer === "string"
      ? evaluateAnswer({
          answer: body.answer,
          acceptedAnswers,
          canonicalAnswer: correctAnswer,
          expectedTask: decision.decisionType,
          clinicalConcepts: conceptList(
            decision.topic,
            decision.clinicalPattern,
            decision.commonTrap,
            parseJsonArray(decision.tags)
          )
        })
      : undefined;

    return NextResponse.json({
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

  const question = await prisma.question.findUnique({
    where: { id: body.questionId },
    include: { topic: true }
  });

  if (!question) {
    return NextResponse.json({ error: "Clinical decision not found." }, { status: 404 });
  }

  const acceptedAnswers = parseJsonArray(question.acceptedAnswers);
  const evaluation = typeof body.answer === "string"
    ? evaluateAnswer({
        answer: body.answer,
        acceptedAnswers,
        canonicalAnswer: question.correctAnswer,
        expectedTask: "Diagnosis",
        clinicalConcepts: conceptList(question.diagnosis, question.pattern, question.management, question.topic.name)
      })
    : undefined;

  return NextResponse.json({
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
