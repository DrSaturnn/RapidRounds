import type { NbmeArchetype, RapidRoundsReasoningObject } from "@/lib/local-reasoning-engine";
import type { QuestionDto, VignetteFindingAnnotation } from "@/types/practice";

export type RapidRoundsSubject =
  | "Internal Medicine"
  | "Surgery"
  | "OB/GYN"
  | "Pediatrics"
  | "Psychiatry"
  | "Family Medicine"
  | "Emergency Medicine"
  | "Neurology"
  | "Ethics"
  | "Biostatistics";

export type QuestionBreadth = "primary" | "expanded" | "comprehensive";

export type SchemaNodeKind =
  | "recognition"
  | "diagnosis"
  | "differential_diagnosis"
  | "management"
  | "next_best_step"
  | "escalation"
  | "complication_recognition"
  | "contraindication"
  | "disposition"
  | "follow_up"
  | "mechanism"
  | "risk_factor_interpretation"
  | "screening"
  | "prognosis";

export type SchemaNodeShelfBand = "core" | "comprehensive";

export type SchemaNodeAnswerType =
  | "diagnosis"
  | "management"
  | "avoid"
  | "mechanism"
  | "risk_factor"
  | "screening"
  | "prognosis"
  | "interpretation"
  | "ethics";

export type SchemaNodePivotCategory =
  | "diagnostic"
  | "management"
  | "severity"
  | "timing"
  | "contraindication"
  | "mechanism"
  | "risk"
  | "screening"
  | "prognosis";

export type InitialQuestionSchema = {
  classicEpidemiologyFrame: string;
  atypicalEpidemiologyFrame: string;
  misleadingContextFrame: string;
  minimalContextFrame: string;
  chiefProblem: string;
  pertinentPositiveSlots: string[];
  pertinentNegativeSlots: string[];
  pivotSlot: string;
  task: string;
};

export type SchemaSemanticLinkSeed = {
  sourceText: string;
  relationship: "proves" | "supports" | "rules_out" | "activates" | "explains";
  targetConcept: string;
  targetDiagnosis?: string;
};

export type SchemaSourcePolicyMetadata = {
  schemaSourceType: "public_blueprint_reconstruction" | "guideline_validated_medical_truth";
  validationSources: string[];
  reconstructedFromMedicalTruth: true;
  proprietaryExpressionRetained: false;
};

export type SchemaDiscriminatorPairSeed = {
  conceptA: string;
  conceptB: string;
  sharedPresentation: string;
  pivot: string;
  pivotThatSeparates: string;
  whyPivotSupportsA: string;
  whatWouldSupportB: string;
  commonWrongSchema: string;
  conceptASchema: string[];
  conceptBSchema: string[];
  alternativeWouldNeed: string;
  boardRule: string;
};

export type SchemaBranchSeed = {
  branchPoint: string;
  ifPresent: string;
  ifAbsent: string;
  correctAction: string;
};

export type RapidRoundsConceptSeed = {
  id: string;
  subject: RapidRoundsSubject;
  topic: string;
  schema: string;
  questionArchetypes: NbmeArchetype[];
  pivotClues: string[];
  supportingClues: string[];
  contextualClues: string[];
  commonTraps: string[];
  primaryDiscriminators: string[];
  secondaryDiscriminators: string[];
  managementRules: string[];
  contraindications: string[];
  nextTimeRule: string;
  relatedConcepts: string[];
  guidelineReferences: string[];
};

export type DecisionQuestionType =
  | NbmeArchetype
  | "Next step after intervention"
  | "Failure to improve"
  | "Contraindication";

export type DecisionBranch = {
  branchCondition: string;
  addedClinicalInformation: string;
  nextNodeId: string;
  whyThisBranchMatters: string;
};

export type DecisionNode = {
  nodeId: string;
  clinicalState: string;
  questionType: DecisionQuestionType;
  askablePrompt: string;
  correctActionOrAnswer: string;
  pivotClues: string[];
  supportingClues: string[];
  pertinentNegatives: string[];
  distractors: string[];
  traps: string[];
  discriminators: string[];
  downstreamBranches: DecisionBranch[];
  masteryRequirement: string;
  nextTimeRule: string;
};

