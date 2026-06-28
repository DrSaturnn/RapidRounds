type EducationalDecision = {
  decisionType?: string | null;
  correctAnswer: string;
  pivotClue?: string | null;
  topic?: string | null;
};

export type DecisionEducationCategory =
  | "diagnosis"
  | "management"
  | "contraindication"
  | "testing"
  | "retrieval"
  | "screening"
  | "prognosis"
  | "mechanism"
  | "complication";

type DecisionEducationProfile = {
  category: DecisionEducationCategory;
  answerLabel: string;
  recognitionOperation: string;
  fallbackMeaning: string;
  meaning: (clue: string, correctAnswer: string) => string;
  repairPrompt: (clue: string) => string;
  nbmePivot: (clue: string, correctAnswer: string, topic: string) => string;
};

function sentence(value?: string | null) {
  return String(value ?? "").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function normalizeDecisionType(decisionType?: string | null) {
  return sentence(decisionType).toLowerCase();
}

function profileForCategory(category: DecisionEducationCategory): DecisionEducationProfile {
  const profiles: Record<DecisionEducationCategory, DecisionEducationProfile> = {
    diagnosis: {
      category,
      answerLabel: "Correct diagnosis",
      recognitionOperation: "name the diagnosis",
      fallbackMeaning: "The pivot clue points toward the correct diagnosis.",
      meaning: (clue, correctAnswer) => `${clue} points toward ${correctAnswer}.`,
      repairPrompt: (clue) => `${clue} should make you think of what diagnosis?`,
      nbmePivot: (clue, correctAnswer) => `${clue} is the clue that points toward ${correctAnswer}.`
    },
    management: {
      category,
      answerLabel: "Correct action",
      recognitionOperation: "choose the next step",
      fallbackMeaning: "The pivot clue selects the immediate management step.",
      meaning: (clue, correctAnswer) => `${clue} points to ${correctAnswer} as the immediate action.`,
      repairPrompt: () => "What is the immediate next step?",
      nbmePivot: (clue, correctAnswer) => `${clue} changes the next step to ${correctAnswer}.`
    },
    contraindication: {
      category,
      answerLabel: "Avoid",
      recognitionOperation: "screen for contraindications",
      fallbackMeaning: "The pivot clue excludes the unsafe option.",
      meaning: (clue, correctAnswer) => `${clue} contraindicates ${correctAnswer}; avoid it in this decision.`,
      repairPrompt: () => "Which treatment should be avoided here?",
      nbmePivot: (clue, correctAnswer) => `${clue} excludes ${correctAnswer}; choose an alternative that avoids that risk.`
    },
    testing: {
      category,
      answerLabel: "Correct test",
      recognitionOperation: "choose the diagnostic test",
      fallbackMeaning: "The pivot clue selects the appropriate test.",
      meaning: (clue, correctAnswer) => `${clue} makes ${correctAnswer} the appropriate test.`,
      repairPrompt: () => "What test best answers this decision?",
      nbmePivot: (clue, correctAnswer) => `${clue} is the testing pivot that makes ${correctAnswer} the right next test.`
    },
    retrieval: {
      category,
      answerLabel: "Correct retrieval",
      recognitionOperation: "retrieve the specific fact",
      fallbackMeaning: "The pivot clue retrieves the specific answer.",
      meaning: (clue, correctAnswer) => `${clue} is the retrieval cue for ${correctAnswer}.`,
      repairPrompt: () => "What specific answer should this cue retrieve?",
      nbmePivot: (clue, correctAnswer) => `${clue} is the retrieval cue that should bring ${correctAnswer} to mind.`
    },
    screening: {
      category,
      answerLabel: "Correct prevention step",
      recognitionOperation: "choose the prevention or screening step",
      fallbackMeaning: "The pivot clue selects the prevention step.",
      meaning: (clue, correctAnswer) => `${clue} points to ${correctAnswer} as the prevention step.`,
      repairPrompt: () => "What prevention or screening step fits this cue?",
      nbmePivot: (clue, correctAnswer) => `${clue} is the clue that selects ${correctAnswer}.`
    },
    prognosis: {
      category,
      answerLabel: "Correct prognosis",
      recognitionOperation: "predict the outcome",
      fallbackMeaning: "The pivot clue changes the expected outcome.",
      meaning: (clue, correctAnswer) => `${clue} points to ${correctAnswer} as the expected outcome.`,
      repairPrompt: () => "What outcome should this cue predict?",
      nbmePivot: (clue, correctAnswer) => `${clue} is the prognostic cue for ${correctAnswer}.`
    },
    mechanism: {
      category,
      answerLabel: "Correct mechanism",
      recognitionOperation: "retrieve the mechanism",
      fallbackMeaning: "The pivot clue retrieves the mechanism.",
      meaning: (clue, correctAnswer) => `${clue} points to ${correctAnswer} as the mechanism.`,
      repairPrompt: () => "What mechanism explains this finding?",
      nbmePivot: (clue, correctAnswer) => `${clue} is the mechanism cue for ${correctAnswer}.`
    },
    complication: {
      category,
      answerLabel: "Correct complication",
      recognitionOperation: "anticipate the complication",
      fallbackMeaning: "The pivot clue should make you anticipate the complication.",
      meaning: (clue, correctAnswer) => `${clue} should make you anticipate ${correctAnswer}.`,
      repairPrompt: () => "What complication should this cue make you anticipate?",
      nbmePivot: (clue, correctAnswer) => `${clue} is the clue that should make you anticipate ${correctAnswer}.`
    }
  };

  return profiles[category];
}

export function getDecisionEducationCategory(decisionType?: string | null): DecisionEducationCategory {
  const type = normalizeDecisionType(decisionType);

  if (type.includes("contraindication")) {
    return "contraindication";
  }

  if (
    type.includes("management") ||
    type.includes("next best step") ||
    type.includes("first-line") ||
    type.includes("first line") ||
    type.includes("escalation")
  ) {
    return "management";
  }

  if (type.includes("test") || type.includes("interpretation")) {
    return "testing";
  }

  if (type.includes("prevention") || type.includes("screening")) {
    return "screening";
  }

  if (type.includes("prognosis")) {
    return "prognosis";
  }

  if (type.includes("mechanism")) {
    return "mechanism";
  }

  if (type.includes("complication")) {
    return "complication";
  }

  if (
    type.includes("risk factor") ||
    type.includes("association") ||
    type.includes("board pearl") ||
    type.includes("most common") ||
    type.includes("retrieval")
  ) {
    return "retrieval";
  }

  return "diagnosis";
}

export function getDecisionEducationProfile(decisionType?: string | null) {
  return profileForCategory(getDecisionEducationCategory(decisionType));
}

export function buildDecisionMeaning(decision: EducationalDecision) {
  const clue = sentence(decision.pivotClue);
  const correctAnswer = sentence(decision.correctAnswer);
  const profile = getDecisionEducationProfile(decision.decisionType);

  if (!clue || !correctAnswer) {
    return profile.fallbackMeaning;
  }

  return profile.meaning(clue, correctAnswer);
}

export function buildDecisionRepairFeedback(decision: EducationalDecision, userAnswer?: string) {
  const answer = sentence(userAnswer);
  const meaning = buildDecisionMeaning(decision);

  return answer && answer !== "Not answered yet"
    ? `You selected ${answer}. ${meaning}`
    : meaning;
}

export function buildDecisionNbmePivot(decision: EducationalDecision) {
  const clue = sentence(decision.pivotClue);
  const correctAnswer = sentence(decision.correctAnswer);
  const topic = sentence(decision.topic ?? correctAnswer);
  const profile = getDecisionEducationProfile(decision.decisionType);

  return clue && correctAnswer
    ? profile.nbmePivot(clue, correctAnswer, topic)
    : profile.fallbackMeaning;
}

export function buildDecisionRepairPrompt(decision: EducationalDecision) {
  const clue = sentence(decision.pivotClue);
  const profile = getDecisionEducationProfile(decision.decisionType);

  return profile.repairPrompt(clue);
}
