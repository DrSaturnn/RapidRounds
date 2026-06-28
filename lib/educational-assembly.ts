import { getDecisionEducationCategory } from "@/lib/decision-education";
import type { AnswerEvaluation, CognitiveError, ReasoningAnalysis, TutorContent } from "@/types/practice";

type EducationalAssemblyInput = {
  decisionType?: string;
  learnerAnswer: string;
  correctAnswer: string;
  pivotClue?: string;
  managementPearl?: string;
  evaluation?: AnswerEvaluation;
  cognitiveError?: CognitiveError;
  reasoningAnalysis: ReasoningAnalysis;
  hasDecisionBoundary: boolean;
  hasSpecificComparison: boolean;
};

function sentence(value?: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function classifyRepairType(input: EducationalAssemblyInput): TutorContent["teachingPlan"]["repairType"] {
  if (input.evaluation?.classification === "UNKNOWN") {
    return "UNKNOWN_SCAFFOLD";
  }

  if (input.hasDecisionBoundary) {
    return "DECISION_BOUNDARY_REPAIR";
  }

  const category = getDecisionEducationCategory(input.decisionType);
  const cognitiveType = input.cognitiveError?.type;
  const reasoningPattern = input.reasoningAnalysis.primaryError;

  if (category === "contraindication" || cognitiveType === "Contraindication Error") {
    return "CONTRAINDICATION_REPAIR";
  }

  if (
    category === "retrieval" ||
    category === "mechanism" ||
    category === "prognosis"
  ) {
    return "RETRIEVAL_REPAIR";
  }

  if (cognitiveType === "Missed Pivot Clue" || reasoningPattern === "Missed Pivot Clue") {
    return "MISSED_PIVOT_CLUE";
  }

  if (
    category === "management" ||
    cognitiveType === "Management Error" ||
    reasoningPattern === "Management Sequencing Error"
  ) {
    return "MANAGEMENT_SEQUENCE_REPAIR";
  }

  return "GENERIC_REPAIR";
}

function modulesForRepairType(
  repairType: TutorContent["teachingPlan"]["repairType"],
  hasSpecificComparison: boolean
): TutorContent["teachingPlan"]["modules"] {
  switch (repairType) {
    case "RETRIEVAL_REPAIR":
      return {
        illnessScript: false,
        expertRecognition: false,
        expertCorrection: false,
        comparison: false,
        nbmePivot: true,
        whyTempting: false,
        retrieval: true,
        contraindication: false
      };
    case "DECISION_BOUNDARY_REPAIR":
      return {
        illnessScript: false,
        expertRecognition: false,
        expertCorrection: false,
        comparison: hasSpecificComparison,
        nbmePivot: true,
        whyTempting: true,
        retrieval: false,
        contraindication: false
      };
    case "MISSED_PIVOT_CLUE":
      return {
        illnessScript: false,
        expertRecognition: true,
        expertCorrection: true,
        comparison: false,
        nbmePivot: true,
        whyTempting: false,
        retrieval: false,
        contraindication: false
      };
    case "CONTRAINDICATION_REPAIR":
      return {
        illnessScript: false,
        expertRecognition: true,
        expertCorrection: true,
        comparison: false,
        nbmePivot: true,
        whyTempting: false,
        retrieval: false,
        contraindication: true
      };
    case "MANAGEMENT_SEQUENCE_REPAIR":
      return {
        illnessScript: false,
        expertRecognition: true,
        expertCorrection: true,
        comparison: false,
        nbmePivot: true,
        whyTempting: false,
        retrieval: false,
        contraindication: false
      };
    case "UNKNOWN_SCAFFOLD":
      return {
        illnessScript: true,
        expertRecognition: true,
        expertCorrection: false,
        comparison: false,
        nbmePivot: true,
        whyTempting: false,
        retrieval: false,
        contraindication: false
      };
    case "GENERIC_REPAIR":
    default:
      return {
        illnessScript: true,
        expertRecognition: false,
        expertCorrection: false,
        comparison: false,
        nbmePivot: true,
        whyTempting: false,
        retrieval: false,
        contraindication: false
      };
  }
}

export function buildTeachingPlan(input: EducationalAssemblyInput): TutorContent["teachingPlan"] {
  const repairType = classifyRepairType(input);
  const modules = modulesForRepairType(repairType, input.hasSpecificComparison);
  const learnerAnswer = sentence(input.learnerAnswer) || "your answer";
  const correctAnswer = sentence(input.correctAnswer);
  const pivotClue = sentence(input.pivotClue);

  return {
    repairType,
    modules,
    retrieval: modules.retrieval
      ? {
          whatYouGotRight: `${learnerAnswer} was an attempt to retrieve the tested fact.`,
          whatWasMissing: pivotClue
            ? `The missing link was connecting ${pivotClue} to the specific answer.`
            : "The missing link was the specific answer the stem was asking you to retrieve.",
          target: correctAnswer,
          memoryHook: pivotClue ? `${pivotClue} -> ${correctAnswer}` : undefined
        }
      : undefined,
    contraindication: modules.contraindication
      ? {
          rule: pivotClue
            ? `${pivotClue} is the contraindication clue.`
            : "Screen for contraindications before choosing the medication.",
          whyAvoid: `${correctAnswer} should be avoided in this decision frame.`,
          alternative: sentence(input.managementPearl) || undefined
        }
      : undefined
  };
}
