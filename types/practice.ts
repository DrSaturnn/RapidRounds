export type QuestionDto = {
  id: string;
  specialty: string;
  system?: string;
  topic: string;
  difficulty: number;
  stem: string;
  decisionType?: DecisionType;
  pattern: string;
  management: string;
  diagnosis: string;
};

export type DecisionType =
  | "Pattern Recognition"
  | "Diagnosis"
  | "Next Best Step"
  | "Initial Test"
  | "Confirmatory Test"
  | "Management"
  | "Risk Factor"
  | "Contraindication"
  | "Complication"
  | "Mechanism"
  | "Association"
  | "Prevention"
  | "Prognosis"
  | "Board Pearl"
  | "Most Common Association";

export type ReasoningError =
  | "Knowledge Gap"
  | "Pattern Recognition Error"
  | "Missed Pivot Clue"
  | "Management Sequencing Error"
  | "Premature Closure"
  | "Timeline Error"
  | "Distractor Error"
  | "Instability Error";

export type ReasoningAnalysis = {
  primaryError: ReasoningError;
  confidence: "Low" | "Medium" | "High";
  whyAttractive: string;
  whyIncorrect: string;
  adaptiveFocus: string;
};

export type AnswerResult = {
  isCorrect: boolean;
  answerOutcome?: AnswerOutcome;
  correctAnswer: string;
  boardPearl: string;
  explanation: string;
  evaluation?: AnswerEvaluation;
  tutor?: TutorContent;
};

export type AnswerOutcome =
  | "CORRECT"
  | "DECISION_ERROR"
  | "PARTIAL"
  | "TASK_MISMATCH"
  | "UNKNOWN";

export type AnswerEvaluationClassification =
  | "EXACT"
  | "EQUIVALENT"
  | "SPELLING_VARIATION"
  | "TASK_MISMATCH"
  | "PARTIAL"
  | "INCORRECT"
  | "UNKNOWN"
  | "AMBIGUOUS";

export type AnswerEvaluation = {
  isCorrect: boolean;
  classification: AnswerEvaluationClassification;
  canonicalAnswer: string;
  recognizedConcept?: string;
  recognizedTask?: string;
  confidence: number;
  spellingCorrected: boolean;
  matchedAlias?: string;
  requiresTeaching: boolean;
  partialCredit: number;
  reason: string;
};

export type PracticeMode = "rapid" | "tutor";

export type TutorContent = {
  repair: DecisionRepair;
  reasoningAnalysis: ReasoningAnalysis;
  correctAnswer: string;
  whyIncorrect: {
    userAnswer: string;
    pivotClue: string;
  };
  illnessScript: {
    typicalPatient: string;
    classicPresentation: string;
    buzzwords: string[];
  };
  managementPearl: string;
  comparison: {
    correctDiagnosis: string;
    competingDiagnosis: string;
    rows: Array<{
      feature: string;
      correct: string;
      competing: string;
    }>;
  };
  reinforcement?: {
    question: string;
    acceptedAnswers: string[];
    boardPearl: string;
  };
};

export type DecisionRepairStyle =
  | "CORRECT"
  | "TASK_MISMATCH"
  | "PARTIAL"
  | "INCORRECT"
  | "UNKNOWN"
  | "AMBIGUOUS";

export type DecisionRepair = {
  style: DecisionRepairStyle;
  correctAnswer: string;
  clue: string;
  why: string;
  fingerprint: string;
  learnerAnswer?: string;
  followUp?: string;
  recognitionClues?: string[];
};

export type DashboardStats = {
  questionsAnsweredToday: number;
  accuracy: number;
  currentStreak: number;
  weakestTopics: Array<{ name: string; specialty: string; accuracy: number; attempts: number }>;
};

export type AnalyticsStats = {
  accuracy: number;
  averageResponseTimeMs: number;
  mostMissedDiagnoses: Array<{ label: string; misses: number }>;
  weakestManagementDecisions: Array<{ label: string; accuracy: number; attempts: number }>;
  weakestIllnessScripts: Array<{ label: string; accuracy: number; attempts: number }>;
};
