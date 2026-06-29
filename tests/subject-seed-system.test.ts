import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  allSubjectSeeds,
  allDecisionTreeSeeds,
  allSchemaNodes,
  getSubjectDecisionTreeSeeds,
  getSubjectSchemaNodes,
  getSubjectSeeds,
  SUBJECT_REGISTRY,
  SUBJECTS
} from "@/lib/subject-seeds";
import type { RapidRoundsConceptSeed, SchemaNode } from "@/lib/subject-seeds/seed-types";
import {
  countGeneratedCasesForSubject,
  generateCaseFromSeed,
  generateCasesFromDecisionTreeSeed,
  generateCasesFromSchemaNode,
  getGeneratedCaseById,
  getGeneratedCaseCacheStats,
  getGeneratedCasesForSubject,
  getGeneratedSubjectCounts,
  resetGeneratedCaseCacheForTests
} from "@/lib/seed-case-generator";
import { getCurriculumIndexStats, resetCurriculumIndexForTests } from "@/lib/curriculum-index";

const expectedSubjects = [
  "Internal Medicine",
  "Surgery",
  "OB/GYN",
  "Pediatrics",
  "Psychiatry",
  "Family Medicine",
  "Emergency Medicine",
  "Neurology",
  "Ethics",
  "Biostatistics"
];

function assertSeed(seed: RapidRoundsConceptSeed) {
  assert.ok(seed.id);
  assert.ok(seed.subject);
  assert.ok(seed.topic);
  assert.ok(seed.schema);
  assert.ok(seed.questionArchetypes.length > 0);
  assert.ok(seed.pivotClues.length > 0);
  assert.ok(seed.supportingClues.length > 0);
  assert.ok(seed.contextualClues.length > 0);
  assert.ok(seed.commonTraps.length > 0);
  assert.ok(seed.primaryDiscriminators.length > 0);
  assert.ok(seed.secondaryDiscriminators.length > 0);
  assert.ok(seed.managementRules.length > 0);
  assert.ok(Array.isArray(seed.contraindications));
  assert.ok(seed.nextTimeRule);
  assert.ok(seed.relatedConcepts.length > 0);
  assert.ok(seed.guidelineReferences.length > 0);
}

function assertSchemaNode(node: SchemaNode) {
  assert.ok(node.id);
  assert.ok(node.parentSeedId);
  assert.ok(node.shelf);
  assert.ok(node.subject);
  assert.ok(node.system);
  assert.ok(node.topic);
  assert.ok(node.schemaName);
  assert.ok(node.schema);
  assert.ok(node.nodeKind);
  assert.ok(node.questionArchetype);
  assert.ok(node.nbmeArchetype);
  assert.ok(node.nbmeBlueprintCategory);
  assert.ok(node.estimatedYield > 0);
  assert.equal(typeof node.caseTierEligibility.core, "boolean");
  assert.equal(node.caseTierEligibility.comprehensive, true);
  assert.ok(node.initialQuestionSchema.classicEpidemiologyFrame);
  assert.ok(node.initialQuestionSchema.atypicalEpidemiologyFrame);
  assert.ok(node.initialQuestionSchema.misleadingContextFrame);
  assert.ok(node.initialQuestionSchema.minimalContextFrame);
  assert.ok(node.initialQuestionSchema.chiefProblem);
  assert.ok(node.initialQuestionSchema.pivotSlot);
  assert.ok(node.initialQuestionSchema.task);
  assert.ok(node.shelfFrequencyWeight > 0);
  assert.ok(node.shelfBand === "core" || node.shelfBand === "comprehensive");
  assert.ok(node.epidemiologyFrames.length > 0);
  assert.ok(node.chiefComplaintVariants.length > 0);
  assert.ok(node.chiefProblem);
  assert.ok(node.corePertinentPositives.length > 0);
  assert.ok(Array.isArray(node.corePertinentNegatives));
  assert.ok(node.pertinentPositives.length > 0);
  assert.ok(Array.isArray(node.pertinentNegatives));
  assert.ok(node.pivotClue);
  assert.ok(node.pivotCategory);
  assert.ok(node.pivotClues.length > 0);
  assert.ok(node.supportingClues.length > 0);
  assert.ok(node.contextualClues.length > 0);
  assert.ok(node.discriminatorPair.conceptA);
  assert.ok(node.discriminatorPair.conceptB);
  assert.ok(node.discriminatorPair.pivotThatSeparates);
  assert.ok(node.discriminatorPair.whyPivotSupportsA);
  assert.ok(node.discriminatorPair.whatWouldSupportB);
  assert.ok(node.discriminatorPair.commonWrongSchema);
  assert.ok(node.discriminatorPair.conceptASchema.length > 0);
  assert.ok(node.discriminatorPair.conceptBSchema.length > 0);
  assert.ok(node.discriminatorPairs.length > 0);
  assert.ok(node.semanticLinks.length > 0);
  assert.ok(node.semanticLinks.every((link) => link.sourceText && link.relationship && link.targetConcept));
  assert.ok(node.answerType);
  assert.ok(node.managementStage);
  assert.ok(Array.isArray(node.priorInterventions));
  assert.ok(Array.isArray(node.downstreamStateChanges));
  assert.ok(Array.isArray(node.complicationBranches));
  assert.ok(Array.isArray(node.contraindicationBranches));
  assert.ok(node.adaptiveBreadthVariants.length > 0);
  assert.ok(node.correctAnswer);
  assert.ok(node.incorrectAnswerSchemas.length > 0);
  assert.ok(node.answerPrompt);
  assert.ok(node.commonTraps.length > 0);
  assert.ok(node.nextTimeRule);
  assert.ok(node.relatedConcepts.length > 0);
  assert.ok(node.guidelineReferences.length > 0);
  assert.ok(node.sourcePolicyMetadata.reconstructedFromMedicalTruth);
  assert.equal(node.sourcePolicyMetadata.proprietaryExpressionRetained, false);
  assert.ok(node.sourcePolicyMetadata.validationSources.length > 0);
}

