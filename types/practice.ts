export type QuestionDto = {
  id: string;
  scriptId?: string;
  specialty: string;
  system?: string;
  topic: string;
  canonicalProblem?: string;
  variantType?: string;
  difficulty: number;
  stem: string;
  displayStem?: string;
  decisionType?: DecisionType;
  pattern: string;
  management: string;
  diagnosis: string;
  vignetteFindings?: VignetteFindingAnnotation[];
  clinicalCues?: ClinicalCueSet;
};

export type LevelOfAssistanceRequired =
  | "independent"
  | "pivot_cue"
  | "schema_cue"
  | "decision_boundary_cue"
  | "revealed_without_attempt";

export type ClinicalCueSet = {
  pivotClue: string;
  schemaScaffold: string[];
  decisionBoundary?: {
    conceptA: string;
    conceptB: string;
    pivot: string;
    whyPivotSupportsA: string;
    whatWouldSupportB: string;
    boardRule: string;
  };
};

export type DecisionType =
  | "Pattern Recognition"
  | "Diagnosis"
  | "Next Best Step"
  | "Initial Test"
  | "Confirmatory Test"
  | "Interpretation"
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

export type SemanticLink = {
  sourceText: string;
  relationship: "proves" | "supports" | "rules_out" | "activates" | "explains";
  targetConcept: string;
  targetDiagnosis?: string;
};

export type IntendedDiscriminatorPair = {
  conceptA: string;
  conceptB: string;
  schemaA: string[];
  schemaB: string[];
  pivotSupports: string;
  alternativeWouldNeed: string;
};

export type AnswerResult = {
  isCorrect: boolean;
  answerOutcome?: AnswerOutcome;
  correctAnswer: string;
  boardPearl: string;
  explanation: string;
  evaluation?: AnswerEvaluation;
  tutor?: TutorContent;
  levelOfAssistanceRequired?: LevelOfAssistanceRequired;
  answeredAfterCue?: boolean;
  revealUsed?: boolean;
};

export type AnswerOutcome =
  | "CORRECT"
  | "DECISION_ERROR"
  | "PARTIAL"
  | "TASK_MISMATCH"
  | "UNKNOWN"
  | "REVEALED_WITHOUT_ATTEMPT";

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
  learnerFacingClassification?: AnswerSpecificityClassification;
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

export type AnswerSpecificityClassification = {
  category:
    | "Exact"
    | "Equivalent"
    | "Preferred terminology"
    | "Broad but incomplete"
    | "Needs more specificity"
    | "Correct category / insufficient specificity"
    | "Related but incorrect"
    | "Misspelled but acceptable"
    | "Incorrect"
    | "Unknown";
  message: string;
};

export type PracticeMode = "rapid" | "tutor";

export type TutorContent = {
  repair: DecisionRepair;
  reasoningAnalysis: ReasoningAnalysis;
  cognitiveError?: CognitiveError;
  vignetteFindings?: VignetteFindingAnnotation[];
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
    typicalPatientFindings?: string[];
    recognitionGoal?: string;
    recognitionGoalContrast?: string;
    keyNegativeFindings?: string[];
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
  schemaDiscriminator?: {
    correctSchema: string;
    learnerSchema: string;
    source: "learner_answer" | "fallback";
    pivotClue: string;
    boardRule: string;
    rows: Array<{
      feature: string;
      correct: string;
      learner: string;
    }>;
  };
  postAnswerTeaching: {
    learnerAnswer: string;
    learnerAnswerSchema: string[];
    correctSchema: string[];
    pivotClue: string;
    semanticLinks: SemanticLink[];
    intendedDiscriminatorPair?: IntendedDiscriminatorPair;
    clinicalResolution: string;
    teachingPearl: string;
    nextTimeRule: string;
    isCorrect: boolean;
  };
  reinforcement?: {
    question: string;
    acceptedAnswers: string[];
    boardPearl: string;
  };
};

export type VignetteFindingRole =
  | "context"
  | "supporting"
  | "pivot_clue"
  | "neutral"
  | "noise";

export type VignetteFindingAnnotation = {
  text: string;
  role: VignetteFindingRole;
  explanation?: string;
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
