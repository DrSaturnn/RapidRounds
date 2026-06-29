import { buildRapidRoundsReasoningObject } from "@/lib/local-reasoning-engine";
import {
  allDecisionTreeSeeds,
  allSubjectSeeds,
  getSubjectDecisionTreeSeeds,
  getSubjectSeeds,
  SUBJECTS
} from "@/lib/subject-seeds";
import type {
  CaseVariantTemplate,
  ClinicalDecisionTreeSeed,
  DecisionNode,
  GeneratedRapidRoundsCase,
  QuestionBreadth,
  RapidRoundsConceptSeed,
  RapidRoundsSubject
} from "@/lib/subject-seeds/seed-types";
import type { DecisionType, QuestionDto, VignetteFindingAnnotation } from "@/types/practice";

function archetypeToDecisionType(archetype: string): DecisionType {
  const map: Record<string, DecisionType> = {
    Diagnosis: "Diagnosis",
    "Next best step": "Next Best Step",
    "Initial management": "Management",
    "Definitive management": "Management",
    "Mechanism/pathophysiology": "Mechanism",
    "Risk factor": "Risk Factor",
    "Screening/prevention": "Prevention",
    Complication: "Complication",
    "Ethics/capacity": "Board Pearl",
    Biostatistics: "Interpretation",
    "Prognosis/counseling": "Prognosis",
    "Drug adverse effect": "Contraindication"
  };

  if (archetype === "Next step after intervention" || archetype === "Failure to improve") {
    return "Next Best Step";
  }
  if (archetype === "Contraindication") {
    return "Contraindication";
  }

  return map[archetype] ?? "Diagnosis";
}

