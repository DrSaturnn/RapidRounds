import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRapidRoundsReasoningObject,
  sourceTypeDetector
} from "@/lib/local-reasoning-engine";

describe("local NBME-first reasoning engine", () => {
  it("detects NBME-style diagnosis archetype without relying on UWorld formatting", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: [
        "A 32-year-old G2P1 woman at 32 weeks' gestation presents with bright red vaginal bleeding.",
        "She denies abdominal pain or contractions. Vital signs are stable.",
        "What is the most likely diagnosis?",
        "A. Placental abruption",
        "B. Placenta previa",
        "C. Vasa previa",
        "D. Uterine rupture"
      ].join("\n")
    });

    assert.equal(result.sourceType, "nbme_style_question");
    assert.equal(result.nbmeArchetype, "Diagnosis");
    assert.equal(result.clinicalSchema?.name, "Placenta previa");
    assert.ok(result.candidatePivots.some((pivot) => /painless|digital|placental/i.test(pivot.text)));
    assert.ok(result.discriminators.some((item) => item.competingConcept === "Placental abruption"));
    assert.equal(result.needsExpertReview, false);
  });

  it("uses highlighted UWorld explanation as higher-authority confirmation without storing full proprietary prose", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: [
        "A patient has pelvic pain, fever, cervical motion tenderness, and mucopurulent discharge.",
        "What is the most likely diagnosis?",
        "A. Cervicitis",
        "B. Pelvic inflammatory disease",
        "C. Appendicitis"
      ].join("\n"),
      highlightedText: [
        "Educational objective: Recognize pelvic inflammatory disease when pelvic pain and cervical motion tenderness indicate upper genital tract infection.",
        "Correct answer: Pelvic inflammatory disease.",
        "Explanation: Cervical motion tenderness with fever supports PID.",
        "Incorrect answer A: Cervicitis lacks upper genital tract tenderness and systemic pelvic pain."
      ].join("\n")
    });

    assert.equal(result.sourceType, "mixed_question_and_explanation");
    assert.ok(result.authorityTrace.indexOf("educational_objective") < result.authorityTrace.indexOf("clinical_stem"));
    assert.equal(result.confirmedAnswer, "Pelvic inflammatory disease");
    assert.equal(result.conceptCard.sourceConfidence, "confirmed");
    assert.ok(result.discriminators.some((item) => item.competingConcept.toLowerCase().includes("cervicitis")));
    assert.doesNotMatch(JSON.stringify(result), /Educational objective: Recognize pelvic inflammatory disease when pelvic pain and cervical motion tenderness indicate upper genital tract infection\./);
  });

  it("routes non-diagnosis NBME archetypes before building the concept card", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: [
        "A patient with postpartum hemorrhage has severe hypertension.",
        "Which medication is contraindicated?",
        "A. Carboprost",
        "B. Methylergonovine",
        "C. Oxytocin"
      ].join("\n")
    });

    assert.equal(result.nbmeArchetype, "Drug adverse effect");
    assert.equal(result.questionType, "Drug adverse effect");
    assert.ok(result.answerChoices.length === 3);
    assert.equal(result.conceptCard.archetype, "Drug adverse effect");
  });

  it("parses answer choices and keeps the renderer-facing object source agnostic", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: [
        "A patient has thin gray discharge, fishy odor, and clue cells.",
        "What is the most likely diagnosis?",
        "A. Trichomoniasis",
        "B. Bacterial vaginosis",
        "C. Vulvovaginal candidiasis"
      ].join("\n")
    });

    assert.deepEqual(result.answerChoices.map((choice) => choice.label), ["A", "B", "C"]);
    assert.equal(result.conceptCard.clinicalSchema, "Bacterial vaginosis");
    assert.ok(Array.isArray(result.conceptCard.answerChoiceComparison));
    assert.ok(result.pipelineTrace.map((entry) => entry.stage).includes("conceptMerger"));
  });

  it("marks low-confidence captures for expert review without hallucinating a confirmed answer", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: "A person feels unwell after lunch. What is the next best step?"
    });

    assert.equal(sourceTypeDetector({ rawText: result.conceptCard.testedConcept }), "unknown");
    assert.equal(result.nbmeArchetype, "Next best step");
    assert.equal(result.confirmedAnswer, undefined);
    assert.equal(result.needsExpertReview, true);
    assert.ok(result.candidatePivots.length >= 0);
  });
});
