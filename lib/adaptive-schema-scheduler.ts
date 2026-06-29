import type { GeneratedRapidRoundsCase } from "@/lib/subject-seeds/seed-types";

export type SchemaSchedulerMode =
  | "adaptive"
  | "new_concepts"
  | "weak_areas"
  | "review"
  | "rapid_round"
  | "comprehensive"
  | string;

export type SchemaProgressEvent = {
  questionId?: string | null;
  diagnosis?: string | null;
  decisionType?: string | null;
  isCorrect: boolean;
  answerOutcome?: string | null;
  createdAt?: Date | string | null;
};

export type AdaptiveGeneratedCaseSelection = {
  case: GeneratedRapidRoundsCase | undefined;
  explanation: string;
};

type Competency = "recognition" | "differential" | "management" | "complications" | "transfer";

const competencyOrder: Competency[] = ["recognition", "differential", "management", "complications", "transfer"];

function competencyForCase(candidate: GeneratedRapidRoundsCase): Competency {
  const kind = candidate.schemaNode?.nodeKind;
  if (kind === "differential_diagnosis") return "differential";
  if (kind === "complication_recognition" || kind === "escalation") return "complications";
  if (kind === "mechanism" || kind === "risk_factor_interpretation" || kind === "prognosis") return "transfer";
  if (
    kind === "management" ||
    kind === "next_best_step" ||
    kind === "contraindication" ||
    kind === "disposition" ||
    kind === "follow_up" ||
    kind === "screening"
  ) {
    return "management";
  }
  return "recognition";
}

function competencyRank(competency: Competency) {
  return competencyOrder.indexOf(competency);
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function dateValue(value?: Date | string | null) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : Date.parse(value) || 0;
}

function isFocusedReview(mode?: SchemaSchedulerMode, requestedConcept?: string | null) {
  return Boolean(requestedConcept?.trim()) || mode === "weak_areas" || mode === "review";
}

function summarizeProgress(progressEvents: SchemaProgressEvent[], availableCases: GeneratedRapidRoundsCase[]) {
  const caseById = new Map(availableCases.map((candidate) => [candidate.id, candidate]));
  const sorted = [...progressEvents].sort((left, right) => dateValue(right.createdAt) - dateValue(left.createdAt));
  const completedIds = new Set(sorted.map((event) => event.questionId).filter((id): id is string => Boolean(id)));
  const topicAttempts = new Map<string, number>();
  const topicCorrectCompetencies = new Map<string, Set<Competency>>();

  for (const event of sorted) {
    const matchedCase = event.questionId ? caseById.get(event.questionId) : undefined;
    const topic = normalize(matchedCase?.topic ?? event.diagnosis);
    if (!topic) continue;

    topicAttempts.set(topic, (topicAttempts.get(topic) ?? 0) + 1);

    if (event.isCorrect && event.answerOutcome !== "UNKNOWN" && matchedCase) {
      const competency = competencyForCase(matchedCase);
      const competencies = topicCorrectCompetencies.get(topic) ?? new Set<Competency>();
      competencies.add(competency);
      topicCorrectCompetencies.set(topic, competencies);
    }
  }

  return {
    completedIds,
    topicAttempts,
    topicCorrectCompetencies,
    recentCases: sorted
      .map((event) => event.questionId ? caseById.get(event.questionId) : undefined)
      .filter((candidate): candidate is GeneratedRapidRoundsCase => Boolean(candidate))
      .slice(0, 8)
  };
}

function highestMasteredRank(topic: string, topicCorrectCompetencies: Map<string, Set<Competency>>) {
  const mastered = topicCorrectCompetencies.get(topic);
  if (!mastered || mastered.size === 0) {
    return -1;
  }

  return Math.max(...[...mastered].map(competencyRank));
}

