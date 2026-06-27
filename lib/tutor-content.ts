import { analyzeReasoning } from "@/lib/reasoning-engine";
import { findDecisionBoundaryRepair } from "@/lib/decision-boundary-repair";
import type { AnswerEvaluation, DecisionRepair, TutorContent } from "@/types/practice";

type TutorDecision = {
  specialty: string;
  system?: string;
  topic?: string;
  prompt?: string;
  correctAnswer: string;
  acceptedAnswers: string;
  boardPearl: string;
  tags: string;
  pivotClue?: string;
  commonTrap?: string;
  clinicalPattern?: string;
  decisionType?: string;
  managementPearl?: string;
  pattern?: string;
  management?: string;
  diagnosis?: string;
};

const comparisonMap: Record<
  string,
  {
    competingDiagnosis: string;
    rows: TutorContent["comparison"]["rows"];
  }
> = {
  "preeclampsia with severe features": {
    competingDiagnosis: "Gestational hypertension",
    rows: [
      { feature: "Timing", correct: "After 20 weeks", competing: "After 20 weeks" },
      { feature: "Blood pressure", correct: "Severe range can occur", competing: "Elevated, no severe features" },
      { feature: "End-organ injury", correct: "Present", competing: "Absent" },
      { feature: "Key clue", correct: "Headache, RUQ pain, low platelets", competing: "Hypertension only" }
    ]
  },
  "right ventricular infarction": {
    competingDiagnosis: "Uncomplicated inferior STEMI",
    rows: [
      { feature: "ECG territory", correct: "Inferior STEMI", competing: "Inferior STEMI" },
      { feature: "Hemodynamics", correct: "Preload dependent hypotension", competing: "May be stable" },
      { feature: "Nitrates", correct: "Can worsen hypotension", competing: "Often tolerated" },
      { feature: "Next step", correct: "Fluids and reperfusion", competing: "Standard ACS care" }
    ]
  },
  "hypertrophic pyloric stenosis": {
    competingDiagnosis: "Duodenal atresia",
    rows: [
      { feature: "Vomiting", correct: "Nonbilious projectile", competing: "Bilious or early persistent" },
      { feature: "Age", correct: "2-8 weeks", competing: "First day of life" },
      { feature: "Labs", correct: "Hypochloremic metabolic alkalosis", competing: "No classic alkalosis pattern" },
      { feature: "Treatment", correct: "Fluids, then pyloromyotomy", competing: "Surgical repair" }
    ]
  },
  "acute mesenteric ischemia": {
    competingDiagnosis: "Diverticulitis",
    rows: [
      { feature: "Pain", correct: "Out of proportion", competing: "Localized LLQ tenderness" },
      { feature: "Risk", correct: "Atrial fibrillation embolus", competing: "Older age, diverticula" },
      { feature: "Labs", correct: "Elevated lactate", competing: "Leukocytosis common" },
      { feature: "Next test", correct: "CT angiography", competing: "CT abdomen/pelvis" }
    ]
  },
  "bipolar i disorder": {
    competingDiagnosis: "Bipolar II disorder",
    rows: [
      { feature: "Episode", correct: "Mania", competing: "Hypomania plus depression" },
      { feature: "Duration", correct: "At least 1 week", competing: "At least 4 days" },
      { feature: "Impairment", correct: "Marked impairment or hospitalization", competing: "No marked impairment" },
      { feature: "Diagnosis trigger", correct: "One manic episode", competing: "No history of mania" }
    ]
  }
};

