import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getAdaptiveTargetConcept, getConceptSearchTerms, getLearningTrajectory } from "@/lib/learning-trajectory";

describe("adaptive learning trajectory", () => {
  it("builds natural concept chains from hypertensive disorders of pregnancy", () => {
    const trajectory = getLearningTrajectory({
      correctAnswer: "gestational hypertension",
      wasCorrect: false,
      comparisonConcept: "Preeclampsia",
      managementConcept: "Delivery timing"
    });

    assert.equal(trajectory.primaryConcept, "Gestational hypertension");
    assert.equal(trajectory.recommendation?.concept, "Preeclampsia without severe features");
    assert.match(trajectory.recommendation?.reason ?? "", /missed Gestational hypertension/);
    assert.ok(trajectory.items.some((item) => item.concept === "HELLP syndrome"));
    assert.ok(trajectory.items.some((item) => item.concept === "Delivery timing"));
  });

  it("recommends downstream concepts after correct answers", () => {
    const trajectory = getLearningTrajectory({
      correctAnswer: "Preeclampsia with severe features",
      wasCorrect: true
    });

    assert.equal(trajectory.recommendation?.concept, "Magnesium sulfate");
    assert.match(trajectory.recommendation?.reason ?? "", /Builds directly on Preeclampsia With Severe Features/i);
  });

  it("uses recent misses before downstream review when choosing the adaptive target", () => {
    const target = getAdaptiveTargetConcept([
      { diagnosis: "Placental abruption", answer: "placenta previa", isCorrect: false },
      { diagnosis: "Gestational hypertension", answer: "gestational hypertension", isCorrect: true }
    ]);

    assert.equal(target?.concept, "Placental abruption");
    assert.match(target?.reason ?? "", /missed Placental abruption/);
  });

  it("maps learning objectives to real searchable seed concepts", () => {
    assert.deepEqual(getConceptSearchTerms("Calcium gluconate"), ["Calcium gluconate", "Magnesium sulfate"]);
    assert.deepEqual(getConceptSearchTerms("Severe preeclampsia vs HELLP"), [
      "Severe preeclampsia vs HELLP",
      "Preeclampsia with severe features",
      "HELLP syndrome"
    ]);
  });

  it("renders a next challenge instead of passive related concepts", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /Next challenge/);
    assert.match(tutorMode, /Optional exploration/);
    assert.match(tutorMode, /learningTrajectory\.recommendation\.reason/);
    assert.match(tutorMode, /loadQuestion\(item\.concept\)/);
    assert.doesNotMatch(tutorMode, /Related Concepts/);
    assert.doesNotMatch(tutorMode, /ConceptChipGroup/);
  });

  it("lets the next-question API accept an adaptive concept override", () => {
    const route = readFileSync("app/api/questions/next/route.ts", "utf8");
    const hook = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(route, /searchParams\.get\("concept"\)/);
    assert.match(route, /getAdaptiveTargetConcept/);
    assert.match(route, /getNextClinicalDecision\(\[\.{3}answeredDecisionIds\], adaptiveTarget, requestedSubject\)/);
    assert.match(hook, /params\.set\("concept", targetConcept\)/);
    assert.match(hook, /params\.set\("learnerId", currentLearnerId\)/);
  });
});
