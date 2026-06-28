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

export type CognitiveErrorType =
  | "Missed Pivot Clue"
  | "Premature Closure"
  | "Illness Script Confusion"
  | "Management Error"
  | "Contraindication Error"
  | "Timing Error"
  | "Severity Error"
  | "Distractor Attraction"
  | "Overgeneralization"
  | "Knowledge Gap";

export type CognitiveError = {
  type: CognitiveErrorType;
  whyAttractive: string;
  missedClue: string;
  expertCorrection: string;
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
  cognitiveError?: CognitiveError;
  coaching?: {
    message: string;
    supportingPattern: string;
  };
  teachingPlan: {
    repairType:
      | "RETRIEVAL_REPAIR"
      | "MISSED_PIVOT_CLUE"
      | "DECISION_BOUNDARY_REPAIR"
      | "CONTRAINDICATION_REPAIR"
      | "MANAGEMENT_SEQUENCE_REPAIR"
      | "UNKNOWN_SCAFFOLD"
      | "GENERIC_REPAIR";
    modules: {
      illnessScript: boolean;
      expertRecognition: boolean;
      expertCorrection: boolean;
      comparison: boolean;
      nbmePivot: boolean;
      whyTempting: boolean;
      retrieval: boolean;
      contraindication: boolean;
    };
    retrieval?: {
      whatYouGotRight: string;
      whatWasMissing: string;
      target: string;
      memoryHook?: string;
    };
    contraindication?: {
      rule: string;
      whyAvoid: string;
      alternative?: string;
    };
  };
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
  recognitionPath?: string;
  nbmePivot?: string;
  whyTempting?: string;
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
  clueMeaning?: string;
  answerLabel?: string;
  why: string;
  fingerprint: string;
  learnerAnswer?: string;
  followUp?: string;
  recognitionClues?: string[];
  cognitiveError?: CognitiveError;
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
