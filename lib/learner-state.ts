import { normalizeLearnerId } from "@/lib/learner-id";
import { prisma } from "@/lib/prisma";

export type MasteryLabel = "new" | "developing" | "needs reinforcement" | "improving" | "reliable";

type ProgressEvent = {
  userId: string;
  clinicalDecisionId?: string | null;
  questionId?: string | null;
  diagnosis: string;
  isCorrect: boolean;
  answerOutcome?: string | null;
  confidence?: number | null;
  cognitiveErrorType?: string | null;
  reasoningPattern?: string | null;
  decisionType?: string | null;
  curriculumNodeId?: string | null;
  shelfTags?: string | null;
  disciplineTags?: string | null;
  createdAt: Date;
};

export type ConceptStateSummary = {
  concept: string;
  attempts: number;
  correct: number;
  recentAttempts: number;
  recentCorrect: number;
  lastSeenAt?: string;
  averageConfidence?: number;
  mastery: MasteryLabel;
};

export type LearnerStateSummary = {
  learnerId: string;
  totalAttempts: number;
  completedClinicalDecisionIds: string[];
  attemptsByConcept: ConceptStateSummary[];
  attemptsByDecisionType: Array<{ decisionType: string; attempts: number }>;
  recentMisses: Array<{
    concept: string;
    answerOutcome?: string;
    reasoningPattern?: string;
    cognitiveErrorType?: string;
    createdAt: string;
  }>;
  repeatedReasoningPatterns: Array<{ pattern: string; count: number }>;
  cognitiveErrorSummaries: Array<{ type: string; count: number }>;
  lastSeenByConcept: Array<{ concept: string; lastSeenAt: string }>;
  confidenceSummaries: Array<{ concept: string; averageConfidence: number; attempts: number }>;
  shelfTagSummaries: Array<{ tag: string; attempts: number }>;
  disciplineTagSummaries: Array<{ tag: string; attempts: number }>;
  curriculumNodeSummaries: Array<{ curriculumNodeId: string; attempts: number }>;
  recentReasoningAttempts: Array<{
    cognitiveErrorType?: string | null;
    reasoningPattern?: string | null;
    answerOutcome?: string | null;
  }>;
};

