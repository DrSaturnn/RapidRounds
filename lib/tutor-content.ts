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
import {
  parseRapidRoundsCaseMetadata,
  RAPIDROUNDS_CASE_TAG_PREFIX,
  type RapidRoundsCaseMetadata
} from "@/lib/rapidrounds-case";
import {
  buildPracticeVignetteAnnotations,
  VIGNETTE_FINDING_TAG_PREFIX
} from "@/lib/vignette-annotations";
import type {
  AnswerEvaluation,
  CognitiveError,
  DecisionRepair,
  TutorContent
} from "@/types/practice";
import type { MedicalFact } from "@/lib/anking-enrichment";

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
  supportingFacts?: MedicalFact[];
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

const structuredIllnessScriptMap: Record<
  string,
  {
    typicalPatientFindings: string[];
    recognitionGoal: string;
    recognitionGoalContrast?: string;
    keyNegativeFindings?: string[];
  }
> = {
  "genitourinary syndrome of menopause": {
    typicalPatientFindings: [
      "postmenopausal patient",
      "vaginal dryness",
      "dyspareunia",
      "urinary irritation"
    ],
    recognitionGoal: "Distinguish hypoestrogenic atrophy from infectious vaginitis.",
    keyNegativeFindings: ["no thick discharge", "no vulvar plaques", "no focal lesion"]
  },
  "gestational hypertension": {
    typicalPatientFindings: [
      "hypertension after 20 weeks",
      "no proteinuria",
      "no severe features",
      "stable mother and fetus"
    ],
    recognitionGoal: "Distinguish from preeclampsia.",
    keyNegativeFindings: ["no proteinuria", "no severe features"]
  },
  "breast abscess": {
    typicalPatientFindings: ["lactating or postpartum patient", "breast pain", "fever", "fluctuant breast mass"],
    recognitionGoal: "Distinguish breast abscess from uncomplicated mastitis.",
    keyNegativeFindings: ["not just diffuse erythema", "not improving with mastitis treatment"]
  }
};

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function getClinicalTags(tags: string[]) {
  return tags.filter((tag) => !tag.startsWith(VIGNETTE_FINDING_TAG_PREFIX) && !tag.startsWith(RAPIDROUNDS_CASE_TAG_PREFIX));
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

function getStructuredIllnessScript(decision: TutorDecision, metadata?: RapidRoundsCaseMetadata) {
  if (metadata) {
    return {
      typicalPatientFindings: dedupeDisplayStrings([
        metadata.canonicalProblem,
        ...metadata.supportingClues,
        ...metadata.pivotClues
      ]).slice(0, 5),
      recognitionGoal: metadata.decisionBoundary[0]
        ? `Distinguish from ${metadata.decisionBoundary[0].confusedWith}.`
        : `Recognize the ${metadata.canonicalProblem.toLowerCase()} illness script.`,
      keyNegativeFindings: metadata.distractorClues.length > 0 ? metadata.distractorClues : undefined
    };
  }

  return structuredIllnessScriptMap[getDiagnosis(decision).toLowerCase()];
}

function findAuthoredDecisionBoundary(metadata: RapidRoundsCaseMetadata | undefined, learnerAnswer: string) {
  const normalizedAnswer = cleanAnswer(learnerAnswer).toLowerCase();
  const boundary = metadata?.decisionBoundary.find((item) => {
    const confused = item.confusedWith.toLowerCase();

    return normalizedAnswer.includes(confused) || confused.includes(normalizedAnswer);
  });

  return boundary
    ? `Your answer becomes correct when ${boundary.confusedWith} is the supported decision. ${boundary.howToDistinguish}`
    : undefined;
}

function buildMetadataComparison(
  decision: TutorDecision,
  metadata?: RapidRoundsCaseMetadata
): TutorContent["comparison"] | undefined {
  const boundary = metadata?.decisionBoundary[0];

  if (!metadata || !boundary) {
    return undefined;
  }

  return {
    correctDiagnosis: sentence(decision.correctAnswer),
    competingDiagnosis: boundary.confusedWith,
    rows: [
      {
        feature: "Typical presentation",
        correct: metadata.canonicalProblem,
        competing: boundary.confusedWith
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: dedupeDisplayStrings(metadata.pivotClues).join("; "),
        competing: boundary.howToDistinguish
      },
      {
        feature: "Common trap",
        correct: metadata.correctReasoning,
        competing: metadata.commonWrongReasoning[0] ?? boundary.howToDistinguish
      }
    ].filter((row) => row.correct.trim().length > 0 && row.competing.trim().length > 0)
  };
}

function normalizeSchemaName(value?: string) {
  return sentence(String(value ?? "")).toLowerCase();
}

function mapsAnswerToSchema(answer?: string, schema?: string) {
  const normalizedAnswer = normalizeSchemaName(answer);
  const normalizedSchema = normalizeSchemaName(schema);

  return (
    normalizedAnswer.length > 2 &&
    normalizedSchema.length > 2 &&
    (normalizedAnswer === normalizedSchema ||
      normalizedAnswer.includes(normalizedSchema) ||
      normalizedSchema.includes(normalizedAnswer))
  );
}

function findMetadataBoundaryForAnswer(metadata: RapidRoundsCaseMetadata | undefined, learnerAnswer: string) {
  return metadata?.decisionBoundary.find((boundary) => mapsAnswerToSchema(learnerAnswer, boundary.confusedWith));
}

function findComparisonRow(comparison: TutorContent["comparison"], patterns: RegExp[]) {
  return comparison.rows.find((row) => patterns.some((pattern) => pattern.test(row.feature)));
}

function buildSchemaSummary(
  comparison: TutorContent["comparison"],
  side: "correct" | "competing",
  fallback: string
) {
  const candidates = [
    findComparisonRow(comparison, [/typical/i, /presentation/i, /clinical target/i, /clinical use/i])?.[side],
    findComparisonRow(comparison, [/distinguishing/i, /discriminator/i, /pivot/i, /contraindication/i, /clue/i])?.[side],
    findComparisonRow(comparison, [/management/i, /board pearl/i])?.[side]
  ];
  const summary = dedupeDisplayStrings(candidates.filter(Boolean).map((value) => sentence(value ?? ""))).slice(0, 2);

  return summary.length > 0 ? summary.join("; ") : fallback;
}

function buildSchemaDiscriminator({
  decision,
  userAnswer,
  evaluation,
  comparison,
  metadata,
  repair,
  whyTempting,
  nbmePivot
}: {
  decision: TutorDecision;
  userAnswer: string;
  evaluation?: AnswerEvaluation;
  comparison: TutorContent["comparison"];
  metadata?: RapidRoundsCaseMetadata;
  repair: DecisionRepair;
  whyTempting?: string;
  nbmePivot?: string;
}): TutorContent["schemaDiscriminator"] | undefined {
  if (
    evaluation?.isCorrect !== false ||
    evaluation.classification === "UNKNOWN" ||
    comparison.rows.length === 0 ||
    !comparison.competingDiagnosis.trim()
  ) {
    return undefined;
  }

  const learnerAnswer = cleanAnswer(userAnswer);
  const mappedBoundary = findMetadataBoundaryForAnswer(metadata, learnerAnswer);
  const mapsToKnownComparison =
    mapsAnswerToSchema(learnerAnswer, comparison.competingDiagnosis) ||
    Boolean(mappedBoundary) ||
    mapsAnswerToSchema(evaluation.recognizedConcept, comparison.competingDiagnosis);
  const fallbackBoundary = metadata?.decisionBoundary[0];
  const canUseFallback = !mapsToKnownComparison && Boolean(fallbackBoundary);

  if (!mapsToKnownComparison && !canUseFallback) {
    return undefined;
  }

  const learnerSchema = mapsToKnownComparison
    ? mappedBoundary?.confusedWith ?? comparison.competingDiagnosis
    : fallbackBoundary?.confusedWith ?? comparison.competingDiagnosis;
  const clueMeaning = sentence(repair.clueMeaning ?? repair.why);
  const sharedPresentation = sentence(getPattern(decision)) || sentence(decision.prompt ?? "");
  const correctSchema = buildSchemaSummary(comparison, "correct", comparison.correctDiagnosis);
  const wrongSchema = buildSchemaSummary(comparison, "competing", learnerSchema);
  const discriminatorRow = findComparisonRow(comparison, [/distinguishing/i, /discriminator/i, /pivot/i, /contraindication/i, /clue/i]);
  const pivotRuleOut =
    mappedBoundary?.howToDistinguish ??
    fallbackBoundary?.howToDistinguish ??
    (discriminatorRow?.competing
      ? `${learnerSchema} would need ${sentence(discriminatorRow.competing).toLowerCase()}; this stem gives ${repair.clue.toLowerCase()}.`
      : `This stem gives ${repair.clue.toLowerCase()}, which supports ${repair.correctAnswer} instead.`);
  const boardRule = sentence(nbmePivot || repair.fingerprint || decision.boardPearl);

  return {
    correctSchema: comparison.correctDiagnosis,
    learnerSchema,
    source: mapsToKnownComparison ? "learner_answer" : "fallback",
    pivotClue: repair.clue,
    boardRule,
    rows: [
      {
        feature: "Shared presentation",
        correct: sharedPresentation || comparison.correctDiagnosis,
        learner: sharedPresentation || learnerSchema
      },
      {
        feature: "Correct schema",
        correct: correctSchema,
        learner: "Not the schema supported by this stem"
      },
      {
        feature: "Learner schema",
        correct: "Ruled in by the pivot clue here",
        learner: wrongSchema
      },
      {
        feature: "Pivot clue",
        correct: repair.clue,
        learner: `This clue should move you away from ${learnerSchema}.`
      },
      {
        feature: "Why it was tempting",
        correct: `${comparison.correctDiagnosis} and ${learnerSchema} can overlap on the presenting pattern.`,
        learner: whyTempting ?? `${learnerSchema} was tempting because it overlaps with the stem.`
      },
      {
        feature: "Why the pivot rules it out",
        correct: clueMeaning,
        learner: pivotRuleOut
      },
      {
        feature: "Board rule",
        correct: boardRule,
        learner: `Do not choose ${learnerSchema} unless its discriminator is present.`
      }
    ].filter((row) => row.correct.trim().length > 0 && row.learner.trim().length > 0)
  };
}

function getDecisionTaskDisplay(decision: TutorDecision) {
  const type = sentence(decision.decisionType ?? "");

  if (/diagnosis/i.test(type)) {
    return "Name the diagnosis";
  }

  if (/contraindication/i.test(type)) {
    return "Avoid the contraindicated option";
  }

  if (/management|treatment|step/i.test(type)) {
    return "Choose the next step";
  }

  return type || "Make the clinical decision";
}

function buildSchemaChain(values: Array<string | undefined>) {
  return dedupeDisplayStrings(values.map((value) => sentence(value ?? "")).filter(Boolean)).slice(0, 4);
}

function buildSchemaChainFromComparison({
  comparison,
  side,
  decision,
  terminal
}: {
  comparison: TutorContent["comparison"];
  side: "correct" | "competing";
  decision: TutorDecision;
  terminal: string;
}) {
  const presentation = findComparisonRow(comparison, [/typical/i, /presentation/i, /clinical target/i, /clinical use/i])?.[side];
  const discriminator = findComparisonRow(comparison, [/distinguishing/i, /discriminator/i, /pivot/i, /contraindication/i, /clue/i])?.[side];

  return buildSchemaChain([
    sentence(getPattern(decision)) || comparison.correctDiagnosis,
    presentation,
    discriminator,
    terminal
  ]);
}

function buildIntendedDiscriminatorPair({
  comparison,
  decision,
  pivotClue,
  correctAnswer
}: {
  comparison: TutorContent["comparison"];
  decision: TutorDecision;
  pivotClue: string;
  correctAnswer: string;
}): TutorContent["postAnswerTeaching"]["intendedDiscriminatorPair"] {
  if (comparison.rows.length === 0 || !comparison.competingDiagnosis.trim()) {
    return undefined;
  }

  const discriminatorRow = findComparisonRow(comparison, [/distinguishing/i, /discriminator/i, /pivot/i, /contraindication/i, /clue/i]);
  const schemaA = buildSchemaChainFromComparison({
    comparison,
    side: "correct",
    decision,
    terminal: correctAnswer
  });
  const schemaB = buildSchemaChainFromComparison({
    comparison,
    side: "competing",
    decision,
    terminal: comparison.competingDiagnosis
  });

  return {
    conceptA: comparison.correctDiagnosis,
    conceptB: comparison.competingDiagnosis,
    schemaA,
    schemaB,
    pivotSupports: `${pivotClue} supports ${comparison.correctDiagnosis}.`,
    alternativeWouldNeed:
      discriminatorRow?.competing ??
      `A finding that specifically supports ${comparison.competingDiagnosis}.`
  };
}

function buildPostAnswerTeaching({
  decision,
  userAnswer,
  evaluation,
  comparison,
  repair,
  nbmePivot
}: {
  decision: TutorDecision;
  userAnswer: string;
  evaluation?: AnswerEvaluation;
  comparison: TutorContent["comparison"];
  repair: DecisionRepair;
  nbmePivot?: string;
}): TutorContent["postAnswerTeaching"] {
  const learnerAnswer = cleanAnswer(userAnswer);
  const correctAnswer = sentence(decision.correctAnswer);
  const isCorrect = Boolean(evaluation?.isCorrect);
  const learnerMapsToAlternative =
    !isCorrect &&
    (mapsAnswerToSchema(learnerAnswer, comparison.competingDiagnosis) ||
      mapsAnswerToSchema(evaluation?.recognizedConcept, comparison.competingDiagnosis));
  const learnerAnswerSchema = isCorrect
    ? buildSchemaChainFromComparison({ comparison, side: "correct", decision, terminal: correctAnswer })
    : learnerMapsToAlternative
      ? buildSchemaChainFromComparison({ comparison, side: "competing", decision, terminal: comparison.competingDiagnosis })
      : buildSchemaChain([
          sentence(getPattern(decision)) || sentence(decision.prompt ?? ""),
          learnerAnswer,
          evaluation?.recognizedConcept,
          "Schema not proven by this stem"
        ]);
  const correctSchema = buildSchemaChainFromComparison({
    comparison,
    side: "correct",
    decision,
    terminal: correctAnswer
  });
  const intendedDiscriminatorPair = buildIntendedDiscriminatorPair({
    comparison,
    decision,
    pivotClue: repair.clue,
    correctAnswer
  });
  const targetConcept = intendedDiscriminatorPair
    ? `${intendedDiscriminatorPair.conceptA} vs ${intendedDiscriminatorPair.conceptB}`
    : sentence(getPattern(decision)) || correctAnswer;

  return {
    learnerAnswer,
    learnerAnswerSchema,
    correctSchema,
    pivotClue: repair.clue,
    semanticLinks: [
      {
        sourceText: repair.clue,
        relationship: /diagnosis|pattern/i.test(decision.decisionType ?? "") ? "proves" : "supports",
        targetConcept,
        targetDiagnosis: correctAnswer
      }
    ],
    intendedDiscriminatorPair,
    clinicalResolution: correctAnswer,
    teachingPearl: repair.fingerprint || repair.clueMeaning || nbmePivot || "",
    nextTimeRule: nbmePivot || repair.fingerprint || `Use ${repair.clue.toLowerCase()} before choosing the next branch.`,
    isCorrect
  };
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

function buildPartialWhy(decision: TutorDecision, userAnswer: string, evaluation?: AnswerEvaluation) {
  const answer = cleanAnswer(userAnswer);
  const correctAnswer = sentence(decision.correctAnswer);
  const clue = sentence(getPivotClue(decision));
  const specificity = evaluation?.learnerFacingClassification;

  if (isLikelyEtiology(answer, correctAnswer)) {
    return `${answer} is one cause of ${correctAnswer}, but the vignette only proves ${correctAnswer}.`;
  }

  if (answer.toLowerCase().includes("abortion") && correctAnswer.toLowerCase().includes("abortion")) {
    return `You recognized spontaneous abortion. Now identify the subtype: ${clue.toLowerCase()} points to ${correctAnswer}.`;
  }

  if (specificity?.category === "Correct category / insufficient specificity") {
    return `${specificity.message} The specific answer here is ${correctAnswer}.`;
  }

  if (specificity?.category === "Broad but incomplete" || specificity?.category === "Needs more specificity") {
    return `${specificity.message} Refine it using ${clue.toLowerCase()}: ${buildDecisionMeaning({
      decisionType: decision.decisionType,
      correctAnswer: decision.correctAnswer,
      pivotClue: getPivotClue(decision),
      topic: getDiagnosis(decision)
    })}`;
  }

  if (specificity?.category === "Related but incorrect") {
    return `${specificity.message} Refine it using ${clue.toLowerCase()}: ${buildDecisionMeaning({
      decisionType: decision.decisionType,
      correctAnswer: decision.correctAnswer,
      pivotClue: getPivotClue(decision),
      topic: getDiagnosis(decision)
    })}`;
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
  cognitiveError?: CognitiveError,
  authoredDecisionBoundary?: string
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
  }) ?? authoredDecisionBoundary;
  const withDecisionBoundary = (why: string) => (decisionBoundary ? `${why} ${decisionBoundary}` : why);

  if (["EXACT", "EQUIVALENT", "SPELLING_VARIATION"].includes(classification)) {
    const acceptedWhy = evaluation?.learnerFacingClassification?.category === "Preferred terminology" ||
      evaluation?.learnerFacingClassification?.category === "Misspelled but acceptable"
      ? evaluation.learnerFacingClassification.message
      : "Correct.";

    return {
      style: "CORRECT",
      correctAnswer,
      clue,
      clueMeaning,
      answerLabel,
      why: acceptedWhy,
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
      why: withDecisionBoundary(buildPartialWhy(decision, userAnswer, evaluation)),
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
    why: withDecisionBoundary(
      evaluation?.learnerFacingClassification?.category === "Related but incorrect"
        ? `${evaluation.learnerFacingClassification.message} ${buildPivotFeedback(decision, userAnswer)}`
        : buildPivotFeedback(decision, userAnswer)
    ),
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
  const rapidRoundsCase = parseRapidRoundsCaseMetadata(tags);
  const vignette = buildPracticeVignetteAnnotations({
    prompt: decision.prompt,
    topic: getDiagnosis(decision),
    clinicalPattern: getPattern(decision),
    decisionType: decision.decisionType,
    pivotClue: getPivotClue(decision),
    commonTrap: decision.commonTrap,
    managementPearl: getManagement(decision),
    tags
  });
  const vignetteFindings = vignette.vignetteFindings;
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
  const authoredDecisionBoundary = findAuthoredDecisionBoundary(rapidRoundsCase, userAnswer);
  const repair = buildRepair(decision, userAnswer, evaluation, cognitiveError, authoredDecisionBoundary);
  const mappedTeachMore = getMappedTeachMore(decision);
  const structuredIllnessScript = getStructuredIllnessScript(decision, rapidRoundsCase);
  const comparison = buildMetadataComparison(decision, rapidRoundsCase) ?? buildComparison(decision);
  const decisionBoundary = findDecisionBoundaryRepair({
    learnerAnswer: cleanAnswer(userAnswer),
    correctAnswer: decision.correctAnswer,
    acceptedAnswers
  }) ?? authoredDecisionBoundary;
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
  const nbmePivot = mappedTeachMore?.nbmePivot ?? rapidRoundsCase?.decisionBoundary[0]?.howToDistinguish ?? buildNbmePivot(decision);
  const whyTempting = buildWhyTempting(
    decision,
    userAnswer,
    evaluation,
    mappedTeachMore?.whyTempting ?? rapidRoundsCase?.commonWrongReasoning[0]
  );
  const schemaDiscriminator = buildSchemaDiscriminator({
    decision,
    userAnswer,
    evaluation,
    comparison,
    metadata: rapidRoundsCase,
    repair,
    whyTempting,
    nbmePivot
  });
  const postAnswerTeaching = buildPostAnswerTeaching({
    decision,
    userAnswer,
    evaluation,
    comparison,
    repair,
    nbmePivot
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
      typicalPatientFindings: structuredIllnessScript?.typicalPatientFindings,
      recognitionGoal: structuredIllnessScript?.recognitionGoal,
      recognitionGoalContrast: structuredIllnessScript?.recognitionGoalContrast,
      keyNegativeFindings: structuredIllnessScript?.keyNegativeFindings,
      classicPresentation: rapidRoundsCase?.teachMeMore || buildExpertIllnessScript(decision),
      buzzwords
    },
    managementPearl: sentence(management),
    recognitionPath: mappedTeachMore?.recognitionPath ?? (
      rapidRoundsCase
        ? dedupeDisplayStrings([
            rapidRoundsCase.canonicalProblem,
            ...rapidRoundsCase.pivotClues,
            decision.decisionType ?? "",
            decision.correctAnswer
          ]).join(" -> ")
        : buildRecognitionPath(decision)
    ),
    nbmePivot,
    whyTempting,
    comparison,
    schemaDiscriminator,
    postAnswerTeaching,
    reinforcement: buildReinforcement(decision, acceptedAnswers, repair),
    supportingFacts: decision.supportingFacts
  };
}
