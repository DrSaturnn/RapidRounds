import { normalizeAnswer } from "@/lib/answer-check";
import { getConceptGraph } from "@/lib/concept-graph";

export type LearningTrajectoryItem = {
  concept: string;
  reason: string;
  priority: "recommended" | "explore";
};

type LearningTrajectoryInput = {
  correctAnswer: string;
  wasCorrect?: boolean;
  comparisonConcept?: string;
  managementConcept?: string;
};

type ProgressSignal = {
  diagnosis: string;
  answer: string;
  isCorrect: boolean;
};

const learningChains: Record<string, string[]> = {
  "gestational hypertension": [
    "Gestational hypertension",
    "Preeclampsia without severe features",
    "Preeclampsia with severe features",
    "HELLP syndrome",
    "Eclampsia"
  ],
  "preeclampsia without severe feature": [
    "Preeclampsia without severe features",
    "Preeclampsia with severe features",
    "Magnesium sulfate",
    "HELLP syndrome",
    "Eclampsia"
  ],
  "preeclampsia with severe feature": [
    "Preeclampsia with severe features",
    "Magnesium sulfate",
    "Severe hypertension treatment",
    "HELLP syndrome",
    "Eclampsia"
  ],
  "magnesium sulfate": [
    "Magnesium sulfate",
    "Eclampsia",
    "HELLP syndrome",
    "Severe hypertension treatment"
  ],
  "placental abruption": [
    "Placental abruption",
    "Placenta previa",
    "Placenta previa evaluation",
    "Vasa previa",
    "Uterine rupture"
  ],
  "placenta previa": [
    "Placenta previa",
    "Placenta previa evaluation",
    "Placental abruption",
    "Vasa previa"
  ],
  "ectopic pregnancy": [
    "Ectopic pregnancy",
    "Methotrexate criteria",
    "Surgical management",
    "Rh immune globulin"
  ],
  "vulvovaginal candidiasis": [
    "Vulvovaginal candidiasis",
    "Bacterial vaginosis",
    "Trichomoniasis"
  ],
  "bacterial vaginosis": [
    "Bacterial vaginosis",
    "Vulvovaginal candidiasis",
    "Trichomoniasis"
  ],
  "category i fetal tracing": [
    "Category I fetal tracing",
    "Category II tracing",
    "Category III tracing",
    "Intrauterine resuscitation"
  ]
};

export const conceptSearchAliases: Record<string, string[]> = {
  "Severe features": ["Preeclampsia with severe features", "HELLP syndrome"],
  "Magnesium prophylaxis": ["Magnesium sulfate"],
  "Calcium gluconate": ["Magnesium sulfate"],
  "Severe preeclampsia vs HELLP": ["Preeclampsia with severe features", "HELLP syndrome"],
  "Methotrexate criteria": ["Ectopic pregnancy"],
  "Surgical management": ["Ectopic pregnancy"],
  "Intrauterine resuscitation": ["Category II tracing", "Category III tracing"],
  "Delivery timing": ["Preeclampsia without severe features", "Preeclampsia with severe features"]
};

function uniqueItems(items: LearningTrajectoryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeAnswer(item.concept);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function nextInChain(correctAnswer: string) {
  const key = normalizeAnswer(correctAnswer);
  const chain = learningChains[key];
  if (!chain) {
    return undefined;
  }

  const currentIndex = chain.findIndex((concept) => normalizeAnswer(concept) === key);
  return chain[currentIndex + 1] ?? chain[1];
}

export function getLearningTrajectory({
  correctAnswer,
  wasCorrect,
  comparisonConcept,
  managementConcept
}: LearningTrajectoryInput) {
  const graph = getConceptGraph({ correctAnswer, comparisonConcept, managementConcept });
  const recommendedConcept = nextInChain(correctAnswer) ?? graph.relatedConcepts[0] ?? graph.managementConcepts[0];
  const recommendationReason = wasCorrect === false
    ? `Recommended because you missed ${graph.primaryConcept}.`
    : recommendedConcept
      ? `Builds directly on ${graph.primaryConcept}.`
      : `Continue strengthening ${graph.primaryConcept}.`;

  return {
    primaryConcept: graph.primaryConcept,
    recommendation: recommendedConcept
      ? {
          concept: recommendedConcept,
          reason: recommendationReason,
          priority: "recommended" as const
        }
      : undefined,
    items: uniqueItems([
      ...(recommendedConcept
        ? [{ concept: recommendedConcept, reason: recommendationReason, priority: "recommended" as const }]
        : []),
      ...graph.relatedConcepts.slice(0, 2).map((concept) => ({
        concept,
        reason: `Frequently confused with ${graph.primaryConcept}.`,
        priority: "explore" as const
      })),
      ...graph.managementConcepts.slice(0, 3).map((concept) => ({
        concept,
        reason: `Strengthens management around ${graph.primaryConcept}.`,
        priority: "explore" as const
      }))
    ]).slice(0, 5)
  };
}

export function getAdaptiveTargetConcept(progress: ProgressSignal[]) {
  const recentMiss = progress.find((row) => !row.isCorrect);
  if (recentMiss) {
    return {
      concept: recentMiss.diagnosis,
      reason: `Recommended because you missed ${recentMiss.diagnosis}.`
    };
  }

  const latest = progress[0];
  if (!latest) {
    return undefined;
  }

  const trajectory = getLearningTrajectory({
    correctAnswer: latest.diagnosis,
    wasCorrect: latest.isCorrect
  });

  return trajectory.recommendation
    ? {
        concept: trajectory.recommendation.concept,
        reason: trajectory.recommendation.reason
      }
    : undefined;
}

export function getConceptSearchTerms(concept: string) {
  return [concept, ...(conceptSearchAliases[concept] ?? [])];
}