function promptFor(archetype: string) {
  if (archetype === "Initial management") return "What is the initial management?";
  if (archetype === "Definitive management") return "What is the definitive management?";
  if (archetype === "Next best step") return "What is the next best step?";
  if (archetype === "Mechanism/pathophysiology") return "What mechanism explains this presentation?";
  if (archetype === "Risk factor") return "Which risk factor best explains this presentation?";
  if (archetype === "Screening/prevention") return "What preventive step is most appropriate?";
  if (archetype === "Complication") return "What complication is most likely?";
  if (archetype === "Ethics/capacity") return "What is the most appropriate ethical response?";
  if (archetype === "Biostatistics") return "Which interpretation is most accurate?";
  if (archetype === "Prognosis/counseling") return "What counseling point is most appropriate?";
  if (archetype === "Drug adverse effect") return "What should be avoided?";
  if (archetype === "Next step after intervention") return "What is the next best step after this intervention?";
  if (archetype === "Failure to improve") return "What should be done after failure to improve?";
  if (archetype === "Contraindication") return "What is contraindicated?";
  return "What is the most likely diagnosis?";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

const breadthRank: Record<QuestionBreadth, number> = {
  primary: 0,
  expanded: 1,
  comprehensive: 2
};

function normalizeQuestionBreadth(value?: string | null): QuestionBreadth {
  if (value === "primary" || value === "expanded" || value === "comprehensive") {
    return value;
  }

  return "comprehensive";
}

function nodeBreadth(node: DecisionNode): QuestionBreadth {
  if (node.nodeId === "recognition" || node.nodeId === "initial-management") {
    return "primary";
  }

  if (node.nodeId === "next-step-after-intervention") {
    return "expanded";
  }

  return "comprehensive";
}

function isWithinBreadth(candidate: QuestionBreadth, selected: QuestionBreadth) {
  return breadthRank[candidate] <= breadthRank[selected];
}

function buildAnswerChoices(seed: RapidRoundsConceptSeed) {
  const distractors = unique([
    ...seed.relatedConcepts,
    ...seed.commonTraps.map((trap) => trap.split(/ instead of | from | versus | vs\.? /i).pop() ?? trap),
    ...seed.secondaryDiscriminators.map((item) => item.split(/\s+/).slice(0, 4).join(" "))
  ])
    .filter((choice) => choice.toLowerCase() !== seed.topic.toLowerCase())
    .slice(0, 3);

  const choices = unique([seed.topic, ...distractors]);
  while (choices.length < 4) {
    choices.push(`${seed.topic} mimic ${choices.length}`);
  }

  return choices.slice(0, 4).map((text, index) => ({
    label: String.fromCharCode(65 + index),
    text,
    isCorrect: text === seed.topic
  }));
}

function buildNodeAnswerChoices(seed: ClinicalDecisionTreeSeed, node: DecisionNode) {
  const distractors = unique([
    ...node.distractors,
    ...node.traps,
    ...seed.relatedConcepts,
    ...node.downstreamBranches.map((branch) => branch.nextNodeId.replace(/-/g, " "))
  ])
    .filter((choice) => choice.toLowerCase() !== node.correctActionOrAnswer.toLowerCase())
    .slice(0, 3);

  const choices = unique([node.correctActionOrAnswer, ...distractors]);
  while (choices.length < 4) {
    choices.push(`${seed.topic} distractor ${choices.length}`);
  }

  return choices.slice(0, 4).map((text, index) => ({
    label: String.fromCharCode(65 + index),
    text,
    isCorrect: text === node.correctActionOrAnswer
  }));
}

function buildOriginalVignette(seed: RapidRoundsConceptSeed) {
  const patient = seed.subject === "Pediatrics" ? "A child" : seed.subject === "OB/GYN" ? "A patient" : "An adult patient";
  const context = seed.contextualClues[0] ?? seed.schema;
  const support = seed.supportingClues[0] ?? seed.schema;
  const pivot = seed.pivotClues[0] ?? seed.topic;

  return `${patient} presents with ${context}. Additional findings include ${support}. The deciding clue is ${pivot}.`;
}

function buildClueMap(seed: RapidRoundsConceptSeed): VignetteFindingAnnotation[] {
  return [
    { text: seed.contextualClues[0] ?? seed.schema, role: "context" },
    { text: seed.supportingClues[0] ?? seed.schema, role: "supporting" },
    {
      text: seed.pivotClues[0] ?? seed.topic,
      role: "pivot_clue",
      explanation: seed.primaryDiscriminators[0] ?? seed.nextTimeRule
    }
  ];
}

function buildNodeClueMap(seed: ClinicalDecisionTreeSeed, node: DecisionNode): VignetteFindingAnnotation[] {
  return [
    { text: node.clinicalState, role: "context" },
    ...node.supportingClues.slice(0, 2).map((text) => ({ text, role: "supporting" as const })),
    ...node.pivotClues.slice(0, 2).map((text) => ({
      text,
      role: "pivot_clue" as const,
      explanation: node.discriminators[0] ?? node.nextTimeRule
    })),
    ...node.pertinentNegatives.slice(0, 1).map((text) => ({
      text,
      role: "neutral" as const,
      explanation: "This negative finding rules out a tempting branch."
    })),
    ...node.distractors.slice(0, 1).map((text) => ({
      text,
      role: "noise" as const,
      explanation: `This can distract from the ${seed.topic} decision branch.`
    }))
  ];
}

function priorInterventionFor(seed: ClinicalDecisionTreeSeed, node: DecisionNode) {
  const incomingBranch = seed.decisionTree
    .flatMap((candidate) => candidate.downstreamBranches)
    .find((branch) => branch.nextNodeId === node.nodeId);

  return incomingBranch?.addedClinicalInformation;
}

function buildTreeVignette(seed: ClinicalDecisionTreeSeed, node: DecisionNode, variant: CaseVariantTemplate) {
  const context = node.clinicalState || seed.initialPresentation;
  const pivot = node.pivotClues[0] ?? seed.pivots[0] ?? seed.topic;
  const support = node.supportingClues[0] ?? seed.pertinentPositives[0] ?? seed.schema;
  const negative = node.pertinentNegatives[0] ?? seed.pertinentNegatives[0];
  const distractor = node.distractors[0] ?? seed.distractors[0];
  const prior = priorInterventionFor(seed, node);
  const branch = node.downstreamBranches[0];

  if (variant.composition === "minimal_decisive_pivot") {
    return `A patient is being evaluated for ${seed.topic}. The decisive finding is ${pivot}.`;
  }

  if (variant.composition === "late_stage_after_intervention") {
    return `${context}. ${prior ?? `The patient receives ${seed.interventions[0] ?? node.correctActionOrAnswer}, and the clinical state is reassessed.`} ${support}.`;
  }

  if (variant.composition === "complication_nonresponse_branch") {
    return `${context}. ${branch?.addedClinicalInformation ?? `Despite ${seed.interventions[0] ?? node.correctActionOrAnswer}, the patient fails to improve.`} ${branch?.whyThisBranchMatters ?? node.nextTimeRule}.`;
  }

  if (variant.composition === "context_pivot_distractors") {
    return `${context}. The key clue is ${pivot}. A tempting but less decisive detail is ${distractor ?? support}.`;
  }

  if (variant.composition === "context_negative_generic_positive") {
    return `${context}. The patient has ${support}${negative ? `, but ${negative}` : ""}.`;
  }

  return `${context}. Findings include ${support}. The pivot is ${pivot}${negative ? `, with ${negative}` : ""}.`;
}

export function generateCaseFromSeed(seed: RapidRoundsConceptSeed): GeneratedRapidRoundsCase {
  const archetype = seed.questionArchetypes[0] ?? "Diagnosis";
  const vignette = buildOriginalVignette(seed);
  const answerPrompt = promptFor(archetype);
  const answerChoices = buildAnswerChoices(seed);
  const rawText = [
    vignette,
    answerPrompt,
    ...answerChoices.map((choice) => `${choice.label}. ${choice.text}`)
  ].join("\n");
  const reasoningObject = buildRapidRoundsReasoningObject({
    rawText,
    highlightedText: `Educational objective: ${seed.nextTimeRule}\nCorrect answer: ${seed.topic}.`
  });
  const explanation = `${seed.primaryDiscriminators[0] ?? seed.nextTimeRule} ${seed.managementRules[0] ?? ""}`.trim();
  const clueMap = buildClueMap(seed);
  const question: QuestionDto = {
    id: `generated-${seed.id}`,
    specialty: seed.subject,
    system: seed.subject,
    topic: seed.topic,
    canonicalProblem: seed.schema,
    variantType: String(archetype).toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    difficulty: 2,
    stem: `${vignette}\n\n${answerPrompt}`,
    displayStem: `${vignette}\n\n${answerPrompt}`,
    decisionType: archetypeToDecisionType(archetype),
    pattern: seed.schema,
    management: seed.managementRules[0] ?? seed.nextTimeRule,
    diagnosis: seed.topic,
    vignetteFindings: clueMap
  };

  return {
    id: question.id,
    subject: seed.subject,
    topic: seed.topic,
    schema: seed.schema,
    archetype,
    vignette,
    answerPrompt,
    answerChoices,
    correctAnswer: seed.topic,
    explanation,
    clueMap,
    reasoningObject,
    conceptCard: reasoningObject.conceptCard,
    question,
    seed
  };
}

export function generateCasesFromDecisionTreeSeed(
  seed: ClinicalDecisionTreeSeed,
  breadth?: QuestionBreadth | string | null
): GeneratedRapidRoundsCase[] {
  const selectedBreadth = normalizeQuestionBreadth(breadth);
  const selectedNodes = seed.decisionTree.filter((node) => isWithinBreadth(nodeBreadth(node), selectedBreadth));
  const selectedVariants = seed.generatedCaseVariants.filter((variant) => isWithinBreadth(variant.breadth, selectedBreadth));

  return selectedNodes.flatMap((node) =>
    selectedVariants.map((variant) => {
      const vignette = buildTreeVignette(seed, node, variant);
      const answerPrompt = node.askablePrompt || promptFor(node.questionType);
      const answerChoices = buildNodeAnswerChoices(seed, node);
      const rawText = [
        vignette,
        answerPrompt,
        ...answerChoices.map((choice) => `${choice.label}. ${choice.text}`)
      ].join("\n");
      const reasoningObject = buildRapidRoundsReasoningObject({
        rawText,
        highlightedText: `Educational objective: ${node.nextTimeRule}\nCorrect answer: ${node.correctActionOrAnswer}.`
      });
      const clueMap = buildNodeClueMap(seed, node);
      const id = `generated-tree-${seed.id}-${node.nodeId}-${variant.variantId}`;
      const explanation = `${node.discriminators[0] ?? node.nextTimeRule} ${node.nextTimeRule}`.trim();
      const question: QuestionDto = {
        id,
        specialty: seed.subject,
        system: seed.subject,
        topic: seed.topic,
        canonicalProblem: seed.illnessScript,
        variantType: `${node.nodeId}_${variant.variantId}`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase(),
        difficulty: node.nodeId === "recognition" ? 1 : node.nodeId.includes("failure") ? 4 : 2,
        stem: `${vignette}\n\n${answerPrompt}`,
        displayStem: `${vignette}\n\n${answerPrompt}`,
        decisionType: archetypeToDecisionType(node.questionType),
        pattern: node.clinicalState,
        management: node.nextTimeRule,
        diagnosis: seed.topic,
        vignetteFindings: clueMap
      };

      return {
        id,
        subject: seed.subject,
        topic: seed.topic,
        schema: seed.illnessScript,
        archetype: node.questionType === "Next step after intervention" || node.questionType === "Failure to improve"
          ? "Next best step"
          : node.questionType === "Contraindication"
            ? "Drug adverse effect"
            : node.questionType,
        vignette,
        answerPrompt,
        answerChoices,
        correctAnswer: node.correctActionOrAnswer,
        explanation,
        clueMap,
        reasoningObject,
        conceptCard: reasoningObject.conceptCard,
        question,
        seed,
        treeSeed: seed,
        decisionNode: node,
        variantTemplate: variant
      } satisfies GeneratedRapidRoundsCase;
    })
  );
}

export function getGeneratedCasesForSubject(subject?: string | null, breadth?: QuestionBreadth | string | null) {
  const selectedBreadth = normalizeQuestionBreadth(breadth);
  const treeCases = getSubjectDecisionTreeSeeds(subject).flatMap((seed) => generateCasesFromDecisionTreeSeed(seed, selectedBreadth));
  const flatCases = getSubjectSeeds(subject).map(generateCaseFromSeed);
  return selectedBreadth === "primary" ? treeCases : [...treeCases, ...flatCases];
}

export function getGeneratedCaseById(id: string) {
  const treeCase = allDecisionTreeSeeds
    .flatMap((seed) => generateCasesFromDecisionTreeSeed(seed))
    .find((item) => item.id === id);
  if (treeCase) {
    return treeCase;
  }

  const normalized = id.replace(/^generated-/, "");
  const seed = allSubjectSeeds.find((item) => item.id === normalized || `generated-${item.id}` === id);
  return seed ? generateCaseFromSeed(seed) : undefined;
}

export function getGeneratedSubjectCounts() {
  return SUBJECTS.map((subject) => ({
    subject,
    count: getGeneratedCasesForSubject(subject).length
  }));
}

export function isGeneratedSubject(subject: string): subject is RapidRoundsSubject {
  return SUBJECTS.includes(subject as RapidRoundsSubject);
}