export type SchemaNode = {
  id: string;
  parentSeedId: string;
  shelf: RapidRoundsSubject;
  subject: RapidRoundsSubject;
  system: string;
  topic: string;
  schemaName: string;
  schema: string;
  nodeKind: SchemaNodeKind;
  questionArchetype: NbmeArchetype;
  nbmeArchetype: NbmeArchetype;
  nbmeBlueprintCategory: string;
  estimatedYield: number;
  caseTierEligibility: {
    core: boolean;
    comprehensive: boolean;
  };
  initialQuestionSchema: InitialQuestionSchema;
  shelfFrequencyWeight: number;
  shelfBand: SchemaNodeShelfBand;
  epidemiologyFrames: string[];
  chiefComplaintVariants: string[];
  chiefProblem: string;
  corePertinentPositives: string[];
  corePertinentNegatives: string[];
  pertinentPositives: string[];
  pertinentNegatives: string[];
  pivotClue: string;
  pivotCategory: SchemaNodePivotCategory;
  pivotClues: string[];
  supportingClues: string[];
  contextualClues: string[];
  discriminatorPair: SchemaDiscriminatorPairSeed;
  discriminatorPairs: SchemaDiscriminatorPairSeed[];
  semanticLinks: SchemaSemanticLinkSeed[];
  answerType: SchemaNodeAnswerType;
  managementBranch?: SchemaBranchSeed;
  managementStage: string;
  priorInterventions: string[];
  downstreamStateChanges: string[];
  complicationBranch?: SchemaBranchSeed;
  complicationBranches: SchemaBranchSeed[];
  contraindicationBranches: SchemaBranchSeed[];
  adaptiveBreadthVariants: CaseVariantTemplate[];
  correctAnswer: string;
  incorrectAnswerSchemas: string[];
  answerPrompt: string;
  commonTraps: string[];
  nextTimeRule: string;
  relatedConcepts: string[];
  guidelineReferences: string[];
  sourcePolicyMetadata: SchemaSourcePolicyMetadata;
};

export type ShelfSchemaNode = SchemaNode;

export type CaseVariantTemplate = {
  variantId: string;
  label: string;
  breadth: QuestionBreadth;
  composition:
    | "context_pivot_supporting_negative"
    | "context_pivot_distractors"
    | "context_negative_generic_positive"
    | "minimal_decisive_pivot"
    | "late_stage_after_intervention"
    | "complication_nonresponse_branch";
};

export type ClinicalDecisionTreeSeed = RapidRoundsConceptSeed & {
  illnessScript: string;
  initialPresentation: string;
  decisionTree: DecisionNode[];
  pivots: string[];
  pertinentPositives: string[];
  pertinentNegatives: string[];
  distractors: string[];
  traps: string[];
  interventions: string[];
  downstreamStates: string[];
  managementStages: string[];
  discriminators: string[];
  masteryPrerequisites: string[];
  generatedCaseVariants: CaseVariantTemplate[];
};

export type GeneratedRapidRoundsCase = {
  id: string;
  subject: RapidRoundsSubject;
  topic: string;
  schema: string;
  archetype: NbmeArchetype;
  vignette: string;
  answerPrompt: string;
  answerChoices: Array<{
    label: string;
    text: string;
    isCorrect: boolean;
  }>;
  correctAnswer: string;
  explanation: string;
  clueMap: VignetteFindingAnnotation[];
  reasoningObject: RapidRoundsReasoningObject;
  conceptCard: RapidRoundsReasoningObject["conceptCard"];
  question: QuestionDto;
  seed: RapidRoundsConceptSeed;
  treeSeed?: ClinicalDecisionTreeSeed;
  decisionNode?: DecisionNode;
  schemaNode?: SchemaNode;
  variantTemplate?: CaseVariantTemplate;
};

