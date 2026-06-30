import { NextRequest, NextResponse } from "next/server";
import { compareAnswerWithAI } from "@/lib/ai-answer-check";
import { evaluateAnswer } from "@/lib/answer-check";
import { resolveCurriculumContext } from "@/lib/curriculum-resolution";
import {
  evaluateFoundationalRapidRoundAnswer,
  getFoundationalRapidRoundItem
} from "@/lib/foundational-rapid-round";
import { getLearnerState } from "@/lib/learner-state";
import { normalizeLearnerId } from "@/lib/learner-id";
import { prisma } from "@/lib/prisma";
import { buildReasoningMemoryCoaching } from "@/lib/reasoning-memory";
import { getGeneratedCaseById } from "@/lib/seed-case-generator";
import { buildTutorContent } from "@/lib/tutor-content";
import type { AnswerEvaluation, AnswerOutcome, LevelOfAssistanceRequired } from "@/types/practice";

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

function competencyForDecisionType(decisionType?: string | null) {
  if (/differential/i.test(decisionType ?? "")) return "differential";
  if (/complication|escalation/i.test(decisionType ?? "")) return "complications";
  if (/mechanism|risk|prognosis/i.test(decisionType ?? "")) return "transfer";
  if (/management|step|contraindication|prevention|screening|follow/i.test(decisionType ?? "")) return "management";
  return "recognition";
}

function masteryCreditForAssistance(level: LevelOfAssistanceRequired) {
  if (level === "independent") return 1;
  if (level === "pivot_cue") return 0.7;
  if (level === "schema_cue") return 0.45;
  if (level === "decision_boundary_cue") return 0.2;
  return 0;
}

function getAssistanceLevel(body: {
  levelOfAssistanceRequired?: LevelOfAssistanceRequired;
  cueLevelUsed?: string;
  revealUsed?: boolean;
}): LevelOfAssistanceRequired {
  if (body.revealUsed) return "revealed_without_attempt";
  if (
    body.levelOfAssistanceRequired === "pivot_cue" ||
    body.levelOfAssistanceRequired === "schema_cue" ||
    body.levelOfAssistanceRequired === "decision_boundary_cue"
  ) {
    return body.levelOfAssistanceRequired;
  }
  if (body.cueLevelUsed === "3") return "decision_boundary_cue";
  if (body.cueLevelUsed === "2") return "schema_cue";
  if (body.cueLevelUsed === "1") return "pivot_cue";
  return "independent";
}

function applyAssistanceCredit(evaluation: AnswerEvaluation, level: LevelOfAssistanceRequired): AnswerEvaluation {
  if (!evaluation.isCorrect) {
    return evaluation;
  }

  return {
    ...evaluation,
    partialCredit: Math.min(evaluation.partialCredit, masteryCreditForAssistance(level))
  };
}

