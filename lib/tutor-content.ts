import { analyzeReasoning } from "@/lib/reasoning-engine";
import { buildClinicalComparison } from "@/lib/clinical-comparison";
import { classifyCognitiveError } from "@/lib/cognitive-error";
import {
  buildDecisionMeaning,
  buildDecisionNbmePivot,
  buildDecisionRepairFeedback,
  buildDecisionRepairPrompt,
  getDecisionEducationProfile
} from "@/lib/decision-education";
import { findDecisionBoundaryRepair } from "@/lib/decision-boundary-repair";
import { dedupeDisplayStrings } from "@/lib/display-strings";
import { buildTeachingPlan } from "@/lib/educational-assembly";
import { buildExpertIllnessScript } from "@/lib/expert-illness-script";
import type {
  AnswerEvaluation,
  CognitiveError,
  DecisionRepair,
  TutorContent,
  VignetteFindingAnnotation,
  VignetteFindingRole
} from "@/types/practice";

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
    recognitionPath?: string;
    nbmePivot?: string;
    whyTempting?: string;
    rows: TutorContent["comparison"]["rows"];
  }
> = {
  "gestational hypertension": {
    competingDiagnosis: "Preeclampsia",
    recognitionPath:
      ">=20 weeks gestation -> hypertension -> check proteinuria -> absent -> check severe features -> absent -> gestational hypertension",
    nbmePivot:
      "The diagnosis changes from gestational hypertension to preeclampsia when proteinuria OR any severe feature appears.",
    whyTempting:
      "Saw hypertension after 20 weeks -> jumped to preeclampsia -> missed absence of proteinuria/severe features -> prove end-organ involvement first.",
    rows: [
      { feature: "Timing", correct: "After 20 weeks", competing: "After 20 weeks" },
      {
        feature: "Proteinuria",
        correct: "Absent",
        competing: "Present, or severe features may establish diagnosis without proteinuria"
      },
      {
        feature: "Severe features",
        correct: "Absent",
        competing:
          "May include thrombocytopenia, elevated LFTs, renal dysfunction, pulmonary edema, cerebral/visual symptoms"
      },
      {
        feature: "Management",
        correct: "Monitor maternal BP/fetal well-being; treat severe-range BP if present",
        competing: "Magnesium sulfate if severe features; delivery timing depends on gestational age and severity"
      },
      { feature: "Progression", correct: "Can progress to preeclampsia", competing: "Established disease" }
    ]
  },
  "carboprost contraindication": {
    competingDiagnosis: "Methylergonovine contraindication",
    recognitionPath:
      "Postpartum hemorrhage -> need uterotonic -> asthma present -> avoid carboprost -> choose another uterotonic",
    nbmePivot: "Asthma immediately excludes carboprost because of bronchospasm risk.",
    whyTempting:
      "Postpartum hemorrhage makes uterotonics feel interchangeable; the corrected heuristic is to check contraindications before choosing the agent.",
    rows: [
      { feature: "Clinical use", correct: "Uterotonic for postpartum hemorrhage", competing: "Uterotonic for postpartum hemorrhage" },
      { feature: "Contraindication", correct: "Asthma", competing: "Hypertension" },
      { feature: "Mechanism of harm", correct: "Can cause bronchospasm", competing: "Can worsen hypertension" },
      {
        feature: "Management",
        correct: "Avoid carboprost; choose another uterotonic",
        competing: "Avoid methylergonovine; choose another uterotonic"
      },
      { feature: "Board pearl", correct: "Asthma excludes carboprost", competing: "Hypertension excludes methylergonovine" }
    ]
  },
  "preeclampsia with severe features": {
    competingDiagnosis: "Gestational hypertension",
    rows: [
      { feature: "Timing", correct: "After 20 weeks", competing: "After 20 weeks" },
      { feature: "Blood pressure", correct: "Severe range can occur", competing: "Elevated, no severe features" },
      { feature: "End-organ injury", correct: "Present", competing: "Absent" },
      { feature: "Pivot clue", correct: "Headache, RUQ pain, low platelets", competing: "Hypertension only" }
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

const VIGNETTE_FINDING_TAG_PREFIX = "vignette_finding::";
const findingRoles = new Set<VignetteFindingRole>(["context", "supporting", "pivot_clue", "neutral", "noise"]);

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseVignetteFindingTags(tags: string[]): VignetteFindingAnnotation[] {
  const findings: VignetteFindingAnnotation[] = [];

  tags.forEach((tag) => {
    if (!tag.startsWith(VIGNETTE_FINDING_TAG_PREFIX)) {
      return;
    }

    try {
      const parsed = JSON.parse(tag.slice(VIGNETTE_FINDING_TAG_PREFIX.length)) as Partial<VignetteFindingAnnotation>;
      const text = parsed.text?.trim();
      const role = parsed.role;

      if (!text || !role || !findingRoles.has(role)) {
        return;
      }

      const explanation = parsed.explanation?.trim();
      findings.push({
        text,
        role,
        ...(explanation ? { explanation } : {})
      });
    } catch {
      // Ignore malformed authoring metadata rather than showing a weak attention map.
    }
  });

  return findings;
}

function getClinicalTags(tags: string[]) {
  return tags.filter((tag) => !tag.startsWith(VIGNETTE_FINDING_TAG_PREFIX));
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

function buildRecognitionPath(decision: TutorDecision) {
  const profile = getDecisionEducationProfile(decision.decisionType);
  const steps = [
    sentence(getPattern(decision)) || sentence(decision.prompt ?? ""),
    sentence(getPivotClue(decision)),
    profile.recognitionOperation,
    sentence(decision.correctAnswer)
  ].filter(Boolean);

  return Array.from(new Set(steps)).join(" -> ");
}

function buildNbmePivot(decision: TutorDecision) {
  return buildDecisionNbmePivot({
    decisionType: decision.decisionType,
    correctAnswer: decision.correctAnswer,
    pivotClue: getPivotClue(decision),
    topic: getDiagnosis(decision)
  });
}

function buildComparison(decision: TutorDecision) {
  return buildClinicalComparison(decision);
}

function getMappedTeachMore(decision: TutorDecision) {
  return comparisonMap[getDiagnosis(decision).toLowerCase()];
}

function isKnownAdjacentAnswer(decision: TutorDecision, userAnswer: string, evaluation?: AnswerEvaluation) {
  const answer = cleanAnswer(userAnswer).toLowerCase();
  const trap = sentence(decision.commonTrap ?? "").toLowerCase();

  return (
    !evaluation?.isCorrect &&
    evaluation?.classification !== "UNKNOWN" &&
    trap.length > 0 &&
    (answer.includes(trap) || trap.includes(answer) || evaluation?.recognizedConcept?.toLowerCase() === trap)
  );
}

function shouldShowWhyTempting(evaluation?: AnswerEvaluation) {
  return Boolean(
    evaluation &&
      !evaluation.isCorrect &&
      evaluation.classification !== "UNKNOWN" &&
      ["INCORRECT", "PARTIAL", "TASK_MISMATCH", "AMBIGUOUS"].includes(evaluation.classification)
  );
}

function buildWhyTempting(decision: TutorDecision, userAnswer: string, evaluation?: AnswerEvaluation, mappedWhy?: string) {
  if (!shouldShowWhyTempting(evaluation)) {
    return undefined;
  }

  if (mappedWhy && isKnownAdjacentAnswer(decision, userAnswer, evaluation)) {
    return mappedWhy;
  }

  const learnerAnswer = cleanAnswer(userAnswer);
  const pivot = sentence(getPivotClue(decision)).toLowerCase();
  const profile = getDecisionEducationProfile(decision.decisionType);
  const correctAnswer = sentence(decision.correctAnswer);

  return `${learnerAnswer} was tempting because it overlaps with the stem. The separating clue is ${pivot}; use that clue to ${profile.recognitionOperation} and choose ${correctAnswer}.`;
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
  ];

  return dedupeDisplayStrings(clues).slice(0, 3);
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

  return `You are on the right branch. Refine it using ${clue.toLowerCase()}: ${buildDecisionMeaning({
    decisionType: decision.decisionType,
    correctAnswer: decision.correctAnswer,
    pivotClue: getPivotClue(decision),
    topic: getDiagnosis(decision)
  })}`;
}

function buildPivotFeedback(decision: TutorDecision, userAnswer?: string) {
  return buildDecisionRepairFeedback(
    {
      decisionType: decision.decisionType,
      correctAnswer: decision.correctAnswer,
      pivotClue: getPivotClue(decision),
      topic: getDiagnosis(decision)
    },
    userAnswer ? cleanAnswer(userAnswer) : undefined
  );
}

function buildRepair(
  decision: TutorDecision,
  userAnswer: string,
  evaluation?: AnswerEvaluation,
  cognitiveError?: CognitiveError
): DecisionRepair {
  const classification = evaluation?.classification ?? "INCORRECT";
  const correctAnswer = sentence(decision.correctAnswer);
  const learnerAnswer = cleanAnswer(userAnswer);
  const clue = sentence(getPivotClue(decision));
  const fingerprint = sentence(decision.boardPearl);
  const clueMeaning = buildDecisionMeaning({
    decisionType: decision.decisionType,
    correctAnswer,
    pivotClue: clue,
    topic: getDiagnosis(decision)
  });
  const answerLabel = getDecisionEducationProfile(decision.decisionType).answerLabel;

  if (classification === "UNKNOWN") {
    return {
      style: "UNKNOWN",
      correctAnswer,
      clue,
      clueMeaning,
      answerLabel,
      why: buildPivotFeedback(decision),
      fingerprint,
      recognitionClues: buildRecognitionClues(decision),
      cognitiveError
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
      clueMeaning,
      answerLabel,
      why: "Correct.",
      fingerprint
    };
  }

  if (classification === "TASK_MISMATCH") {
    return {
      style: "TASK_MISMATCH",
      correctAnswer,
      clue,
      clueMeaning,
      answerLabel,
      why: withDecisionBoundary(
        `You recognized ${evaluation?.recognizedConcept ?? learnerAnswer}. This question is asking you to ${getDecisionEducationProfile(decision.decisionType).recognitionOperation}.`
      ),
      fingerprint,
      learnerAnswer,
      followUp: buildDecisionRepairPrompt({
        decisionType: decision.decisionType,
        correctAnswer,
        pivotClue: clue,
        topic: getDiagnosis(decision)
      }),
      cognitiveError
    };
  }

  if (classification === "PARTIAL") {
    return {
      style: "PARTIAL",
      correctAnswer,
      clue,
      clueMeaning,
      answerLabel,
      why: withDecisionBoundary(buildPartialWhy(decision, userAnswer)),
      fingerprint,
      learnerAnswer,
      followUp: buildDecisionRepairPrompt({
        decisionType: decision.decisionType,
        correctAnswer,
        pivotClue: clue,
        topic: getDiagnosis(decision)
      }),
      cognitiveError
    };
  }

  if (classification === "AMBIGUOUS") {
    return {
      style: "AMBIGUOUS",
      correctAnswer,
      clue,
      clueMeaning,
      answerLabel,
      why: "Your answer could mean more than one thing. Be more specific.",
      fingerprint,
      learnerAnswer,
      cognitiveError
    };
  }

  return {
    style: "INCORRECT",
    correctAnswer,
    clue,
    clueMeaning,
    answerLabel,
    why: withDecisionBoundary(buildPivotFeedback(decision, userAnswer)),
    fingerprint,
    learnerAnswer,
    cognitiveError
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
  const clinicalTags = getClinicalTags(tags);
  const vignetteFindings = parseVignetteFindingTags(tags);
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
      tags: JSON.stringify(clinicalTags)
    },
    userAnswer
  );
  const buzzwords = [...new Set([diagnosis, ...clinicalTags])]
    .filter(Boolean)
    .slice(0, 5);
  const cognitiveError = classifyCognitiveError(decision, userAnswer, evaluation);
  const repair = buildRepair(decision, userAnswer, evaluation, cognitiveError);
  const mappedTeachMore = getMappedTeachMore(decision);
  const comparison = buildComparison(decision);
  const decisionBoundary = findDecisionBoundaryRepair({
    learnerAnswer: cleanAnswer(userAnswer),
    correctAnswer: decision.correctAnswer,
    acceptedAnswers
  });
  const teachingPlan = buildTeachingPlan({
    decisionType: decision.decisionType,
    learnerAnswer: userAnswer,
    correctAnswer: decision.correctAnswer,
    pivotClue: getPivotClue(decision),
    managementPearl: management,
    evaluation,
    cognitiveError,
    reasoningAnalysis,
    hasDecisionBoundary: Boolean(decisionBoundary),
    hasSpecificComparison: comparison.rows.length > 0
  });

  return {
    repair,
    reasoningAnalysis,
    cognitiveError,
    vignetteFindings: vignetteFindings.length > 0 ? vignetteFindings : undefined,
    teachingPlan,
    correctAnswer: decision.correctAnswer,
    whyIncorrect: {
      userAnswer: userAnswer.trim() || "Not answered yet",
      pivotClue: buildPivotClue(decision)
    },
    illnessScript: {
      typicalPatient: typicalPatientBySpecialty[decision.specialty] ?? "Patient matching the clinical pattern",
      classicPresentation: buildExpertIllnessScript(decision),
      buzzwords
    },
    managementPearl: sentence(management),
    recognitionPath: mappedTeachMore?.recognitionPath ?? buildRecognitionPath(decision),
    nbmePivot: mappedTeachMore?.nbmePivot ?? buildNbmePivot(decision),
    whyTempting: buildWhyTempting(decision, userAnswer, evaluation, mappedTeachMore?.whyTempting),
    comparison,
    reinforcement: buildReinforcement(decision, acceptedAnswers, repair)
  };
}
