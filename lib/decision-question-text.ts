import type { DecisionType } from "@/types/practice";

const decisionQuestionText: Record<string, string> = {
  "Pattern Recognition": "What pattern is being tested?",
  Diagnosis: "What is the most likely diagnosis?",
  "Next Best Step": "What is the next best step?",
  "Initial Test": "What is the best initial test?",
  "Confirmatory Test": "What is the best confirmatory test?",
  Management: "What is the appropriate management?",
  "Risk Factor": "What is the strongest risk factor?",
  Contraindication: "What is contraindicated?",
  Complication: "What complication is most likely?",
  "Board Pearl": "What is the key board pearl?",
  "Most Common Association": "What is the most common association?",
  Association: "What is the association?",
  Prevention: "What is the best prevention?",
  Mechanism: "What is the mechanism?",
  Prognosis: "What is the expected prognosis?"
};

const genericDecisionPromptPattern = /\s*What clinical decision is required\?\s*$/i;

export function getDecisionQuestionText(decisionType?: DecisionType | string) {
  return decisionType && decisionQuestionText[decisionType]
    ? decisionQuestionText[decisionType]
    : "What is the clinical decision?";
}

export function getClinicalPromptText(stem?: string | null) {
  return (stem ?? "").replace(genericDecisionPromptPattern, "").trim();
}
