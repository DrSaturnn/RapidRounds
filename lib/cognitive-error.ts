import { normalizeAnswer } from "@/lib/answer-check";
import type { AnswerEvaluation, CognitiveError, CognitiveErrorType } from "@/types/practice";

type CognitiveErrorDecision = {
  topic?: string;
  correctAnswer: string;
  decisionType?: string;
  clinicalPattern?: string;
  pivotClue?: string;
  commonTrap?: string;
  tags: string;
};

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function sentence(value?: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function includesAny(value: string, terms: string[]) {
  const normalized = normalizeAnswer(value);
  return terms.some((term) => {
    const candidate = normalizeAnswer(term);
    return candidate.length > 0 && normalized.includes(candidate);
  });
}

function sharesClinicalSignal(decision: CognitiveErrorDecision, answer: string) {
  return includesAny(answer, [
    sentence(decision.clinicalPattern),
    sentence(decision.topic),
    ...parseJsonArray(decision.tags)
  ]);
}

function matchesTrap(decision: CognitiveErrorDecision, answer: string) {
  const trap = normalizeAnswer(decision.commonTrap ?? "");
  const normalizedAnswer = normalizeAnswer(answer);

  return trap.length > 0 && (normalizedAnswer.includes(trap) || trap.includes(normalizedAnswer));
}

function determineCognitiveErrorType(
  decision: CognitiveErrorDecision,
  learnerAnswer: string,
  evaluation?: AnswerEvaluation
): CognitiveErrorType | undefined {
  if (!evaluation || evaluation.isCorrect) {
    return undefined;
  }

  const answer = normalizeAnswer(learnerAnswer);
  const correct = normalizeAnswer(decision.correctAnswer);
  const topic = normalizeAnswer(decision.topic ?? "");
  const pivot = normalizeAnswer(decision.pivotClue ?? "");
  const decisionType = sentence(decision.decisionType);

  if (evaluation.classification === "UNKNOWN") {
    return "Knowledge Gap";
  }

  if (decisionType === "Contraindication") {
    return "Contraindication Error";
  }

  if (answer.includes("chronic") || pivot.includes("weeks") || pivot.includes("gestation")) {
    if (correct.includes("gestational") || topic.includes("gestational")) {
      return "Illness Script Confusion";
    }
  }

  if (answer.includes("hellp") || (answer.includes("severe") && !correct.includes("severe"))) {
    return "Severity Error";
  }

  if (evaluation.classification === "TASK_MISMATCH" || ["Management", "Next Best Step"].includes(decisionType)) {
    return "Management Error";
  }

  if (matchesTrap(decision, learnerAnswer) && (answer.includes("preeclampsia") || answer.includes("eclampsia"))) {
    return "Premature Closure";
  }

  if (sharesClinicalSignal(decision, learnerAnswer) && pivot.length > 0 && !includesAny(learnerAnswer, [decision.pivotClue ?? ""])) {
    return "Missed Pivot Clue";
  }

  if (evaluation.classification === "PARTIAL") {
    return "Illness Script Confusion";
  }

  if (matchesTrap(decision, learnerAnswer)) {
    return "Distractor Attraction";
  }

  if (includesAny(learnerAnswer, ["always", "never", "all", "routine", "prophylaxis"])) {
    return "Overgeneralization";
  }

  return "Knowledge Gap";
}

function correctionFor(type: CognitiveErrorType, decision: CognitiveErrorDecision, learnerAnswer: string): Omit<CognitiveError, "type"> {
  const answer = sentence(learnerAnswer) || "That answer";
  const topic = sentence(decision.topic ?? decision.correctAnswer);
  const pivot = sentence(decision.pivotClue) || "the discriminating clue";

  const templates: Record<CognitiveErrorType, Omit<CognitiveError, "type">> = {
    "Missed Pivot Clue": {
      whyAttractive: `${answer} was reasonable because it overlaps with the broad clinical pattern.`,
      missedClue: `The missed stopper was ${pivot}.`,
      expertCorrection: `Experts pause at that clue before committing to ${topic}.`
    },
    "Premature Closure": {
      whyAttractive: `${answer} was attractive because the first pattern looked familiar.`,
      missedClue: `The reasoning should have stopped at ${pivot}.`,
      expertCorrection: `Experts confirm the required finding before closing on the familiar diagnosis.`
    },
    "Illness Script Confusion": {
      whyAttractive: `${answer} shares part of the illness script with ${topic}.`,
      missedClue: `The script separates at ${pivot}.`,
      expertCorrection: `Experts compare the timeline and defining findings before choosing between similar scripts.`
    },
    "Management Error": {
      whyAttractive: `${answer} may fit the condition, but the task is asking for the correct action.`,
      missedClue: `The management pivot is ${pivot}.`,
      expertCorrection: `Experts first identify the clinical state, then choose the immediate management step.`
    },
    "Contraindication Error": {
      whyAttractive: `${answer} belongs near this treatment decision, so it is a tempting option.`,
      missedClue: `The contraindication clue is ${pivot}.`,
      expertCorrection: `Experts screen contraindications before selecting a medication.`
    },
    "Timing Error": {
      whyAttractive: `${answer} can be true in a nearby time window or disease stage.`,
      missedClue: `The timing clue is ${pivot}.`,
      expertCorrection: `Experts anchor the diagnosis to gestational age, stage, or sequence before naming it.`
    },
    "Severity Error": {
      whyAttractive: `${answer} is close because it lives on the same disease spectrum.`,
      missedClue: `The severity clue is ${pivot}.`,
      expertCorrection: `Experts decide whether severe features are present before choosing the severity label.`
    },
    "Distractor Attraction": {
      whyAttractive: `${answer} shares surface clues with the vignette.`,
      missedClue: `The discriminating clue is ${pivot}.`,
      expertCorrection: `Experts prioritize the discriminator over the overlapping surface feature.`
    },
    Overgeneralization: {
      whyAttractive: `${answer} is a true rule in a nearby context.`,
      missedClue: `The boundary clue is ${pivot}.`,
      expertCorrection: `Experts ask whether the rule applies in this exact decision frame.`
    },
    "Knowledge Gap": {
      whyAttractive: `${answer} did not reveal a stable reasoning path.`,
      missedClue: `The core clue to learn is ${pivot}.`,
      expertCorrection: `Experts attach that clue directly to ${topic}.`
    }
  };

  return templates[type];
}

export function classifyCognitiveError(
  decision: CognitiveErrorDecision,
  learnerAnswer: string,
  evaluation?: AnswerEvaluation
): CognitiveError | undefined {
  const type = determineCognitiveErrorType(decision, learnerAnswer, evaluation);

  return type ? { type, ...correctionFor(type, decision, learnerAnswer) } : undefined;
}