export function createConceptSeed(
  subject: RapidRoundsSubject,
  topic: string,
  overrides: Partial<Omit<RapidRoundsConceptSeed, "id" | "subject" | "topic">> = {}
): RapidRoundsConceptSeed {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const pivot = overrides.pivotClues?.[0] ?? topic;
  const schema = overrides.schema ?? `${topic} clinical reasoning schema`;
  const managementRule = overrides.managementRules?.[0] ?? `Use the pivot clue to choose the next best step for ${topic}.`;

  return {
    id: `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${slug}`,
    subject,
    topic,
    schema,
    questionArchetypes: overrides.questionArchetypes ?? ["Diagnosis", "Next best step"],
    pivotClues: overrides.pivotClues ?? [pivot],
    supportingClues: overrides.supportingClues ?? [`clinical pattern consistent with ${topic}`],
    contextualClues: overrides.contextualClues ?? [schema],
    commonTraps: overrides.commonTraps ?? [`prematurely choosing a nearby diagnosis instead of using ${pivot}`],
    primaryDiscriminators: overrides.primaryDiscriminators ?? [`${pivot} is the highest-yield discriminator for ${topic}.`],
    secondaryDiscriminators: overrides.secondaryDiscriminators ?? [`severity, timing, and stability refine the next step for ${topic}.`],
    managementRules: overrides.managementRules ?? [managementRule],
    contraindications: overrides.contraindications ?? [],
    nextTimeRule: overrides.nextTimeRule ?? `Find the pivot clue first, then commit to ${topic}.`,
    relatedConcepts: overrides.relatedConcepts ?? [],
    guidelineReferences: overrides.guidelineReferences ?? ["Public guideline-derived concept map"]
  };
}

export const DEFAULT_CASE_VARIANT_TEMPLATES: CaseVariantTemplate[] = [
  {
    variantId: "context-pivot-supporting-negative",
    label: "Context + pivot + supporting clue + pertinent negative",
    breadth: "primary",
    composition: "context_pivot_supporting_negative"
  },
  {
    variantId: "context-pivot-distractors",
    label: "Context + pivot + multiple distractors",
    breadth: "expanded",
    composition: "context_pivot_distractors"
  },
  {
    variantId: "context-negative-generic-positive",
    label: "Context + pertinent negative + generic pertinent positive",
    breadth: "expanded",
    composition: "context_negative_generic_positive"
  },
  {
    variantId: "minimal-decisive-pivot",
    label: "Minimal stem with one decisive pivot",
    breadth: "primary",
    composition: "minimal_decisive_pivot"
  },
  {
    variantId: "late-stage-after-intervention",
    label: "Late-stage management after prior intervention",
    breadth: "comprehensive",
    composition: "late_stage_after_intervention"
  },
  {
    variantId: "complication-nonresponse-branch",
    label: "Complication or nonresponse branch",
    breadth: "comprehensive",
    composition: "complication_nonresponse_branch"
  }
];