function progressionScore(candidate: GeneratedRapidRoundsCase, masteredRank: number) {
  const rank = competencyRank(competencyForCase(candidate));
  if (masteredRank < 0) {
    return rank === 0 ? 14 : -8;
  }
  if (rank === masteredRank + 1) {
    return 24;
  }
  if (rank <= masteredRank) {
    return -4;
  }
  return -12;
}

function diversityScore(candidate: GeneratedRapidRoundsCase, recentCases: GeneratedRapidRoundsCase[], focusedReview: boolean) {
  const candidateNodeId = candidate.schemaNode?.id;
  const candidateTopic = normalize(candidate.topic);
  const candidateCompetency = competencyForCase(candidate);
  const mostRecent = recentCases[0];

  let score = 0;
  if (mostRecent?.schemaNode?.id && candidateNodeId === mostRecent.schemaNode.id && !focusedReview) {
    score -= 1000;
  }

  recentCases.forEach((recentCase, index) => {
    const recencyWeight = Math.max(1, 8 - index);
    if (normalize(recentCase.topic) === candidateTopic && !focusedReview) {
      score -= recencyWeight * 2;
    }
    if (competencyForCase(recentCase) === candidateCompetency) {
      score -= Math.ceil(recencyWeight / 2);
    }
    if (recentCase.schemaNode?.discriminatorPair.conceptB === candidate.schemaNode?.discriminatorPair.conceptB) {
      score += 1;
    }
  });

  return score;
}

export function selectAdaptiveGeneratedCase(
  availableCases: GeneratedRapidRoundsCase[],
  progressEvents: SchemaProgressEvent[],
  options: {
    mode?: SchemaSchedulerMode;
    requestedConcept?: string | null;
  } = {}
): AdaptiveGeneratedCaseSelection {
  if (availableCases.length === 0) {
    return {
      case: undefined,
      explanation: "No generated cases are available."
    };
  }

  const progress = summarizeProgress(progressEvents, availableCases);
  const focusedReview = isFocusedReview(options.mode, options.requestedConcept);
  const incomplete = availableCases.filter((candidate) => !progress.completedIds.has(candidate.id));
  const candidatePool = incomplete.length > 0 ? incomplete : availableCases;
  const leastTopicAttempts = Math.min(
    ...candidatePool.map((candidate) => progress.topicAttempts.get(normalize(candidate.topic)) ?? 0)
  );

  const scored = candidatePool
    .map((candidate) => {
      const topic = normalize(candidate.topic);
      const masteredRank = highestMasteredRank(topic, progress.topicCorrectCompetencies);
      const topicAttempts = progress.topicAttempts.get(topic) ?? 0;
      const competency = competencyForCase(candidate);
      const score =
        (progress.completedIds.has(candidate.id) ? -100 : 50) +
        progressionScore(candidate, masteredRank) +
        diversityScore(candidate, progress.recentCases, focusedReview) +
        (topicAttempts === leastTopicAttempts ? 10 : 0) -
        topicAttempts * (focusedReview ? 0.25 : 1.5) +
        (candidate.schemaNode?.estimatedYield ?? 0) / 4;

      return {
        candidate,
        competency,
        score,
        topicAttempts,
        masteredRank
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.topicAttempts - right.topicAttempts ||
        competencyRank(left.competency) - competencyRank(right.competency) ||
        left.candidate.id.localeCompare(right.candidate.id)
    );

  const selected = scored[0];
  if (!selected) {
    return {
      case: undefined,
      explanation: "No generated cases are available after adaptive filtering."
    };
  }

  const topic = selected.candidate.topic;
  const competency = selected.competency;
  const priorCompetency = selected.masteredRank >= 0 ? competencyOrder[selected.masteredRank] : undefined;

  return {
    case: selected.candidate,
    explanation: priorCompetency
      ? `Selected ${competency} work for ${topic} after ${priorCompetency} mastery, while spacing recent schemas.`
      : `Selected ${competency} work for ${topic} to build the next reasoning competency.`
  };
}
