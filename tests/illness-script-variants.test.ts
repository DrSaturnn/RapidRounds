import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { ectopicPregnancyVariants } from "@/lib/ectopic-pregnancy-variants";
import {
  parseRapidRoundsCaseMetadata,
  rapidRoundsCaseToClinicalDecisionSeed
} from "@/lib/rapidrounds-case";
import { toPracticePromptDto } from "@/lib/clinical-decision-serializers";
import { buildTutorContent } from "@/lib/tutor-content";

describe("illness-script variant engine", () => {
  it("defines one complete ectopic pregnancy pilot script with ten variants", () => {
    assert.equal(ectopicPregnancyVariants.length, 10);
    assert.deepEqual(
      ectopicPregnancyVariants.map((variant) => variant.variantType),
      [
        "recognition",
        "diagnosis",
        "next_best_step",
        "stable_management",
        "unstable_management",
        "methotrexate_eligibility",
        "rhogam_indication",
        "differential_boundary",
        "lab_interpretation",
        "imaging_interpretation"
      ]
    );

    ectopicPregnancyVariants.forEach((variant) => {
      assert.equal(variant.scriptId, "ectopic_pregnancy");
      assert.equal(variant.canonicalProblem, "First-trimester bleeding and abdominal or pelvic pain");
      assert.ok(variant.vignette.length > 40);
      assert.ok(variant.answerPrompt.length > 10);
      assert.ok(variant.acceptedAnswers.length > 0);
      assert.ok(variant.pivotClues.length > 0);
      assert.ok(variant.supportingClues.length > 0);
      assert.ok(variant.correctReasoning.length > 20);
      assert.ok(variant.commonWrongReasoning.length > 0);
      assert.ok(variant.decisionBoundary.length > 0);
      assert.ok(variant.teachMeMore.length > 20);
    });
  });

  it("serializes variant cases into the existing ClinicalDecision-compatible shape", () => {
    const seed = rapidRoundsCaseToClinicalDecisionSeed(ectopicPregnancyVariants[4]);
    const metadata = parseRapidRoundsCaseMetadata(seed.tags);

    assert.equal(seed.id, "rr-ectopic-pregnancy-unstable-management");
    assert.equal(seed.topic, "Ectopic pregnancy");
    assert.equal(seed.decisionType, "Management");
    assert.match(seed.prompt, /immediate next step/i);
    assert.ok(seed.vignetteFindings.some((finding) => finding.role === "pivot_clue"));
    assert.equal(metadata?.scriptId, "ectopic_pregnancy");
    assert.equal(metadata?.variantType, "unstable_management");
  });

  it("adds subtle script and variant metadata to the practice prompt DTO", () => {
    const seed = rapidRoundsCaseToClinicalDecisionSeed(ectopicPregnancyVariants[6]);
    const question = toPracticePromptDto({
      id: seed.id,
      specialty: "OB/GYN",
      system: seed.system,
      topic: seed.topic,
      clinicalPattern: seed.clinicalPattern,
      decisionType: seed.decisionType,
      prompt: seed.prompt,
      managementPearl: seed.managementPearl,
      difficulty: seed.difficulty,
      tags: JSON.stringify(seed.tags)
    });

    assert.equal(question.scriptId, "ectopic_pregnancy");
    assert.equal(question.canonicalProblem, "First-trimester bleeding and abdominal or pelvic pain");
    assert.equal(question.variantType, "rhogam_indication");
  });

  it("keeps semantic answer matching working for ectopic variants", () => {
    const stableManagement = ectopicPregnancyVariants.find((variant) => variant.variantType === "stable_management");
    assert.ok(stableManagement);

    const evaluation = evaluateAnswer({
      answer: "single dose methotrexate",
      acceptedAnswers: stableManagement.acceptedAnswers,
      canonicalAnswer: stableManagement.acceptedAnswers[0],
      expectedTask: "Management",
      clinicalConcepts: [
        stableManagement.topic,
        stableManagement.canonicalProblem,
        ...stableManagement.pivotClues,
        ...stableManagement.decisionBoundary.map((boundary) => boundary.confusedWith)
      ]
    });

    assert.equal(evaluation.isCorrect, true);
    assert.ok(["EXACT", "EQUIVALENT", "SPELLING_VARIATION"].includes(evaluation.classification));
  });

  it("uses authored decision boundaries and clue annotations in tutor content", () => {
    const boundaryVariant = ectopicPregnancyVariants.find((variant) => variant.variantType === "differential_boundary");
    assert.ok(boundaryVariant);
    const seed = rapidRoundsCaseToClinicalDecisionSeed(boundaryVariant);
    const acceptedAnswers = seed.acceptedAnswers;
    const evaluation = evaluateAnswer({
      answer: "ectopic pregnancy",
      acceptedAnswers,
      canonicalAnswer: acceptedAnswers[0],
      expectedTask: seed.decisionType,
      clinicalConcepts: [
        seed.topic,
        seed.clinicalPattern,
        seed.commonTrap,
        ...seed.tags
      ]
    });
    const tutor = buildTutorContent(
      {
        specialty: "OB/GYN",
        system: seed.system,
        topic: seed.topic,
        clinicalPattern: seed.clinicalPattern,
        decisionType: seed.decisionType,
        prompt: seed.prompt,
        correctAnswer: acceptedAnswers[0],
        acceptedAnswers: JSON.stringify(acceptedAnswers),
        boardPearl: seed.boardPearl,
        pivotClue: seed.pivotClue,
        commonTrap: seed.commonTrap,
        managementPearl: seed.managementPearl,
        tags: JSON.stringify(seed.tags)
      },
      "ectopic pregnancy",
      evaluation
    );

    assert.match(tutor.repair.why, /Your answer becomes correct when ectopic pregnancy/i);
    assert.match(tutor.repair.why, /viable intrauterine pregnancy/i);
    assert.ok(tutor.vignetteFindings?.some((finding) => finding.role === "pivot_clue"));
    assert.match(tutor.illnessScript.classicPresentation, /ectopic boundary closes/i);
    assert.equal(tutor.comparison.competingDiagnosis, "ectopic pregnancy");
  });

  it("keeps legacy cases compatible when variant metadata is absent", () => {
    const tutor = buildTutorContent(
      {
        specialty: "Obstetrics",
        system: "Early Pregnancy",
        topic: "Threatened abortion",
        clinicalPattern: "First-trimester bleeding",
        decisionType: "Diagnosis",
        prompt: "Bleeding with closed cervix and fetal cardiac activity.",
        correctAnswer: "threatened abortion",
        acceptedAnswers: JSON.stringify(["threatened abortion"]),
        boardPearl: "Closed cervix with fetal cardiac activity is threatened abortion.",
        pivotClue: "Closed cervix with fetal cardiac activity",
        commonTrap: "ectopic pregnancy",
        managementPearl: "Reassure and follow.",
        tags: JSON.stringify(["first trimester bleeding", "closed cervix"])
      },
      "ectopic pregnancy"
    );

    assert.equal(tutor.vignetteFindings, undefined);
    assert.match(tutor.illnessScript.classicPresentation, /first-trimester bleeding/i);
    assert.match(tutor.illnessScript.classicPresentation, /closed cervix with fetal cardiac activity/i);
  });

  it("does not change the Prisma schema for the variant pilot", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    assert.doesNotMatch(schema, /scriptId/);
    assert.doesNotMatch(schema, /variantType/);
    assert.doesNotMatch(schema, /RapidRoundsCase/);
  });
});