function parseSerializedList(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function increment(map: Map<string, number>, key?: string | null) {
  const trimmed = key?.trim();

  if (!trimmed) {
    return;
  }

  map.set(trimmed, (map.get(trimmed) ?? 0) + 1);
}

function serializeCountMap<Key extends string>(map: Map<string, number>, label: Key): Array<Record<Key, string> & { attempts: number }> {
  const items = [...map.entries()].map(([key, attempts]) => ({
    [label]: key,
    attempts
  })) as Array<Record<Key, string> & { attempts: number }>;

  return items.sort((left, right) => right.attempts - left.attempts || left[label].localeCompare(right[label]));
}

function isScoredMiss(event: ProgressEvent) {
  return !event.isCorrect && event.answerOutcome !== "UNKNOWN";
}

function getMasteryLabel(attempts: number, correct: number, recentAttempts: number, recentCorrect: number): MasteryLabel {
  if (attempts === 0) {
    return "new";
  }

  const accuracy = correct / attempts;
  const recentAccuracy = recentAttempts > 0 ? recentCorrect / recentAttempts : accuracy;

  if (attempts < 2) {
    return accuracy > 0 ? "developing" : "new";
  }

  if (recentAccuracy < 0.5) {
    return "needs reinforcement";
  }

  if (accuracy >= 0.8 && attempts >= 3) {
    return "reliable";
  }

  if (recentAccuracy > accuracy) {
    return "improving";
  }

  return "developing";
}

function toIso(value: Date) {
  return value.toISOString();
}

export function summarizeLearnerProgress(learnerId: string, progressEvents: ProgressEvent[]): LearnerStateSummary {
  const normalizedLearnerId = normalizeLearnerId(learnerId) ?? "";
  const scopedEvents = progressEvents
    .filter((event) => event.userId === normalizedLearnerId)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const conceptMap = new Map<string, ProgressEvent[]>();
  const decisionTypeCounts = new Map<string, number>();
  const reasoningCounts = new Map<string, number>();
  const cognitiveCounts = new Map<string, number>();
  const shelfCounts = new Map<string, number>();
  const disciplineCounts = new Map<string, number>();
  const curriculumCounts = new Map<string, number>();
  const completedClinicalDecisionIds = new Set<string>();

  scopedEvents.forEach((event) => {
    const concept = event.diagnosis.trim() || "Unknown concept";
    conceptMap.set(concept, [...(conceptMap.get(concept) ?? []), event]);
    increment(decisionTypeCounts, event.decisionType);
    increment(curriculumCounts, event.curriculumNodeId);

    if (event.clinicalDecisionId) {
      completedClinicalDecisionIds.add(event.clinicalDecisionId);
    }

    if (isScoredMiss(event)) {
      increment(reasoningCounts, event.reasoningPattern);
      increment(cognitiveCounts, event.cognitiveErrorType);
    }

    parseSerializedList(event.shelfTags).forEach((tag) => increment(shelfCounts, tag));
    parseSerializedList(event.disciplineTags).forEach((tag) => increment(disciplineCounts, tag));
  });

  const attemptsByConcept = [...conceptMap.entries()]
    .map(([concept, events]) => {
      const attempts = events.length;
      const correct = events.filter((event) => event.isCorrect).length;
      const recent = events.slice(0, 5);
      const confidenceValues = events
        .map((event) => event.confidence)
        .filter((confidence): confidence is number => typeof confidence === "number");
      const averageConfidence = confidenceValues.length > 0
        ? confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length
        : undefined;

      return {
        concept,
        attempts,
        correct,
        recentAttempts: recent.length,
        recentCorrect: recent.filter((event) => event.isCorrect).length,
        lastSeenAt: toIso(events[0].createdAt),
        averageConfidence,
        mastery: getMasteryLabel(attempts, correct, recent.length, recent.filter((event) => event.isCorrect).length)
      };
    })
    .sort((left, right) => right.attempts - left.attempts || left.concept.localeCompare(right.concept));

  return {
    learnerId: normalizedLearnerId,
    totalAttempts: scopedEvents.length,
    completedClinicalDecisionIds: [...completedClinicalDecisionIds],
    attemptsByConcept,
    attemptsByDecisionType: serializeCountMap(decisionTypeCounts, "decisionType") as LearnerStateSummary["attemptsByDecisionType"],
    recentMisses: scopedEvents
      .filter(isScoredMiss)
      .slice(0, 5)
      .map((event) => ({
        concept: event.diagnosis,
        answerOutcome: event.answerOutcome ?? undefined,
        reasoningPattern: event.reasoningPattern ?? undefined,
        cognitiveErrorType: event.cognitiveErrorType ?? undefined,
        createdAt: toIso(event.createdAt)
      })),
    repeatedReasoningPatterns: [...reasoningCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((left, right) => right.count - left.count || left.pattern.localeCompare(right.pattern)),
    cognitiveErrorSummaries: [...cognitiveCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type)),
    lastSeenByConcept: attemptsByConcept
      .filter((concept) => concept.lastSeenAt)
      .map((concept) => ({ concept: concept.concept, lastSeenAt: concept.lastSeenAt as string })),
    confidenceSummaries: attemptsByConcept
      .filter((concept) => typeof concept.averageConfidence === "number")
      .map((concept) => ({
        concept: concept.concept,
        averageConfidence: Number((concept.averageConfidence as number).toFixed(2)),
        attempts: concept.attempts
      })),
    shelfTagSummaries: serializeCountMap(shelfCounts, "tag") as LearnerStateSummary["shelfTagSummaries"],
    disciplineTagSummaries: serializeCountMap(disciplineCounts, "tag") as LearnerStateSummary["disciplineTagSummaries"],
    curriculumNodeSummaries: serializeCountMap(curriculumCounts, "curriculumNodeId") as LearnerStateSummary["curriculumNodeSummaries"],
    recentReasoningAttempts: scopedEvents
      .filter(isScoredMiss)
      .slice(0, 30)
      .map((event) => ({
        cognitiveErrorType: event.cognitiveErrorType,
        reasoningPattern: event.reasoningPattern,
        answerOutcome: event.answerOutcome
      }))
  };
}

export async function getLearnerState(learnerId: string) {
  const normalizedLearnerId = normalizeLearnerId(learnerId);

  if (!normalizedLearnerId) {
    return summarizeLearnerProgress("", []);
  }

  const progress = await prisma.progress.findMany({
    where: { userId: normalizedLearnerId },
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      clinicalDecisionId: true,
      questionId: true,
      diagnosis: true,
      isCorrect: true,
      answerOutcome: true,
      confidence: true,
      cognitiveErrorType: true,
      reasoningPattern: true,
      decisionType: true,
      curriculumNodeId: true,
      shelfTags: true,
      disciplineTags: true,
      createdAt: true
    }
  });

  return summarizeLearnerProgress(normalizedLearnerId, progress);
}
