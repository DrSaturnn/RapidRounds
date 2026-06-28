import type { ClinicalDecision } from "@prisma/client";
import { getCurriculumNode } from "@/lib/curriculum-graph";
import { resolveCurriculumContext } from "@/lib/curriculum-resolution";
import { getLearnerState, type LearnerStateSummary } from "@/lib/learner-state";
import { prisma } from "@/lib/prisma";
import { toPracticePromptDto } from "@/lib/clinical-decision-serializers";
import type { QuestionDto } from "@/types/practice";

export type AdaptiveDecisionAction =
  | "continue_new_decision"
  | "reinforce_recent_miss"
  | "revisit_weak_concept"
  | "practice_related_decision"
  | "avoid_completed_if_possible";

export type AdaptiveDecisionRecommendation = {
  decision: QuestionDto | null;
  actionType: AdaptiveDecisionAction;
  explanation: string;
};

type ClinicalDecisionOption = Pick<
  ClinicalDecision,
  "id" | "specialty" | "system" | "topic" | "clinicalPattern" | "decisionType" | "prompt" | "managementPearl" | "difficulty" | "tags" | "createdAt"
>;

type CandidateScore = {
  decision: ClinicalDecisionOption;
  score: number;
  actionType: AdaptiveDecisionAction;
  explanation: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function parseTags(tags: string) {
  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function candidateContext(decision: ClinicalDecisionOption) {
  return resolveCurriculumContext({
    topic: decision.topic,
    correctAnswer: decision.topic,
    system: decision.system,
    clinicalPattern: decision.clinicalPattern,
    decisionType: decision.decisionType,
    tags: parseTags(decision.tags)
  });
}

function linkedNodeIdsForConcept(concept: string) {
  const context = resolveCurriculumContext({ topic: concept, correctAnswer: concept });
  const nodeIds = new Set(context.nodes.map((node) => node.id));

  context.nodes.forEach((node) => {
    [...(node.successorIds ?? []), ...(node.relatedIds ?? []), ...(node.commonDistractorIds ?? [])].forEach((id) => {
      nodeIds.add(id);
    });
  });

  return nodeIds;
}

function relationshipScore(decision: ClinicalDecisionOption, concept: string) {
  const linkedIds = linkedNodeIdsForConcept(concept);
  const context = candidateContext(decision);

  return context.nodes.some((node) => linkedIds.has(node.id)) ? 1 : 0;
}

function conceptMatchScore(decision: ClinicalDecisionOption, concept: string) {
  const normalizedConcept = normalize(concept);

  return [decision.topic, decision.clinicalPattern, decision.system, decision.decisionType]
    .map(normalize)
    .some((value) => value.includes(normalizedConcept) || normalizedConcept.includes(value))
    ? 1
    : 0;
}

function requestedConceptScore(decision: ClinicalDecisionOption, requestedConcept?: string) {
  if (!requestedConcept) {
    return 0;
  }

  return Math.max(conceptMatchScore(decision, requestedConcept), relationshipScore(decision, requestedConcept));
}

function getRecentMissScore(decision: ClinicalDecisionOption, learnerState: LearnerStateSummary) {
  const recentMiss = learnerState.recentMisses[0];

  if (!recentMiss) {
    return undefined;
  }

  const score = Math.max(conceptMatchScore(decision, recentMiss.concept), relationshipScore(decision, recentMiss.concept));

  return score > 0
    ? {
        score: score + 5,
        actionType: "reinforce_recent_miss" as const,
        explanation: `Reinforcing recent miss in ${recentMiss.concept}.`
      }
    : undefined;
}

function getWeakConceptScore(decision: ClinicalDecisionOption, learnerState: LearnerStateSummary) {
  const weakConcept = learnerState.attemptsByConcept.find((concept) => concept.mastery === "needs reinforcement");

  if (!weakConcept) {
    return undefined;
  }

  const score = Math.max(conceptMatchScore(decision, weakConcept.concept), relationshipScore(decision, weakConcept.concept));

  return score > 0
    ? {
        score: score + 4,
        actionType: "revisit_weak_concept" as const,
        explanation: `Revisiting ${weakConcept.concept} because recent accuracy needs reinforcement.`
      }
    : undefined;
}

function getCurriculumRelationshipScore(decision: ClinicalDecisionOption, learnerState: LearnerStateSummary) {
  const recentCurriculumNode = learnerState.curriculumNodeSummaries[0]?.curriculumNodeId;
  const node = recentCurriculumNode ? getCurriculumNode(recentCurriculumNode) : undefined;

  if (!node) {
    return undefined;
  }

  const linkedIds = new Set([...(node.successorIds ?? []), ...(node.relatedIds ?? []), ...(node.commonDistractorIds ?? [])]);
  const context = candidateContext(decision);
  const matchingNode = context.nodes.find((item) => linkedIds.has(item.id));

  return matchingNode
    ? {
        score: 3,
        actionType: "practice_related_decision" as const,
        explanation: `Related decision selected from curriculum relationship: ${node.title} -> ${matchingNode.title}.`
      }
    : undefined;
}

function scoreDecision(
  decision: ClinicalDecisionOption,
  learnerState: LearnerStateSummary,
  completedIds: Set<string>,
  requestedConcept?: string
): CandidateScore {
  const requestedScore = requestedConceptScore(decision, requestedConcept);
  const recentMissScore = getRecentMissScore(decision, learnerState);
  const weakConceptScore = getWeakConceptScore(decision, learnerState);
  const relationshipScoreResult = getCurriculumRelationshipScore(decision, learnerState);
  const scoredOptions = [recentMissScore, weakConceptScore, relationshipScoreResult].filter(
    (item): item is Exclude<typeof item, undefined> => Boolean(item)
  );
  const strongest = scoredOptions.sort((left, right) => right.score - left.score)[0];
  const incompleteBoost = completedIds.has(decision.id) ? 0 : 2;
  const requestedBoost = requestedScore > 0 ? 6 : 0;

  if (strongest) {
    return {
      decision,
      score: strongest.score + incompleteBoost + requestedBoost,
      actionType: strongest.actionType,
      explanation: strongest.explanation
    };
  }

  return {
    decision,
    score: incompleteBoost + requestedBoost,
    actionType: completedIds.has(decision.id) ? "continue_new_decision" : "avoid_completed_if_possible",
    explanation: completedIds.has(decision.id)
      ? "No incomplete clinical decisions were available, so the engine reused the ordered fallback."
      : "Avoiding completed decision for this learner."
  };
}

export function selectAdaptiveDecision(
  learnerState: LearnerStateSummary,
  availableDecisions: ClinicalDecisionOption[],
  requestedConcept?: string
): {
  decision: ClinicalDecisionOption | null;
  actionType: AdaptiveDecisionAction;
  explanation: string;
} {
  if (availableDecisions.length === 0) {
    return {
      decision: null,
      actionType: "continue_new_decision",
      explanation: "No clinical decisions are available."
    };
  }

  const completedIds = new Set(learnerState.completedClinicalDecisionIds);
  const incomplete = availableDecisions.filter((decision) => !completedIds.has(decision.id));
  const candidatePool = incomplete.length > 0 ? incomplete : availableDecisions;
  const scored = candidatePool
    .map((decision) => scoreDecision(decision, learnerState, completedIds, requestedConcept))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.decision.difficulty - right.decision.difficulty ||
        left.decision.createdAt.getTime() - right.decision.createdAt.getTime()
    );
  const selected = scored[0];

  if (!selected) {
    return {
      decision: null,
      actionType: "continue_new_decision",
      explanation: "No clinical decisions are available."
    };
  }

  if (learnerState.totalAttempts === 0 && !requestedConcept) {
    return {
      decision: selected.decision,
      actionType: "continue_new_decision",
      explanation: "New decision selected because learner state is empty."
    };
  }

  return {
    decision: selected.decision,
    actionType: selected.actionType,
    explanation: selected.explanation
  };
}

export async function getAdaptiveDecisionRecommendation(
  learnerId: string,
  requestedConcept?: string
): Promise<AdaptiveDecisionRecommendation> {
  const [learnerState, decisions] = await Promise.all([
    getLearnerState(learnerId),
    prisma.clinicalDecision.findMany({
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      take: 250
    })
  ]);
  const selected = selectAdaptiveDecision(learnerState, decisions, requestedConcept);

  return {
    decision: selected.decision ? toPracticePromptDto(selected.decision) : null,
    actionType: selected.actionType,
    explanation: selected.explanation
  };
}