const typicalPatientBySpecialty: Record<string, string> = {
  Obstetrics: "Pregnant patient in the relevant gestational window",
  "Internal Medicine": "Adult with risk factors matching the organ system pattern",
  Pediatrics: "Infant or child with age-specific presentation",
  Surgery: "Patient with an acute operative or vascular pattern",
  Psychiatry: "Patient whose symptoms cluster by duration and impairment"
};

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function sentence(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function getPattern(decision: TutorDecision) {
  return decision.clinicalPattern ?? decision.pattern ?? "";
}

function getManagement(decision: TutorDecision) {
  return decision.managementPearl ?? decision.management ?? "";
}

function getDiagnosis(decision: TutorDecision) {
  return decision.topic ?? decision.diagnosis ?? decision.correctAnswer;
}

function getPivotClue(decision: TutorDecision) {
  return decision.pivotClue ?? getPattern(decision);
}

function buildPivotClue(decision: TutorDecision) {
  return `${sentence(getPivotClue(decision))}. This is the clue that changes the decision.`;
}

function buildClassicPresentation(decision: TutorDecision) {
  return sentence(getPattern(decision));
}

function buildComparison(decision: TutorDecision) {
  const diagnosis = getDiagnosis(decision);
  const key = diagnosis.toLowerCase();
  const mapped = comparisonMap[key];

  if (mapped) {
    return {
      correctDiagnosis: diagnosis,
      competingDiagnosis: mapped.competingDiagnosis,
      rows: mapped.rows
    };
  }

  return {
    correctDiagnosis: diagnosis,
    competingDiagnosis: decision.commonTrap || "Closest competing decision",
    rows: [
      { feature: "Cognitive operation", correct: decision.decisionType ?? "Clinical decision", competing: "Different operation" },
      { feature: "Pivot clue", correct: getPivotClue(decision), competing: "Missing or misreading that clue" },
      { feature: "Management", correct: getManagement(decision), competing: "Different next best step" },
      { feature: "Board focus", correct: decision.boardPearl, competing: "Surface-level overlap" }
    ]
  };
}

function cleanAnswer(value: string) {
  return sentence(value.trim() || "Not answered yet");
}

function buildRecognitionClues(decision: TutorDecision) {
  const tags = parseJsonArray(decision.tags);
  const clues = [
    sentence(getPivotClue(decision)),
    sentence(getPattern(decision)),
    ...tags.map(sentence)
  ].filter((clue) => clue.length > 0);

  return Array.from(new Set(clues)).slice(0, 3);
}

function isLikelyEtiology(answer: string, correctAnswer: string) {
  const normalizedAnswer = answer.toLowerCase();
  const normalizedCorrect = correctAnswer.toLowerCase();

  return normalizedAnswer.includes("increta") && normalizedCorrect.includes("retained placenta");
}

function buildPartialWhy(decision: TutorDecision, userAnswer: string) {
  const answer = cleanAnswer(userAnswer);
  const correctAnswer = sentence(decision.correctAnswer);
  const clue = sentence(getPivotClue(decision));

  if (isLikelyEtiology(answer, correctAnswer)) {
    return `${answer} is one cause of ${correctAnswer}, but the vignette only proves ${correctAnswer}.`;
  }

  if (answer.toLowerCase().includes("abortion") && correctAnswer.toLowerCase().includes("abortion")) {
    return `You recognized spontaneous abortion. Now identify the subtype: ${clue.toLowerCase()} points to ${correctAnswer}.`;
  }

  return `You are on the right branch. Refine it using ${clue.toLowerCase()}.`;
}

function buildRepair(
  decision: TutorDecision,
  userAnswer: string,
  evaluation?: AnswerEvaluation
): DecisionRepair {
  const classification = evaluation?.classification ?? "INCORRECT";
  const correctAnswer = sentence(decision.correctAnswer);
  const learnerAnswer = cleanAnswer(userAnswer);
  const clue = sentence(getPivotClue(decision));
  const fingerprint = sentence(decision.boardPearl);

  if (classification === "UNKNOWN") {
    return {
      style: "UNKNOWN",
      correctAnswer,
      clue,
      why: "Looks like this wasn't in memory yet.",
      fingerprint,
      recognitionClues: buildRecognitionClues(decision)
    };
  }

  const acceptedAnswers = parseJsonArray(decision.acceptedAnswers);
  const decisionBoundary = findDecisionBoundaryRepair({
    learnerAnswer,
    correctAnswer,
    acceptedAnswers
  });
  const withDecisionBoundary = (why: string) => (decisionBoundary ? `${why} ${decisionBoundary}` : why);

  if (["EXACT", "EQUIVALENT", "SPELLING_VARIATION"].includes(classification)) {
    return {
      style: "CORRECT",
      correctAnswer,
      clue,
      why: "Correct.",
      fingerprint
    };
  }

  if (classification === "TASK_MISMATCH") {
    return {
      style: "TASK_MISMATCH",
      correctAnswer,
      clue,
      why: withDecisionBoundary(
        `You recognized ${evaluation?.recognizedConcept ?? learnerAnswer}. This question is asking for ${String(decision.decisionType ?? "the clinical decision").toLowerCase()}.`
      ),
      fingerprint,
      learnerAnswer,
      followUp: "What is the immediate next step?"
    };
  }

  if (classification === "PARTIAL") {
    return {
      style: "PARTIAL",
      correctAnswer,
      clue,
      why: withDecisionBoundary(buildPartialWhy(decision, userAnswer)),
      fingerprint,
      learnerAnswer,
      followUp: clue ? `${clue} should make you think of what answer?` : undefined
    };
  }

  if (classification === "AMBIGUOUS") {
    return {
      style: "AMBIGUOUS",
      correctAnswer,
      clue,
      why: "Your answer could mean more than one thing. Be more specific.",
      fingerprint,
      learnerAnswer
    };
  }

  return {
    style: "INCORRECT",
    correctAnswer,
    clue,
    why: withDecisionBoundary(
      `You answered: ${learnerAnswer}. Correct answer: ${correctAnswer}. The discriminator is ${clue.toLowerCase()}.`
    ),
    fingerprint,
    learnerAnswer
  };
}

function buildReinforcement(decision: TutorDecision, acceptedAnswers: string[], repair: DecisionRepair) {
  if (!repair.followUp) {
    return undefined;
  }

  return {
    question: repair.followUp,
    acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : [decision.correctAnswer],
    boardPearl: decision.boardPearl
  };
}

export function buildTutorContent(
  decision: TutorDecision,
  userAnswer = "Not answered yet",
  evaluation?: AnswerEvaluation
): TutorContent {
  const tags = parseJsonArray(decision.tags);
  const acceptedAnswers = parseJsonArray(decision.acceptedAnswers);
  const diagnosis = getDiagnosis(decision);
  const pattern = getPattern(decision);
  const management = getManagement(decision);
  const reasoningAnalysis = analyzeReasoning(
    {
      decisionType: decision.decisionType ?? "Diagnosis",
      clinicalPattern: pattern,
      acceptedAnswers: decision.acceptedAnswers,
      pivotClue: getPivotClue(decision),
      commonTrap: decision.commonTrap ?? "",
      managementPearl: management,
      tags: decision.tags
    },
    userAnswer
  );
  const buzzwords = [...new Set([diagnosis, ...tags])]
    .filter(Boolean)
    .slice(0, 5);
  const repair = buildRepair(decision, userAnswer, evaluation);

  return {
    repair,
    reasoningAnalysis,
    correctAnswer: decision.correctAnswer,
    whyIncorrect: {
      userAnswer: userAnswer.trim() || "Not answered yet",
      pivotClue: buildPivotClue(decision)
    },
    illnessScript: {
      typicalPatient: typicalPatientBySpecialty[decision.specialty] ?? "Patient matching the clinical pattern",
      classicPresentation: buildClassicPresentation(decision),
      buzzwords
    },
    managementPearl: sentence(management),
    comparison: buildComparison(decision),
    reinforcement: buildReinforcement(decision, acceptedAnswers, repair)
  };
}
