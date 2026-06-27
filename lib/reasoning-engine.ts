import { compareAnswer } from "@/lib/answer-check";
import type { DecisionType, ReasoningAnalysis, ReasoningError } from "@/types/practice";

export type ReasoningDecision = {
  decisionType: string;
  clinicalPattern: string;
  acceptedAnswers: string;
  pivotClue: string;
  commonTrap: string;
  managementPearl: string;
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

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function hasAny(value: string, terms: string[]) {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function classifyByDecisionType(decisionType: string): ReasoningError {
  const type = decisionType as DecisionType;

  if (type === "Pattern Recognition" || type === "Diagnosis") {
    return "Pattern Recognition Error";
  }

  if (type === "Next Best Step" || type === "Management") {
    return "Management Sequencing Error";
  }

  if (type === "Initial Test" || type === "Confirmatory Test") {
    return "Management Sequencing Error";
  }

  if (type === "Contraindication") {
    return "Instability Error";
  }

  if (type === "Complication") {
    return "Premature Closure";
  }

  return "Knowledge Gap";
}

function confidenceFor(error: ReasoningError, decision: ReasoningDecision, answer: string) {
  const tags = parseJsonArray(decision.tags);
  const mentionsPattern = hasAny(answer, [...tags, decision.clinicalPattern, decision.pivotClue]);
  const mentionsTrap = decision.commonTrap.length > 0 && hasAny(answer, [decision.commonTrap]);

  if (mentionsTrap || error === "Management Sequencing Error" || error === "Missed Pivot Clue") {
    return "High";
  }

  if (mentionsPattern) {
    return "Medium";
  }

  return "Low";
}

function detectError(decision: ReasoningDecision, answer: string): ReasoningError {
  const normalizedAnswer = normalize(answer);
  const tags = parseJsonArray(decision.tags);
  const acceptedAnswers = parseJsonArray(decision.acceptedAnswers);

  if (normalizedAnswer.length === 0) {
    return "Knowledge Gap";
  }

  if (decision.commonTrap && hasAny(answer, [decision.commonTrap])) {
    return "Distractor Error";
  }

  if (hasAny(answer, ["unstable", "shock", "hypotension", "airway", "resuscitation"]) && decision.decisionType !== "Management") {
    return "Instability Error";
  }

  if (hasAny(answer, ["acute", "chronic", "weeks", "months", "trimester", "newborn", "elderly"]) && !compareAnswer(answer, acceptedAnswers)) {
    return "Timeline Error";
  }

  if (hasAny(answer, tags) && decision.pivotClue && !hasAny(answer, [decision.pivotClue])) {
    return "Missed Pivot Clue";
  }

  if (
    (decision.decisionType === "Next Best Step" || decision.decisionType === "Management") &&
    hasAny(answer, [decision.clinicalPattern, ...tags])
  ) {
    return "Management Sequencing Error";
  }

  if (hasAny(answer, [decision.clinicalPattern, ...tags])) {
    return "Premature Closure";
  }

  return classifyByDecisionType(decision.decisionType);
}

function adaptiveFocusFor(error: ReasoningError) {
  const focus: Record<ReasoningError, string> = {
    "Knowledge Gap": "Teach the core fact.",
    "Pattern Recognition Error": "Teach the illness script.",
    "Missed Pivot Clue": "Teach the distinguishing feature.",
    "Management Sequencing Error": "Teach the next-step algorithm.",
    "Premature Closure": "Compare the closest competing diagnoses.",
    "Timeline Error": "Teach the timeline and disease progression.",
    "Distractor Error": "Separate irrelevant findings from the signal.",
    "Instability Error": "Teach emergency prioritization before diagnosis."
  };

  return focus[error];
}

export function analyzeReasoning(decision: ReasoningDecision, answer: string): ReasoningAnalysis {
  const primaryError = detectError(decision, answer);
  const confidence = confidenceFor(primaryError, decision, answer);

  return {
    primaryError,
    confidence,
    whyAttractive: decision.commonTrap
      ? `${decision.commonTrap} is tempting because it overlaps with part of the presentation.`
      : "The answer is attractive because it matches a surface feature of the prompt.",
    whyIncorrect: `It misses the key operation: ${decision.decisionType}. The pivot is ${decision.pivotClue}.`,
    adaptiveFocus: adaptiveFocusFor(primaryError)
  };
}
