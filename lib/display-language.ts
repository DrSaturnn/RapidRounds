import type { DecisionType } from "@/types/practice";

const decisionTypeCopy: Record<DecisionType, string> = {
  "Pattern Recognition": "Pattern",
  Diagnosis: "Diagnosis",
  "Next Best Step": "Next best step",
  "Initial Test": "Initial test",
  "Confirmatory Test": "Confirmatory test",
  Management: "Management",
  "Risk Factor": "Risk factor",
  Contraindication: "Contraindication",
  Complication: "Complication",
  Mechanism: "Mechanism",
  Association: "Association",
  Prevention: "Prevention",
  Prognosis: "Prognosis",
  "Board Pearl": "Board pearl",
  "Most Common Association": "Most common association"
};

const extraDecisionTypeCopy: Record<string, string> = {
};

const comparisonFeatureCopy: Record<string, string> = {
  "Cognitive operation": "Task",
  "Pivot clue": "Key clue",
  Management: "Next step",
  "Board focus": "Board pearl"
};

export function getDecisionTypeDisplayText(decisionType?: DecisionType | string) {
  return decisionType
    ? decisionTypeCopy[decisionType as DecisionType] ?? extraDecisionTypeCopy[decisionType] ?? "Practice task"
    : "Practice task";
}

export function getComparisonFeatureDisplayText(feature: string) {
  return comparisonFeatureCopy[feature] ?? feature;
}
