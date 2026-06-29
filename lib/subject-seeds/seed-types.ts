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