function buildRevealEvaluation(correctAnswer: string): AnswerEvaluation {
  return {
    isCorrect: false,
    classification: "UNKNOWN",
    learnerFacingClassification: {
      category: "Unknown",
      message: "Clinical resolution revealed before an answer attempt."
    },
    canonicalAnswer: correctAnswer,
    confidence: 0,
    spellingCorrected: false,
    requiresTeaching: true,
    partialCredit: 0,
    reason: "Clinical resolution was revealed without an answer attempt."
  };
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
    cueLevelUsed?: string;
    levelOfAssistanceRequired?: LevelOfAssistanceRequired;
    answeredAfterCue?: boolean;
    revealUsed?: boolean;
  };
  const learnerId = normalizeLearnerId(body.learnerId);

  if (!body.questionId || typeof body.answer !== "string") {
    return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
  }

  if (!learnerId) {
    return NextResponse.json({ error: "Learner id is required." }, { status: 400 });
  }

  const trimmedAnswer = body.answer.trim();
  if (!trimmedAnswer && !body.revealUsed) {
    return NextResponse.json(
      { error: "Enter an answer, or use a clinical cue.", needsAnswer: true },
      { status: 422 }
    );
  }

  const assistanceLevel = getAssistanceLevel(body);
  const answeredAfterCue = Boolean(
    body.answeredAfterCue ||
      (assistanceLevel !== "independent" && assistanceLevel !== "revealed_without_attempt")
  );
  const cueLevelUsed = assistanceLevel === "independent" ? undefined : assistanceLevel;

  const foundationalItem = getFoundationalRapidRoundItem(body.questionId);
  if (foundationalItem) {
    const { isCorrect, evaluation, teaching } = evaluateFoundationalRapidRoundAnswer(
      foundationalItem,
      trimmedAnswer
    );
    const answerOutcome: AnswerOutcome = isCorrect ? "CORRECT" : "DECISION_ERROR";
    const responseTimeMs = Math.max(0, Math.round(body.responseTimeMs ?? 0));
    const curriculumContext = resolveCurriculumContext({
      topic: foundationalItem.schemaCluster,
      correctAnswer: teaching.diagnosis,
      system: foundationalItem.subject,
      clinicalPattern: foundationalItem.schemaCluster,
      decisionType: "Diagnosis",
      tags: [foundationalItem.schemaCluster, teaching.todaysDiscriminator]
    });

    await prisma.progress.create({
      data: {
        userId: learnerId,
        answer: trimmedAnswer,
        isCorrect,
        expectedAnswer: teaching.diagnosis,
        answerOutcome,
        evaluationClassification: evaluation.classification,
        partialCredit: evaluation.partialCredit,
        confidence: evaluation.confidence,
        cognitiveErrorType: isCorrect ? undefined : "Illness Script Confusion",
        reasoningPattern: isCorrect ? "Pattern Recognition Error" : "Illness Script Confusion",
        repairType: "FOUNDATIONAL_RAPID_ROUND",
        schemaNodeId: foundationalItem.id,
        competency: "recognition",
        decisionType: "Diagnosis",
        curriculumNodeId: curriculumContext.primaryNode?.id,
        shelfTags: serializeList(curriculumContext.shelfTags.length ? curriculumContext.shelfTags : [foundationalItem.subject]),
        disciplineTags: serializeList(curriculumContext.disciplineTags),
        responseTimeMs,
        diagnosis: teaching.diagnosis,
        management: teaching.discriminator.boardRule,
        pattern: foundationalItem.schemaCluster
      }
    });

    const previousStats = await prisma.userStats.upsert({
      where: { userId: learnerId },
      update: {},
      create: { userId: learnerId }
    });
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
      correctAnswer: teaching.diagnosis,
      evaluation,
      boardPearl: teaching.discriminator.boardRule,
      explanation: teaching.todaysDiscriminator,
      foundationalRapidRound: teaching,
      levelOfAssistanceRequired: "independent",
      answeredAfterCue: false,
      revealUsed: false
    });
  }

  const decision = await prisma.clinicalDecision.findUnique({
    where: { id: body.questionId }
  });

  if (decision) {
    const acceptedAnswers = parseJsonArray(decision.acceptedAnswers);
    const correctAnswer = acceptedAnswers[0] ?? decision.topic;
    const tags = parseJsonArray(decision.tags);
    const localEvaluation = body.revealUsed
      ? buildRevealEvaluation(correctAnswer)
      : evaluateAnswer({
          answer: trimmedAnswer,
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
          userAnswer: trimmedAnswer
        });
    const evaluation = applyAssistanceCredit(applyAiEquivalent(localEvaluation, aiMatch), assistanceLevel);
    const isCorrect = evaluation.isCorrect;
    const answerOutcome = body.revealUsed ? "REVEALED_WITHOUT_ATTEMPT" : getAnswerOutcome(evaluation);
    const responseTimeMs = Math.max(0, Math.round(body.responseTimeMs ?? 0));
    const tutor = buildTutorContent(
      {
        ...decision,
        correctAnswer
      },
      body.revealUsed ? "clinical cue reveal" : trimmedAnswer,
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
      answer: trimmedAnswer,
      isCorrect,
      expectedAnswer: correctAnswer,
      answerOutcome,
      evaluationClassification: evaluation.classification,
      partialCredit: evaluation.partialCredit,
      confidence: evaluation.confidence,
      cognitiveErrorType: tutor.cognitiveError?.type,
      reasoningPattern: tutor.reasoningAnalysis.primaryError,
      repairType: tutor.repair.style,
      cueLevelUsed,
      levelOfAssistanceRequired: assistanceLevel,
      answeredAfterCue,
      revealUsed: Boolean(body.revealUsed),
      competency: competencyForDecisionType(decision.decisionType),
      decisionType: decision.decisionType,
      curriculumNodeId: curriculumContext.primaryNode?.id,
      shelfTags: serializeList(curriculumContext.shelfTags),
      disciplineTags: serializeList(curriculumContext.disciplineTags),
      responseTimeMs,
      diagnosis: decision.topic,
      management: decision.managementPearl,
      pattern: decision.clinicalPattern
    };

    if (answerOutcome === "UNKNOWN" || answerOutcome === "REVEALED_WITHOUT_ATTEMPT") {
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
        tutor,
        levelOfAssistanceRequired: assistanceLevel,
        answeredAfterCue,
        revealUsed: Boolean(body.revealUsed)
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
      tutor,
      levelOfAssistanceRequired: assistanceLevel,
      answeredAfterCue,
      revealUsed: Boolean(body.revealUsed)
    });
  }

  const generatedCase = getGeneratedCaseById(body.questionId);
  if (generatedCase) {
    const acceptedAnswers = [
      generatedCase.correctAnswer,
      generatedCase.correctAnswer.toLowerCase(),
      ...generatedCase.seed.relatedConcepts.filter((concept) => concept.toLowerCase() === generatedCase.correctAnswer.toLowerCase())
    ];
    const localEvaluation = body.revealUsed
      ? buildRevealEvaluation(generatedCase.correctAnswer)
      : evaluateAnswer({
          answer: trimmedAnswer,
          acceptedAnswers,
          canonicalAnswer: generatedCase.canonicalAnswer ?? generatedCase.correctAnswer,
          displayAnswer: generatedCase.displayAnswer,
          aliases: generatedCase.aliases,
          acceptableAnswerPatterns: generatedCase.acceptableAnswerPatterns,
          unacceptableNearMisses: generatedCase.unacceptableNearMisses,
          expectedTask: generatedCase.question.decisionType,
          clinicalConcepts: conceptList(
            generatedCase.topic,
            generatedCase.schema,
            generatedCase.seed.commonTraps,
            generatedCase.seed.relatedConcepts
          )
        });
    const evaluation = applyAssistanceCredit(localEvaluation, assistanceLevel);
    const isCorrect = evaluation.isCorrect;
    const answerOutcome = body.revealUsed ? "REVEALED_WITHOUT_ATTEMPT" : getAnswerOutcome(evaluation);
    const responseTimeMs = Math.max(0, Math.round(body.responseTimeMs ?? 0));
    const tags = conceptList(
      generatedCase.seed.id,
      generatedCase.seed.schema,
      generatedCase.seed.pivotClues,
      generatedCase.seed.supportingClues,
      generatedCase.seed.contextualClues,
      generatedCase.seed.commonTraps,
      generatedCase.seed.primaryDiscriminators,
      generatedCase.seed.relatedConcepts
    );
    const decisionLike = {
      specialty: generatedCase.subject,
      system: generatedCase.subject,
      topic: generatedCase.topic,
      prompt: generatedCase.question.stem,
      correctAnswer: generatedCase.correctAnswer,
      acceptedAnswers: serializeList(acceptedAnswers),
      boardPearl: generatedCase.seed.nextTimeRule,
      tags: serializeList(tags),
      pivotClue: generatedCase.seed.pivotClues[0],
      commonTrap: generatedCase.seed.commonTraps[0],
      clinicalPattern: generatedCase.schema,
      decisionType: generatedCase.question.decisionType,
      managementPearl: generatedCase.explanation
    };
    const tutor = buildTutorContent(decisionLike, body.revealUsed ? "clinical cue reveal" : trimmedAnswer, evaluation);
    const learnerState = await getLearnerState(learnerId);
    tutor.coaching = buildReasoningMemoryCoaching(tutor, answerOutcome, learnerState.recentReasoningAttempts);
    const curriculumContext = resolveCurriculumContext({
      topic: generatedCase.topic,
      correctAnswer: generatedCase.correctAnswer,
      system: generatedCase.subject,
      clinicalPattern: generatedCase.schema,
      decisionType: generatedCase.question.decisionType,
      tags
    });

    await prisma.progress.create({
      data: {
        questionId: generatedCase.id,
        userId: learnerId,
        answer: trimmedAnswer,
        isCorrect,
        expectedAnswer: generatedCase.correctAnswer,
        answerOutcome,
        evaluationClassification: evaluation.classification,
        partialCredit: evaluation.partialCredit,
        confidence: evaluation.confidence,
        cognitiveErrorType: tutor.cognitiveError?.type,
        reasoningPattern: tutor.reasoningAnalysis.primaryError,
        repairType: tutor.repair.style,
        cueLevelUsed,
        levelOfAssistanceRequired: assistanceLevel,
        answeredAfterCue,
        revealUsed: Boolean(body.revealUsed),
        schemaNodeId: generatedCase.schemaNode?.id,
        competency: generatedCase.schemaNode?.nodeKind ?? competencyForDecisionType(generatedCase.question.decisionType),
        decisionType: generatedCase.question.decisionType,
        curriculumNodeId: curriculumContext.primaryNode?.id,
        shelfTags: serializeList(curriculumContext.shelfTags.length ? curriculumContext.shelfTags : [generatedCase.subject]),
        disciplineTags: serializeList(curriculumContext.disciplineTags),
        responseTimeMs,
        diagnosis: generatedCase.topic,
        management: generatedCase.explanation,
        pattern: generatedCase.schema
      }
    });

    if (answerOutcome !== "UNKNOWN" && answerOutcome !== "REVEALED_WITHOUT_ATTEMPT") {
      const previousStats = await prisma.userStats.upsert({
        where: { userId: learnerId },
        update: {},
        create: { userId: learnerId }
      });
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
    }

    return NextResponse.json({
      isCorrect,
      answerOutcome,
      correctAnswer: generatedCase.correctAnswer,
      evaluation,
      boardPearl: generatedCase.seed.nextTimeRule,
      explanation: generatedCase.seed.pivotClues[0],
      tutor,
      levelOfAssistanceRequired: assistanceLevel,
      answeredAfterCue,
      revealUsed: Boolean(body.revealUsed)
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
  const localEvaluation = body.revealUsed
    ? buildRevealEvaluation(question.correctAnswer)
    : evaluateAnswer({
        answer: trimmedAnswer,
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
        userAnswer: trimmedAnswer
      });
  const evaluation = applyAssistanceCredit(applyAiEquivalent(localEvaluation, aiMatch), assistanceLevel);
  const isCorrect = evaluation.isCorrect;
  const answerOutcome = body.revealUsed ? "REVEALED_WITHOUT_ATTEMPT" : getAnswerOutcome(evaluation);
  const responseTimeMs = Math.max(0, Math.round(body.responseTimeMs ?? 0));
  const tutor = buildTutorContent(
    {
      ...question,
      topic: question.diagnosis
    },
    body.revealUsed ? "clinical cue reveal" : trimmedAnswer,
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
    answer: trimmedAnswer,
    isCorrect,
    expectedAnswer: question.correctAnswer,
    answerOutcome,
    evaluationClassification: evaluation.classification,
    partialCredit: evaluation.partialCredit,
    confidence: evaluation.confidence,
    cognitiveErrorType: tutor.cognitiveError?.type,
    reasoningPattern: tutor.reasoningAnalysis.primaryError,
    repairType: tutor.repair.style,
    cueLevelUsed,
    levelOfAssistanceRequired: assistanceLevel,
    answeredAfterCue,
    revealUsed: Boolean(body.revealUsed),
    competency: competencyForDecisionType("Diagnosis"),
    decisionType: "Diagnosis",
    curriculumNodeId: curriculumContext.primaryNode?.id,
    shelfTags: serializeList(curriculumContext.shelfTags),
    disciplineTags: serializeList(curriculumContext.disciplineTags),
    responseTimeMs,
    diagnosis: question.diagnosis,
    management: question.management,
    pattern: question.pattern
  };

  if (answerOutcome === "UNKNOWN" || answerOutcome === "REVEALED_WITHOUT_ATTEMPT") {
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
      tutor,
      levelOfAssistanceRequired: assistanceLevel,
      answeredAfterCue,
      revealUsed: Boolean(body.revealUsed)
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
    tutor,
    levelOfAssistanceRequired: assistanceLevel,
    answeredAfterCue,
    revealUsed: Boolean(body.revealUsed)
  });
}
