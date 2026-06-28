import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { getConceptGraph } from "@/lib/concept-graph";

describe("concept graph", () => {
  it("provides a primary concept for every decision, including fallback concepts", () => {
    const graph = getConceptGraph({
      correctAnswer: "rare diagnosis",
      comparisonConcept: "nearby diagnosis",
      managementConcept: "next step"
    });

    assert.equal(graph.primaryConcept, "Rare Diagnosis");
    assert.equal(graph.parentConcept, "Clinical reasoning");
    assert.deepEqual(graph.relatedConcepts, ["nearby diagnosis"]);
    assert.deepEqual(graph.managementConcepts, ["next step"]);
  });

  it("fails gracefully when related concepts are missing", () => {
    const graph = getConceptGraph({ correctAnswer: "unmapped concept" });

    assert.equal(graph.primaryConcept, "Unmapped Concept");
    assert.deepEqual(graph.relatedConcepts, []);
    assert.deepEqual(graph.managementConcepts, []);
  });

  it("links gestational hypertension to its hypertensive disorder network", () => {
    const graph = getConceptGraph({ correctAnswer: "gestational hypertension" });

    assert.equal(graph.primaryConcept, "Gestational hypertension");
    assert.equal(graph.parentConcept, "Hypertensive disorders of pregnancy");
    assert.ok(graph.relatedConcepts.includes("Preeclampsia"));
    assert.ok(graph.relatedConcepts.includes("HELLP syndrome"));
    assert.ok(graph.managementConcepts.includes("Delivery timing"));
    assert.ok(graph.managementConcepts.includes("Magnesium prophylaxis"));
  });

  it("links ectopic pregnancy to first-trimester bleeding and management concepts", () => {
    const graph = getConceptGraph({ correctAnswer: "ectopic pregnancy" });

    assert.equal(graph.parentConcept, "First-trimester bleeding");
    assert.ok(graph.relatedConcepts.includes("Molar pregnancy"));
    assert.ok(graph.managementConcepts.includes("Methotrexate criteria"));
    assert.ok(graph.managementConcepts.includes("Rh immune globulin"));
  });

  it("links placental abruption to antepartum bleeding concepts", () => {
    const graph = getConceptGraph({ correctAnswer: "placental abruption" });

    assert.equal(graph.parentConcept, "Antepartum bleeding");
    assert.ok(graph.relatedConcepts.includes("Placenta previa"));
    assert.ok(graph.relatedConcepts.includes("Vasa previa"));
    assert.ok(graph.managementConcepts.includes("Maternal stabilization"));
  });

  it("feeds the learning trajectory after Teach Me More", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /Next challenge/);
    assert.match(tutorMode, /You just learned/);
    assert.match(tutorMode, /Optional exploration/);
    assert.match(tutorMode, /LearningChoiceGroup/);
  });

  it("does not change answer grading", () => {
    const evaluation = evaluateAnswer({
      answer: "preeclampsia",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis"
    });

    getConceptGraph({ correctAnswer: "gestational hypertension" });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "INCORRECT");
  });
});
