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
  levelOfAssistanceRequired?: string | null;
  cueLevelUsed?: string | null;
  revealUsed?: boolean | null;
  schemaNodeId?: string | null;
  competency?: string | null;
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
  const recentAssistedEvents: Array<{ event: SchemaProgressEvent; matchedCase?: GeneratedRapidRoundsCase }> = [];

  for (const event of sorted) {
    const matchedCase = event.questionId ? caseById.get(event.questionId) : undefined;
    const topic = normalize(matchedCase?.topic ?? event.diagnosis);
    if (!topic) continue;

    topicAttempts.set(topic, (topicAttempts.get(topic) ?? 0) + 1);

    const assistanceLevel = event.levelOfAssistanceRequired ?? "independent";
    const isIndependentMastery =
      event.isCorrect &&
      event.answerOutcome !== "UNKNOWN" &&
      event.answerOutcome !== "REVEALED_WITHOUT_ATTEMPT" &&
      assistanceLevel === "independent";

    if (assistanceLevel !== "independent" || event.revealUsed || event.answerOutcome === "REVEALED_WITHOUT_ATTEMPT") {
      recentAssistedEvents.push({ event, matchedCase });
    }

    if (isIndependentMastery && matchedCase) {
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
    recentAssistedEvents: recentAssistedEvents.slice(0, 12),
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

function nextAvailableRank(topic: string, masteredRank: number, availableRanksByTopic: Map<string, Set<number>>) {
  const ranks = [...(availableRanksByTopic.get(topic) ?? new Set<number>())].sort((left, right) => left - right);
  return ranks.find((rank) => rank > masteredRank);
}

function progressionScore(
  candidate: GeneratedRapidRoundsCase,
  masteredRank: number,
  availableRanksByTopic: Map<string, Set<number>>
) {
  const rank = competencyRank(competencyForCase(candidate));
  const topic = normalize(candidate.topic);
  if (masteredRank < 0) {
    return rank === 0 ? 14 : -8;
  }
  if (rank === nextAvailableRank(topic, masteredRank, availableRanksByTopic)) {
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

function assistanceReviewScore(
  candidate: GeneratedRapidRoundsCase,
  assistedEvents: Array<{ event: SchemaProgressEvent; matchedCase?: GeneratedRapidRoundsCase }>
) {
  const candidateTopic = normalize(candidate.topic);
  const candidateCompetency = competencyForCase(candidate);
  const candidateNodeId = candidate.schemaNode?.id;

  let score = 0;
  assistedEvents.forEach(({ event, matchedCase }, index) => {
    const eventTopic = normalize(matchedCase?.topic ?? event.diagnosis);
    if (!eventTopic || eventTopic !== candidateTopic) {
      return;
    }

    const recencyWeight = Math.max(1, 10 - index);
    const level = event.levelOfAssistanceRequired ?? (event.revealUsed ? "revealed_without_attempt" : "independent");
    const eventCompetency = matchedCase ? competencyForCase(matchedCase) : undefined;

    if (candidateNodeId && matchedCase?.schemaNode?.id === candidateNodeId) {
      score -= 18;
    }

    if (level === "pivot_cue" && event.isCorrect) {
      if (eventCompetency && competencyRank(candidateCompetency) > competencyRank(eventCompetency)) {
        score -= 80;
      }
      score += candidateCompetency === eventCompetency ? 48 + recencyWeight : 0;
    }

    if (level === "schema_cue" && event.isCorrect) {
      if (candidateCompetency !== "recognition") {
        score -= 18;
      }
      score += candidateCompetency === "recognition" ? 16 + recencyWeight : 0;
      score += candidate.variantTemplate?.composition === "minimal_decisive_pivot" ? 8 : 0;
    }

    if (level === "decision_boundary_cue" && event.isCorrect) {
      score += candidate.variantTemplate?.composition === "context_pivot_distractors" ? 18 + recencyWeight : 0;
      score += candidate.schemaNode?.discriminatorPair.conceptB === matchedCase?.schemaNode?.discriminatorPair.conceptB ? 8 : 0;
    }

    if (level === "revealed_without_attempt" || event.revealUsed || event.answerOutcome === "REVEALED_WITHOUT_ATTEMPT") {
      if (candidateCompetency !== "recognition") {
        score -= 28;
      }
      score += candidateCompetency === "recognition" ? 20 + recencyWeight : 0;
      score += candidate.variantTemplate?.composition === "minimal_decisive_pivot" ? 10 : 0;
    }
  });

  return score;
}

function assistanceTargetPool(
  candidatePool: GeneratedRapidRoundsCase[],
  assistedEvents: Array<{ event: SchemaProgressEvent; matchedCase?: GeneratedRapidRoundsCase }>,
  focusedReview: boolean
) {
  if (focusedReview || assistedEvents.length === 0) {
    return candidatePool;
  }

  for (const { event, matchedCase } of assistedEvents) {
    if (!matchedCase) {
      continue;
    }

    const topic = normalize(matchedCase.topic);
    const eventCompetency = competencyForCase(matchedCase);
    const level = event.levelOfAssistanceRequired ?? (event.revealUsed ? "revealed_without_attempt" : "independent");
    const sameTopic = candidatePool.filter(
      (candidate) => normalize(candidate.topic) === topic && candidate.id !== matchedCase.id
    );
    let preferred: GeneratedRapidRoundsCase[] = [];

    if (level === "pivot_cue" && event.isCorrect) {
      preferred = sameTopic.filter((candidate) => competencyForCase(candidate) === eventCompetency);
    } else if (level === "schema_cue" && event.isCorrect) {
      preferred = sameTopic.filter(
        (candidate) =>
          competencyForCase(candidate) === "recognition" ||
          candidate.variantTemplate?.composition === "minimal_decisive_pivot"
      );
    } else if (level === "decision_boundary_cue" && event.isCorrect) {
      preferred = sameTopic.filter(
        (candidate) =>
          candidate.variantTemplate?.composition === "context_pivot_distractors" ||
          candidate.schemaNode?.discriminatorPair.conceptB === matchedCase.schemaNode?.discriminatorPair.conceptB
      );
    } else if (level === "revealed_without_attempt" || event.revealUsed || event.answerOutcome === "REVEALED_WITHOUT_ATTEMPT") {
      preferred = sameTopic.filter(
        (candidate) =>
          competencyForCase(candidate) === "recognition" ||
          candidate.variantTemplate?.composition === "minimal_decisive_pivot"
      );
    }

    if (preferred.length > 0) {
      return preferred;
    }
  }

  return candidatePool;
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
  const initialCandidatePool = incomplete.length > 0 ? incomplete : availableCases;
  const candidatePool = assistanceTargetPool(initialCandidatePool, progress.recentAssistedEvents, focusedReview);
  const availableRanksByTopic = new Map<string, Set<number>>();
  for (const candidate of candidatePool) {
    const topic = normalize(candidate.topic);
    const ranks = availableRanksByTopic.get(topic) ?? new Set<number>();
    ranks.add(competencyRank(competencyForCase(candidate)));
    availableRanksByTopic.set(topic, ranks);
  }
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
        progressionScore(candidate, masteredRank, availableRanksByTopic) +
        diversityScore(candidate, progress.recentCases, focusedReview) +
        assistanceReviewScore(candidate, progress.recentAssistedEvents) +
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