describe("RapidRounds subject seed system", () => {
  it("registers every dropdown subject with a real seed library", () => {
    assert.deepEqual([...SUBJECTS].sort(), expectedSubjects.sort());

    for (const subject of SUBJECTS) {
      assert.ok(SUBJECT_REGISTRY[subject].length > 0, `${subject} should have seeds`);
    }
  });

  it("gives every seed the required canonical concept fields", () => {
    assert.ok(allSubjectSeeds.length >= 120);
    for (const seed of allSubjectSeeds) {
      assertSeed(seed);
    }
  });

  it("derives NBME clinical reasoning SchemaNodes from every disease concept", () => {
    assert.ok(allSchemaNodes.length > allSubjectSeeds.length);

    for (const seed of allSubjectSeeds) {
      const schemaNodes = allSchemaNodes.filter((node) => node.parentSeedId === seed.id);
      assert.equal(schemaNodes.length, seed.questionArchetypes.length);
      assert.ok(schemaNodes.every((node) => node.topic === seed.topic));
    }

    for (const node of allSchemaNodes) {
      assertSchemaNode(node);
    }
  });

  it("creates schema-node registries for every shelf subject", () => {
    for (const subject of SUBJECTS) {
      const nodes = getSubjectSchemaNodes(subject);
      assert.ok(nodes.length > 0, `${subject} should expose schema nodes`);
      assert.ok(nodes.every((node) => node.subject === subject && node.shelf === subject));
    }
  });

  it("weights SchemaNodes into core and comprehensive shelf bands", () => {
    assert.ok(allSchemaNodes.some((node) => node.shelfBand === "core" && node.shelfFrequencyWeight >= 3));
    assert.ok(allSchemaNodes.some((node) => node.shelfBand === "comprehensive" && !node.caseTierEligibility.core));
    assert.ok(allSchemaNodes.some((node) => node.shelfBand === "comprehensive" && node.caseTierEligibility.comprehensive));
  });

  it("generates Core and Comprehensive cases from schema nodes without exposing parent-topic repetition as the unit", () => {
    const coreNode = allSchemaNodes.find((node) => node.caseTierEligibility.core);
    const comprehensiveNode = allSchemaNodes.find((node) => !node.caseTierEligibility.core && node.caseTierEligibility.comprehensive);

    assert.ok(coreNode);
    assert.ok(comprehensiveNode);

    const coreCases = generateCasesFromSchemaNode(coreNode, "primary");
    const comprehensiveCases = generateCasesFromSchemaNode(comprehensiveNode, "comprehensive");

    assert.ok(coreCases.length > 0);
    assert.ok(comprehensiveCases.length > 0);
    assert.ok(coreCases.every((item) => item.schemaNode?.id === coreNode.id));
    assert.ok(comprehensiveCases.every((item) => item.schemaNode?.id === comprehensiveNode.id));
    assert.ok(coreCases.every((item) => item.variantTemplate?.breadth === "primary"));
    assert.ok(comprehensiveCases.some((item) => item.variantTemplate?.breadth === "comprehensive"));
  });

  it("weights high-frequency Internal Medicine blueprint categories toward more Core cases while preserving low-yield Comprehensive coverage", () => {
    const imCases = getGeneratedCasesForSubject("Internal Medicine", "comprehensive");
    const categoryCounts = new Map<string, { core: number; comprehensive: number }>();

    for (const generatedCase of imCases) {
      const category = generatedCase.schemaNode?.nbmeBlueprintCategory;
      if (!category) continue;
      const counts = categoryCounts.get(category) ?? { core: 0, comprehensive: 0 };
      if (generatedCase.schemaNode?.shelfBand === "core" && generatedCase.variantTemplate?.breadth === "primary") {
        counts.core += 1;
      }
      counts.comprehensive += 1;
      categoryCounts.set(category, counts);
    }

    assert.ok((categoryCounts.get("Cardiovascular Disorders")?.core ?? 0) > (categoryCounts.get("Immunologic Disorders")?.core ?? 0));
    assert.ok((categoryCounts.get("Diseases of the Respiratory System")?.core ?? 0) > (categoryCounts.get("Mental Disorders")?.core ?? 0));

    for (const lowYieldCategory of [
      "Immunologic Disorders",
      "Mental Disorders",
      "Diseases of the Nervous System",
      "Female Reproductive System",
      "Diseases of the Skin",
      "Musculoskeletal and Connective Tissue Disorders"
    ]) {
      assert.ok((categoryCounts.get(lowYieldCategory)?.comprehensive ?? 0) > 0, `${lowYieldCategory} should appear in Comprehensive packaging`);
    }
  });

  it("generates original cases with answer choices, correct answer, clue map, reasoning object, and concept card", () => {
    const seed = getSubjectSeeds("Emergency Medicine")[0];
    const generated = generateCaseFromSeed(seed);

    assert.equal(generated.subject, "Emergency Medicine");
    assert.ok(generated.vignette.length > 40);
    assert.ok(generated.answerChoices.length >= 4);
    assert.ok(generated.answerChoices.some((choice) => choice.isCorrect && choice.text === generated.correctAnswer));
    assert.ok(generated.explanation.length > 0);
    assert.ok(generated.clueMap.some((clue) => clue.role === "pivot_clue"));
    assert.ok(generated.reasoningObject.conceptCard);
    assert.equal(generated.conceptCard, generated.reasoningObject.conceptCard);
    assert.equal(generated.question.specialty, "Emergency Medicine");
  });

  it("loads selected subject cases from the seed registry", () => {
    const ethicsCases = getGeneratedCasesForSubject("Ethics");
    const ethicsSchemaCaseCount = countGeneratedCasesForSubject("Ethics");
    const biostatisticsCaseCount = countGeneratedCasesForSubject("Biostatistics");
    const counts = getGeneratedSubjectCounts();

    assert.equal(ethicsCases.length, ethicsSchemaCaseCount);
    assert.ok(ethicsCases.every((item) => item.question.specialty === "Ethics"));
    assert.equal(counts.find((item) => item.subject === "Biostatistics")?.count, biostatisticsCaseCount);
  });

  it("uses lightweight subject counts without generating full case pools", () => {
    resetGeneratedCaseCacheForTests();

    const counts = getGeneratedSubjectCounts();
    const stats = getGeneratedCaseCacheStats();

    assert.ok(counts.every((item) => item.count > 0));
    assert.equal(stats.subjectCasePoolBuilds, 0);
    assert.equal(stats.schemaNodeCasePoolBuilds, 0);
    assert.equal(stats.caseIdIndexBuilds, 0);
  });

  it("retrieves generated cases by stable generated id", () => {
    const firstNeurology = getGeneratedCasesForSubject("Neurology")[0];
    assert.equal(getGeneratedCaseById(firstNeurology.id)?.topic, firstNeurology.topic);
  });

  it("keeps generated cases stable for the same schema input across cache resets", () => {
    resetGeneratedCaseCacheForTests();
    const first = getGeneratedCasesForSubject("Pediatrics", "primary").map((item) => ({
      id: item.id,
      vignette: item.vignette,
      correctAnswer: item.correctAnswer
    }));

    resetGeneratedCaseCacheForTests();
    const second = getGeneratedCasesForSubject("Pediatrics", "primary").map((item) => ({
      id: item.id,
      vignette: item.vignette,
      correctAnswer: item.correctAnswer
    }));

    assert.deepEqual(second, first);
  });

  it("selecting a subject builds only that subject and breadth cache", () => {
    resetGeneratedCaseCacheForTests();

    const cases = getGeneratedCasesForSubject("Ethics", "primary");
    const stats = getGeneratedCaseCacheStats();

    assert.ok(cases.length > 0);
    assert.equal(stats.subjectCasePoolBuilds, 1);
    assert.deepEqual(stats.subjectCacheKeys, ["Ethics:primary"]);
    assert.ok(stats.schemaNodeCacheKeys.every((key) => key.endsWith(":primary")));
    assert.ok(stats.schemaNodeCasePoolBuilds <= getSubjectSchemaNodes("Ethics").length);
  });

  it("changing mode regenerates only the selected subject/mode cache", () => {
    resetGeneratedCaseCacheForTests();

    getGeneratedCasesForSubject("Surgery", "primary");
    getGeneratedCasesForSubject("Surgery", "expanded");
    getGeneratedCasesForSubject("Surgery", "expanded");
    const stats = getGeneratedCaseCacheStats();

    assert.equal(stats.subjectCasePoolBuilds, 2);
    assert.deepEqual(stats.subjectCacheKeys.sort(), ["Surgery:expanded", "Surgery:primary"]);
  });

  it("repeated next-case selection does not rebuild schema-node indexes or generated pools", () => {
    resetCurriculumIndexForTests();
    resetGeneratedCaseCacheForTests();

    const first = getGeneratedCasesForSubject("Neurology", "primary")[0];
    const firstStats = {
      curriculum: getCurriculumIndexStats(),
      generated: getGeneratedCaseCacheStats()
    };
    const second = getGeneratedCasesForSubject("Neurology", "primary")[0];
    const secondStats = {
      curriculum: getCurriculumIndexStats(),
      generated: getGeneratedCaseCacheStats()
    };

    assert.equal(second.id, first.id);
    assert.equal(secondStats.curriculum.curriculumIndexBuilds, firstStats.curriculum.curriculumIndexBuilds);
    assert.equal(secondStats.generated.subjectCasePoolBuilds, firstStats.generated.subjectCasePoolBuilds);
    assert.equal(secondStats.generated.schemaNodeCasePoolBuilds, firstStats.generated.schemaNodeCasePoolBuilds);
  });

  it("keeps Moleskine rendering detached from generated case regeneration", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const moleskineRenderer = readFileSync("components/moleskine/MoleskinePracticeRenderer.tsx", "utf8");

    assert.match(practicePanel, /clinicalNotebook/);
    assert.doesNotMatch(moleskineRenderer, /getGeneratedCasesForSubject|generateCasesFromSchemaNode|getGeneratedCaseById/);
  });

  it("wires the subject dropdown and APIs to the registry instead of UI-hardcoded case sets", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const subjectsRoute = readFileSync("app/api/subjects/route.ts", "utf8");
    const nextRoute = readFileSync("app/api/questions/next/route.ts", "utf8");
    const answerRoute = readFileSync("app/api/practice/answer/route.ts", "utf8");

    assert.match(practicePanel, /import \{ SUBJECTS \} from "@\/lib\/subject-seeds"/);
    assert.doesNotMatch(practicePanel, /const requiredSubjects = \[[\s\S]*Internal Medicine/);
    assert.match(subjectsRoute, /getGeneratedSubjectCounts/);
    assert.match(nextRoute, /getGeneratedCasesForSubject/);
    assert.match(answerRoute, /getGeneratedCaseById/);
  });

  it("does not store commercial question-bank wording in seed libraries", () => {
    const serialized = JSON.stringify([...allSubjectSeeds, ...allDecisionTreeSeeds]);

    assert.doesNotMatch(serialized, /UWorld|AMBOSS|NBME|CMS form|question bank/i);
  });

  it("gives every subject at least one decision-tree seed with staged nodes", () => {
    for (const subject of SUBJECTS) {
      const treeSeeds = getSubjectDecisionTreeSeeds(subject);
      assert.ok(treeSeeds.length >= 1, `${subject} should have a decision-tree seed`);
      for (const treeSeed of treeSeeds) {
        assert.ok(treeSeed.decisionTree.length >= 3, `${treeSeed.topic} should have at least three nodes`);
        assert.ok(treeSeed.generatedCaseVariants.length >= 2, `${treeSeed.topic} should have at least two variant templates`);
      }
    }
  });

  it("generates at least two case variants from every decision node", () => {
    for (const treeSeed of allDecisionTreeSeeds) {
      const cases = generateCasesFromDecisionTreeSeed(treeSeed);
      for (const node of treeSeed.decisionTree) {
        const nodeCases = cases.filter((item) => item.decisionNode?.nodeId === node.nodeId);
        assert.ok(nodeCases.length >= 2, `${treeSeed.topic}/${node.nodeId} should produce at least two cases`);
      }
    }
  });

  it("filters generated tree cases by shelf breadth", () => {
    const giBleedTree = getSubjectDecisionTreeSeeds("Internal Medicine")[0];
    const primaryCases = generateCasesFromDecisionTreeSeed(giBleedTree, "primary");
    const expandedCases = generateCasesFromDecisionTreeSeed(giBleedTree, "expanded");
    const comprehensiveCases = generateCasesFromDecisionTreeSeed(giBleedTree, "comprehensive");

    assert.ok(primaryCases.length > 0);
    assert.ok(expandedCases.length > primaryCases.length);
    assert.ok(comprehensiveCases.length > expandedCases.length);
    assert.ok(primaryCases.every((item) => item.decisionNode?.nodeId === "recognition" || item.decisionNode?.nodeId === "initial-management"));
    assert.ok(expandedCases.some((item) => item.decisionNode?.nodeId === "next-step-after-intervention"));
    assert.ok(comprehensiveCases.some((item) => item.decisionNode?.nodeId === "failure-or-complication"));
  });

  it("uses primary breadth to focus subject queues on core generated shelf questions", () => {
    const primaryCases = getGeneratedCasesForSubject("Internal Medicine", "primary");
    const comprehensiveCases = getGeneratedCasesForSubject("Internal Medicine", "comprehensive");

    assert.ok(primaryCases.length > 0);
    assert.ok(comprehensiveCases.length > primaryCases.length);
    assert.ok(primaryCases.every((item) => item.schemaNode?.shelfBand === "core" && item.subject === "Internal Medicine"));
    assert.ok(comprehensiveCases.some((item) => item.schemaNode?.shelfBand === "comprehensive"));
  });

  it("generates schema-node downstream management cases with prior intervention and state-change text", () => {
    const downstreamNode = allSchemaNodes.find((node) => node.priorInterventions.length > 0 && node.downstreamStateChanges.length > 0);
    assert.ok(downstreamNode);

    const downstreamCase = generateCasesFromSchemaNode(downstreamNode, "comprehensive")
      .find((item) => item.variantTemplate?.composition === "late_stage_after_intervention");

    assert.ok(downstreamCase);
    assert.match(downstreamCase.vignette, /already received|clinical state has advanced|next decision/i);
    assert.ok(downstreamCase.correctAnswer);
  });

  it("advances management answers when a schema node includes a later clinical state", () => {
    const byParent = new Map<string, SchemaNode[]>();
    for (const node of allSchemaNodes) {
      byParent.set(node.parentSeedId, [...(byParent.get(node.parentSeedId) ?? []), node]);
    }

    const stagedNodes = [...byParent.values()].find((nodes) =>
      nodes.some((node) => node.questionArchetype === "Initial management") &&
      nodes.some((node) => node.questionArchetype === "Definitive management")
    );

    assert.ok(stagedNodes);
    const initial = stagedNodes.find((node) => node.questionArchetype === "Initial management");
    const definitive = stagedNodes.find((node) => node.questionArchetype === "Definitive management");
    assert.ok(initial);
    assert.ok(definitive);
    assert.notEqual(initial.correctAnswer.toLowerCase(), definitive.correctAnswer.toLowerCase());
  });

  it("generates downstream cases with prior interventions or state changes", () => {
    const giBleedTree = getSubjectDecisionTreeSeeds("Internal Medicine")[0];
    const cases = generateCasesFromDecisionTreeSeed(giBleedTree);
    const downstream = cases.find((item) => item.decisionNode?.nodeId === "next-step-after-intervention");

    assert.ok(downstream);
    assert.match(downstream.vignette, /receives|reassessed|intervention|transfusion|endoscopy/i);
    assert.notEqual(downstream.correctAnswer.toLowerCase(), giBleedTree.topic.toLowerCase());
  });

  it("uses the final question to control the answer type for the same topic", () => {
    const giBleedTree = getSubjectDecisionTreeSeeds("Internal Medicine")[0];
    const cases = generateCasesFromDecisionTreeSeed(giBleedTree);
    const diagnosis = cases.find((item) => item.decisionNode?.questionType === "Diagnosis");
    const initialManagement = cases.find((item) => item.decisionNode?.questionType === "Initial management");
    const nextStep = cases.find((item) => item.decisionNode?.questionType === "Next step after intervention");

    assert.ok(diagnosis);
    assert.ok(initialManagement);
    assert.ok(nextStep);
    assert.equal(diagnosis.correctAnswer, giBleedTree.topic);
    assert.notEqual(initialManagement.correctAnswer, diagnosis.correctAnswer);
    assert.notEqual(nextStep.correctAnswer, diagnosis.correctAnswer);
    assert.match(initialManagement.answerPrompt, /initial management/i);
    assert.match(nextStep.answerPrompt, /after this intervention/i);
  });

  it("emits valid RapidRoundsReasoningObjects for tree-generated cases", () => {
    const caseFromTree = generateCasesFromSchemaNode(getSubjectSchemaNodes("Emergency Medicine")[0])[0];

    assert.ok(caseFromTree.reasoningObject.conceptCard);
    assert.ok(caseFromTree.reasoningObject.pipelineTrace.some((entry) => entry.stage === "conceptCardBuilder"));
    assert.ok(caseFromTree.reasoningObject.confirmedAnswer);
    assert.ok(caseFromTree.schemaNode);
  });

  it("emits post-answer teaching fields from generated schema-node cases", () => {
    const generatedCase = generateCasesFromSchemaNode(getSubjectSchemaNodes("OB/GYN")[0])[0];

    assert.ok(generatedCase.reasoningObject.pivotClue);
    assert.ok(generatedCase.reasoningObject.semanticLinks.length > 0);
    assert.ok(generatedCase.reasoningObject.intendedDiscriminatorPair);
    assert.ok(generatedCase.reasoningObject.intendedDiscriminatorPair.conceptA);
    assert.ok(generatedCase.reasoningObject.intendedDiscriminatorPair.conceptB);
    assert.ok(generatedCase.reasoningObject.clinicalResolution);
    assert.ok(generatedCase.reasoningObject.nextTimeRule);
  });

  it("prevents same-node superficial duplicates by assigning distinct variant compositions and stems", () => {
    const node = allSchemaNodes.find((candidate) => generateCasesFromSchemaNode(candidate, "comprehensive").length >= 3);
    assert.ok(node);

    const cases = generateCasesFromSchemaNode(node, "comprehensive");
    const compositions = new Set(cases.map((item) => item.variantTemplate?.composition));
    const stems = new Set(cases.map((item) => item.vignette));

    assert.equal(compositions.size, cases.length);
    assert.equal(stems.size, cases.length);
  });
});