function archetypeToSchemaNodeKind(archetype: NbmeArchetype): SchemaNodeKind {
  if (archetype === "Diagnosis") return "diagnosis";
  if (archetype === "Next best step") return "next_best_step";
  if (archetype === "Initial management" || archetype === "Definitive management") return "management";
  if (archetype === "Complication") return "complication_recognition";
  if (archetype === "Drug adverse effect") return "contraindication";
  if (archetype === "Mechanism/pathophysiology") return "mechanism";
  if (archetype === "Risk factor") return "risk_factor_interpretation";
  if (archetype === "Screening/prevention") return "screening";
  if (archetype === "Prognosis/counseling") return "prognosis";
  return "recognition";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function blueprintCategoryFor(seed: RapidRoundsConceptSeed) {
  const topic = seed.topic.toLowerCase();
  const schema = seed.schema.toLowerCase();

  if (seed.subject === "Internal Medicine") {
    if (/acs|hfref|hfpef|heart|cardio|endocarditis/.test(topic + schema)) return "Cardiovascular Disorders";
    if (/copd|asthma|pneumonia|pulmonary|respir/.test(topic + schema)) return "Diseases of the Respiratory System";
    if (/gi bleed|cirrhosis|digest|liver|pancrea|bowel/.test(topic + schema)) return "Nutritional and Digestive Disorders";
    if (/dka|hhs|thyroid|adrenal|endocrine|metabolic/.test(topic + schema)) return "Endocrine and Metabolic Disorders";
    if (/sle|lupus|immun|autoimmune/.test(topic + schema)) return "Immunologic Disorders";
    if (/tia|stroke|nervous|neurolog/.test(topic + schema)) return "Diseases of the Nervous System";
    if (/depress|mental|mood/.test(topic + schema)) return "Mental Disorders";
    if (/eruption|rash|skin|derm/.test(topic + schema)) return "Diseases of the Skin";
    if (/gout|arthritis|musculoskeletal|connective/.test(topic + schema)) return "Musculoskeletal and Connective Tissue Disorders";
    if (/menopause|female reproductive|vaginal/.test(topic + schema)) return "Female Reproductive System";
    if (/aki|ckd|nephritic|nephrotic|renal|urinary/.test(topic + schema)) return "Renal, Urinary, Male Reproductive Systems";
    if (/anemia|blood|heme/.test(topic + schema)) return "Diseases of the Blood";
    if (/sepsis|immun|infection/.test(topic + schema)) return "General Principles";
  }

  if (seed.subject === "Surgery") return "Surgery: acute care, trauma, abdomen, breast, and perioperative decisions";
  if (seed.subject === "OB/GYN") return "Female Reproductive System and Pregnancy";
  if (seed.subject === "Pediatrics") return "Pediatric Diagnosis, Management, Prevention, and Development";
  if (seed.subject === "Psychiatry") return "Mental Disorders";
  if (seed.subject === "Family Medicine") return "Ambulatory Prevention, Chronic Disease, and Counseling";
  if (seed.subject === "Emergency Medicine") return "Emergency Stabilization and Disposition";
  if (seed.subject === "Neurology") return "Diseases of the Nervous System";
  if (seed.subject === "Ethics") return "Ethics, Communication, and Professionalism";
  if (seed.subject === "Biostatistics") return "Biostatistics and Epidemiology";

  return `${seed.subject} shelf clinical reasoning`;
}

function blueprintWeightFor(category: string, kind: SchemaNodeKind) {
  const categoryWeight = (() => {
    if (/cardiovascular|respiratory|digestive/i.test(category)) return 15;
    if (/endocrine/i.test(category)) return 12;
    if (/blood|nervous|renal/i.test(category)) return 10;
    if (/general principles/i.test(category)) return 8;
    if (/female reproductive|mental|skin|musculoskeletal|immunologic/i.test(category)) return 5;
    return 8;
  })();

  return Math.max(1, Math.round((categoryWeight / 3) + schemaNodeWeight(kind)));
}

function schemaNodeWeight(kind: SchemaNodeKind) {
  if (kind === "diagnosis" || kind === "recognition" || kind === "next_best_step" || kind === "management") {
    return 5;
  }

  if (kind === "screening" || kind === "contraindication" || kind === "complication_recognition") {
    return 3;
  }

  return 1;
}

function answerTypeForSchemaNode(kind: SchemaNodeKind, archetype: NbmeArchetype): SchemaNodeAnswerType {
  if (kind === "diagnosis" || kind === "recognition" || kind === "differential_diagnosis") return "diagnosis";
  if (kind === "contraindication") return "avoid";
  if (kind === "mechanism") return "mechanism";
  if (kind === "risk_factor_interpretation") return "risk_factor";
  if (kind === "screening") return "screening";
  if (kind === "prognosis") return "prognosis";
  if (archetype === "Biostatistics") return "interpretation";
  if (archetype === "Ethics/capacity") return "ethics";
  return "management";
}

function pivotCategoryForSchemaNode(kind: SchemaNodeKind): SchemaNodePivotCategory {
  if (kind === "contraindication") return "contraindication";
  if (kind === "complication_recognition" || kind === "escalation") return "severity";
  if (kind === "management" || kind === "next_best_step" || kind === "disposition" || kind === "follow_up") return "management";
  if (kind === "mechanism") return "mechanism";
  if (kind === "risk_factor_interpretation") return "risk";
  if (kind === "screening") return "screening";
  if (kind === "prognosis") return "prognosis";
  return "diagnostic";
}

function managementStageForSchemaNode(kind: SchemaNodeKind, archetype: NbmeArchetype) {
  if (kind === "recognition" || kind === "diagnosis" || kind === "differential_diagnosis") return "initial presentation";
  if (archetype === "Initial management") return "initial stabilization";
  if (archetype === "Definitive management") return "definitive management";
  if (kind === "next_best_step") return "next step after recognition";
  if (kind === "escalation" || kind === "complication_recognition") return "failure to improve or complication";
  if (kind === "contraindication") return "contraindication branch";
  if (kind === "follow_up" || kind === "disposition") return "disposition/follow-up";
  return "single-step reasoning";
}

function schemaNodeShelfBand(kind: SchemaNodeKind): SchemaNodeShelfBand {
  return schemaNodeWeight(kind) >= 3 ? "core" : "comprehensive";
}

function answerPromptForSchemaNode(kind: SchemaNodeKind, archetype: NbmeArchetype) {
  if (kind === "diagnosis" || kind === "recognition") return "What is the most likely diagnosis?";
  if (kind === "differential_diagnosis") return "Which diagnosis is best supported by the pivot clue?";
  if (kind === "management") return "What is the most appropriate management?";
  if (kind === "next_best_step") return "What is the next best step?";
  if (kind === "escalation") return "What should be done after failure to improve?";
  if (kind === "complication_recognition") return "What complication is most likely?";
  if (kind === "contraindication") return "What should be avoided?";
  if (kind === "disposition") return "What is the appropriate disposition?";
  if (kind === "follow_up") return "What follow-up is most appropriate?";
  if (kind === "mechanism") return "What mechanism explains this presentation?";
  if (kind === "risk_factor_interpretation") return "Which risk factor best explains this presentation?";
  if (kind === "screening") return "What screening or preventive step is most appropriate?";
  if (kind === "prognosis") return "What counseling point is most appropriate?";
  return archetype;
}

function schemaNodeCorrectAnswer(seed: RapidRoundsConceptSeed, kind: SchemaNodeKind, archetype: NbmeArchetype) {
  if (kind === "diagnosis" || kind === "recognition" || kind === "differential_diagnosis") {
    return seed.topic;
  }

  if (archetype === "Definitive management" || kind === "next_best_step" || kind === "disposition" || kind === "follow_up") {
    return seed.nextTimeRule;
  }

  if (kind === "management" || kind === "screening") {
    return seed.managementRules[0] ?? seed.nextTimeRule;
  }

  if (kind === "contraindication") {
    return seed.contraindications[0] ?? seed.commonTraps[0] ?? `avoid unsafe management in ${seed.topic}`;
  }

  if (kind === "complication_recognition") {
    return seed.secondaryDiscriminators[0] ?? seed.commonTraps[0] ?? `${seed.topic} complication`;
  }

  if (kind === "mechanism" || kind === "risk_factor_interpretation" || kind === "prognosis") {
    return seed.primaryDiscriminators[0] ?? seed.nextTimeRule;
  }

  return seed.nextTimeRule;
}

export function createSchemaNodesFromSeed(seed: RapidRoundsConceptSeed): SchemaNode[] {
  const archetypes = seed.questionArchetypes.length > 0 ? seed.questionArchetypes : (["Diagnosis"] satisfies NbmeArchetype[]);
  const baseVariants = DEFAULT_CASE_VARIANT_TEMPLATES;

  return archetypes.map((archetype, index) => {
    const kind = archetypeToSchemaNodeKind(archetype);
    const blueprintCategory = blueprintCategoryFor(seed);
    const weight = blueprintWeightFor(blueprintCategory, kind);
    const correctAnswer = schemaNodeCorrectAnswer(seed, kind, archetype);
    const pivot = seed.pivotClues[index % seed.pivotClues.length] ?? seed.pivotClues[0] ?? seed.topic;
    const support = seed.supportingClues[index % seed.supportingClues.length] ?? seed.supportingClues[0] ?? seed.schema;
    const context = seed.contextualClues[index % seed.contextualClues.length] ?? seed.contextualClues[0] ?? seed.schema;
    const competingConcept = seed.relatedConcepts[0] ?? seed.commonTraps[0] ?? "nearby clinical schema";
    const shelfBand = schemaNodeShelfBand(kind);
    const nodeId = `${seed.id}--schema-${slugify(archetype)}-${kind}`;
    const discriminatorPair: SchemaDiscriminatorPairSeed = {
      conceptA: seed.topic,
      conceptB: competingConcept,
      sharedPresentation: context,
      pivot,
      pivotThatSeparates: pivot,
      whyPivotSupportsA: `${pivot} supports the ${seed.topic} branch.`,
      whatWouldSupportB: seed.commonTraps[0] ?? `a finding that favors ${competingConcept}`,
      commonWrongSchema: competingConcept,
      conceptASchema: [context, support, pivot, seed.topic],
      conceptBSchema: [context, competingConcept, seed.commonTraps[0] ?? `missing ${pivot}`],
      alternativeWouldNeed: seed.commonTraps[0] ?? `a finding that favors ${competingConcept}`,
      boardRule: seed.primaryDiscriminators[0] ?? seed.nextTimeRule
    };
    const managementStage = managementStageForSchemaNode(kind, archetype);
    const priorInterventions = /after|definitive|failure|complication/i.test(managementStage)
      ? [seed.managementRules[0] ?? seed.nextTimeRule]
      : [];
    const downstreamStateChanges = priorInterventions.length > 0
      ? [`clinical state advances after ${priorInterventions[0]}`]
      : [];
    const sourcePolicyMetadata: SchemaSourcePolicyMetadata = {
      schemaSourceType: "public_blueprint_reconstruction",
      validationSources: seed.guidelineReferences,
      reconstructedFromMedicalTruth: true,
      proprietaryExpressionRetained: false
    };

    return {
      id: nodeId,
      parentSeedId: seed.id,
      shelf: seed.subject,
      subject: seed.subject,
      system: blueprintCategory,
      topic: seed.topic,
      schemaName: `${seed.topic}: ${kind.replace(/_/g, " ")}`,
      schema: `${seed.topic}: ${kind.replace(/_/g, " ")} schema`,
      nodeKind: kind,
      questionArchetype: archetype,
      nbmeArchetype: archetype,
      nbmeBlueprintCategory: blueprintCategory,
      estimatedYield: weight,
      caseTierEligibility: {
        core: shelfBand === "core",
        comprehensive: true
      },
      initialQuestionSchema: {
        classicEpidemiologyFrame: context,
        atypicalEpidemiologyFrame: seed.contextualClues[1] ?? `atypical presentation of ${seed.topic}`,
        misleadingContextFrame: seed.commonTraps[0] ?? `nearby context that can distract from ${pivot}`,
        minimalContextFrame: seed.schema,
        chiefProblem: support,
        pertinentPositiveSlots: seed.supportingClues,
        pertinentNegativeSlots: seed.secondaryDiscriminators,
        pivotSlot: pivot,
        task: answerPromptForSchemaNode(kind, archetype)
      },
      shelfFrequencyWeight: weight,
      shelfBand,
      epidemiologyFrames: seed.contextualClues,
      chiefComplaintVariants: [context, support],
      chiefProblem: support,
      corePertinentPositives: seed.supportingClues.slice(0, 2),
      corePertinentNegatives: seed.secondaryDiscriminators.slice(0, 2),
      pertinentPositives: seed.supportingClues,
      pertinentNegatives: seed.secondaryDiscriminators,
      pivotClue: pivot,
      pivotCategory: pivotCategoryForSchemaNode(kind),
      pivotClues: [pivot, ...seed.pivotClues.filter((item) => item !== pivot)],
      supportingClues: seed.supportingClues,
      contextualClues: seed.contextualClues,
      discriminatorPair,
      discriminatorPairs: [discriminatorPair],
      semanticLinks: [
        {
          sourceText: pivot,
          relationship: kind === "diagnosis" || kind === "recognition" ? "proves" : "supports",
          targetConcept: blueprintCategory,
          targetDiagnosis: seed.topic
        }
      ],
      answerType: answerTypeForSchemaNode(kind, archetype),
      managementBranch: {
        branchPoint: pivot,
        ifPresent: seed.managementRules[0] ?? seed.nextTimeRule,
        ifAbsent: seed.commonTraps[0] ?? "reassess the schema before acting",
        correctAction: correctAnswer
      },
      complicationBranch: seed.secondaryDiscriminators[0]
        ? {
            branchPoint: seed.secondaryDiscriminators[0],
            ifPresent: `move to the ${seed.topic} complication branch`,
            ifAbsent: `stay on the core ${seed.topic} branch`,
            correctAction: seed.nextTimeRule
          }
        : undefined,
      managementStage,
      priorInterventions,
      downstreamStateChanges,
      complicationBranches: seed.secondaryDiscriminators.slice(0, 2).map((branchPoint) => ({
        branchPoint,
        ifPresent: `move to the ${seed.topic} complication branch`,
        ifAbsent: `stay on the core ${seed.topic} branch`,
        correctAction: seed.nextTimeRule
      })),
      contraindicationBranches: seed.contraindications.map((contraindication) => ({
        branchPoint: contraindication,
        ifPresent: `avoid ${contraindication}`,
        ifAbsent: seed.managementRules[0] ?? seed.nextTimeRule,
        correctAction: contraindication
      })),
      adaptiveBreadthVariants: baseVariants.filter((variant) =>
        shelfBand === "core" ? true : variant.breadth === "comprehensive"
      ),
      correctAnswer,
      incorrectAnswerSchemas: [competingConcept, ...seed.relatedConcepts.filter((concept) => concept !== competingConcept)].slice(0, 4),
      answerPrompt: answerPromptForSchemaNode(kind, archetype),
      commonTraps: seed.commonTraps,
      nextTimeRule: seed.nextTimeRule,
      relatedConcepts: seed.relatedConcepts,
      guidelineReferences: seed.guidelineReferences,
      sourcePolicyMetadata
    };
  });
}

export function createDecisionTreeSeed(
  baseSeed: RapidRoundsConceptSeed,
  overrides: Partial<Omit<ClinicalDecisionTreeSeed, keyof RapidRoundsConceptSeed>> = {}
): ClinicalDecisionTreeSeed {
  const pivot = baseSeed.pivotClues[0] ?? baseSeed.topic;
  const intervention = baseSeed.managementRules[0] ?? baseSeed.nextTimeRule;
  const complication = baseSeed.commonTraps[0] ?? `nearby trap for ${baseSeed.topic}`;
  const diagnosisNode: DecisionNode = {
    nodeId: "recognition",
    clinicalState: baseSeed.contextualClues[0] ?? baseSeed.schema,
    questionType: "Diagnosis",
    askablePrompt: "What is the most likely diagnosis?",
    correctActionOrAnswer: baseSeed.topic,
    pivotClues: baseSeed.pivotClues,
    supportingClues: baseSeed.supportingClues,
    pertinentNegatives: overrides.pertinentNegatives?.slice(0, 2) ?? baseSeed.secondaryDiscriminators.slice(0, 2),
    distractors: baseSeed.relatedConcepts,
    traps: baseSeed.commonTraps,
    discriminators: baseSeed.primaryDiscriminators,
    downstreamBranches: [
      {
        branchCondition: "diagnosis recognized",
        addedClinicalInformation: `The learner identifies ${baseSeed.topic} from the pivot clue.`,
        nextNodeId: "initial-management",
        whyThisBranchMatters: "Recognition should advance to the first management decision."
      }
    ],
    masteryRequirement: `Recognize ${baseSeed.topic} from ${pivot}.`,
    nextTimeRule: baseSeed.nextTimeRule
  };
  const initialManagementNode: DecisionNode = {
    nodeId: "initial-management",
    clinicalState: `${baseSeed.topic} is now recognized. The immediate decision is first-line management.`,
    questionType: "Initial management",
    askablePrompt: "What is the initial management?",
    correctActionOrAnswer: intervention,
    pivotClues: [pivot],
    supportingClues: baseSeed.supportingClues,
    pertinentNegatives: overrides.pertinentNegatives?.slice(0, 2) ?? baseSeed.secondaryDiscriminators.slice(0, 2),
    distractors: baseSeed.relatedConcepts,
    traps: baseSeed.commonTraps,
    discriminators: baseSeed.primaryDiscriminators,
    downstreamBranches: [
      {
        branchCondition: "initial intervention completed",
        addedClinicalInformation: `The patient receives ${intervention}, and the immediate threat is reassessed.`,
        nextNodeId: "next-step-after-intervention",
        whyThisBranchMatters: "Prior treatment changes the correct next decision."
      }
    ],
    masteryRequirement: `Choose the first action for ${baseSeed.topic}.`,
    nextTimeRule: `After recognizing ${baseSeed.topic}, choose the first stabilizing or disease-directed action.`
  };
  const nextStepNode: DecisionNode = {
    nodeId: "next-step-after-intervention",
    clinicalState: `After ${intervention}, the clinical state has advanced and the next decision is required.`,
    questionType: "Next step after intervention",
    askablePrompt: "What is the next best step after this intervention?",
    correctActionOrAnswer: baseSeed.nextTimeRule,
    pivotClues: [baseSeed.primaryDiscriminators[0] ?? pivot],
    supportingClues: [`prior intervention: ${intervention}`],
    pertinentNegatives: overrides.pertinentNegatives?.slice(0, 2) ?? baseSeed.secondaryDiscriminators.slice(0, 2),
    distractors: baseSeed.relatedConcepts,
    traps: [complication],
    discriminators: baseSeed.secondaryDiscriminators,
    downstreamBranches: [
      {
        branchCondition: "failure to improve",
        addedClinicalInformation: `Despite ${intervention}, the patient fails to improve.`,
        nextNodeId: "failure-or-complication",
        whyThisBranchMatters: "Nonresponse changes the question from routine next step to escalation."
      }
    ],
    masteryRequirement: `Advance from initial management to the next decision point for ${baseSeed.topic}.`,
    nextTimeRule: baseSeed.nextTimeRule
  };
  const failureNode: DecisionNode = {
    nodeId: "failure-or-complication",
    clinicalState: `The expected response does not occur after ${intervention}.`,
    questionType: "Failure to improve",
    askablePrompt: "What is the next step after failure to improve?",
    correctActionOrAnswer: `escalate management for ${baseSeed.topic}`,
    pivotClues: ["failure to improve"],
    supportingClues: [`persistent findings after ${intervention}`],
    pertinentNegatives: ["no reassuring response to initial treatment"],
    distractors: baseSeed.relatedConcepts,
    traps: baseSeed.commonTraps,
    discriminators: baseSeed.secondaryDiscriminators,
    downstreamBranches: [],
    masteryRequirement: `Recognize when ${baseSeed.topic} requires escalation.`,
    nextTimeRule: `When the expected response does not occur, move to the escalation branch.`
  };

  return {
    ...baseSeed,
    illnessScript: overrides.illnessScript ?? baseSeed.schema,
    initialPresentation: overrides.initialPresentation ?? baseSeed.contextualClues[0] ?? baseSeed.schema,
    decisionTree: overrides.decisionTree ?? [diagnosisNode, initialManagementNode, nextStepNode, failureNode],
    pivots: overrides.pivots ?? baseSeed.pivotClues,
    pertinentPositives: overrides.pertinentPositives ?? baseSeed.supportingClues,
    pertinentNegatives: overrides.pertinentNegatives ?? baseSeed.secondaryDiscriminators,
    distractors: overrides.distractors ?? baseSeed.relatedConcepts,
    traps: overrides.traps ?? baseSeed.commonTraps,
    interventions: overrides.interventions ?? baseSeed.managementRules,
    downstreamStates: overrides.downstreamStates ?? ["recognized", "initially treated", "reassessed", "escalated if needed"],
    managementStages: overrides.managementStages ?? ["recognition", "initial management", "post-intervention next step", "failure escalation"],
    discriminators: overrides.discriminators ?? [...baseSeed.primaryDiscriminators, ...baseSeed.secondaryDiscriminators],
    masteryPrerequisites: overrides.masteryPrerequisites ?? [`identify ${pivot}`, `avoid ${complication}`],
    generatedCaseVariants: overrides.generatedCaseVariants ?? DEFAULT_CASE_VARIANT_TEMPLATES
  };
}
