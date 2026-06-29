import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  allSubjectSeeds,
  allDecisionTreeSeeds,
  getSubjectDecisionTreeSeeds,
  getSubjectSeeds,
  SUBJECT_REGISTRY,
  SUBJECTS
} from "@/lib/subject-seeds";
import type { RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";
import {
  generateCaseFromSeed,
  generateCasesFromDecisionTreeSeed,
  getGeneratedCaseById,
  getGeneratedCasesForSubject,
  getGeneratedSubjectCounts
} from "@/lib/seed-case-generator";

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
    const ethicsTreeCaseCount = getSubjectDecisionTreeSeeds("Ethics").flatMap((seed) => generateCasesFromDecisionTreeSeed(seed)).length;
    const biostatisticsCaseCount = getGeneratedCasesForSubject("Biostatistics").length;
    const counts = getGeneratedSubjectCounts();

    assert.equal(ethicsCases.length, SUBJECT_REGISTRY.Ethics.length + ethicsTreeCaseCount);
    assert.ok(ethicsCases.every((item) => item.question.specialty === "Ethics"));
    assert.equal(counts.find((item) => item.subject === "Biostatistics")?.count, biostatisticsCaseCount);
  });

  it("retrieves generated cases by stable generated id", () => {
    const firstNeurology = getGeneratedCasesForSubject("Neurology")[0];
    assert.equal(getGeneratedCaseById(firstNeurology.id)?.topic, firstNeurology.topic);
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
    assert.ok(primaryCases.every((item) => item.treeSeed && item.subject === "Internal Medicine"));
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
    const caseFromTree = generateCasesFromDecisionTreeSeed(getSubjectDecisionTreeSeeds("Emergency Medicine")[0])[0];

    assert.ok(caseFromTree.reasoningObject.conceptCard);
    assert.ok(caseFromTree.reasoningObject.pipelineTrace.some((entry) => entry.stage === "conceptCardBuilder"));
    assert.ok(caseFromTree.reasoningObject.confirmedAnswer);
  });
});
