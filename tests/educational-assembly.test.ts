import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { buildTutorContent } from "@/lib/tutor-content";

const baseDecision = {
  specialty: "Obstetrics",
  system: "Postpartum",
  topic: "Retained placenta",
  prompt: "Postpartum hemorrhage with placenta not delivered after 30 minutes.",
  correctAnswer: "retained placenta",
  acceptedAnswers: JSON.stringify(["retained placenta"]),
  boardPearl: "Failure to deliver the placenta within 30 minutes suggests retained placenta.",
  tags: JSON.stringify(["postpartum hemorrhage", "retained placenta", "30 minutes"]),
  pivotClue: "Placenta undelivered after 30 minutes",
  commonTrap: "uterine atony",
  clinicalPattern: "Postpartum hemorrhage",
  decisionType: "Diagnosis",
  managementPearl: "Manual extraction is indicated when placenta is retained."
};

describe("dynamic educational assembly", () => {
  it("uses retrieval repair without irrelevant comparison or tempting modules", () => {
    const decision = {
      ...baseDecision,
      topic: "Carboprost mechanism",
      correctAnswer: "prostaglandin f2 alpha",
      acceptedAnswers: JSON.stringify(["prostaglandin f2 alpha"]),
      pivotClue: "Carboprost",
      commonTrap: "methylergonovine",
      decisionType: "Board Pearl",
      managementPearl: "Carboprost is a prostaglandin F2-alpha analog."
    };
    const evaluation = evaluateAnswer({
      answer: "ergot alkaloid",
      acceptedAnswers: ["prostaglandin f2 alpha"],
      canonicalAnswer: "prostaglandin f2 alpha",
      expectedTask: "Board Pearl"
    });
    const tutor = buildTutorContent(decision, "ergot alkaloid", evaluation);

    assert.equal(tutor.teachingPlan.repairType, "RETRIEVAL_REPAIR");
    assert.equal(tutor.teachingPlan.modules.retrieval, true);
    assert.equal(tutor.teachingPlan.modules.comparison, false);
    assert.equal(tutor.teachingPlan.modules.whyTempting, false);
    assert.match(tutor.teachingPlan.retrieval?.memoryHook ?? "", /Carboprost -> prostaglandin f2 alpha/);
  });

  it("uses decision-boundary repair with specific comparison when available", () => {
    const decision = {
      ...baseDecision,
      topic: "Severe hypertension treatment",
      correctAnswer: "iv labetalol",
      acceptedAnswers: JSON.stringify(["iv labetalol", "labetalol", "hydralazine", "nifedipine"]),
      pivotClue: "Persistent severe-range blood pressure",
      decisionType: "Management",
      managementPearl: "Use IV labetalol, IV hydralazine, or oral nifedipine."
    };
    const evaluation = evaluateAnswer({
      answer: "magnesium sulfate",
      acceptedAnswers: ["iv labetalol", "labetalol", "hydralazine", "nifedipine"],
      canonicalAnswer: "iv labetalol",
      expectedTask: "Management"
    });
    const tutor = buildTutorContent(decision, "magnesium sulfate", evaluation);

    assert.equal(tutor.teachingPlan.repairType, "DECISION_BOUNDARY_REPAIR");
    assert.equal(tutor.teachingPlan.modules.comparison, true);
    assert.equal(tutor.teachingPlan.modules.whyTempting, true);
    assert.match(JSON.stringify(tutor.comparison), /Magnesium sulfate prevents or treats seizures/);
  });

  it("uses unknown scaffold without comparison or tempting modules", () => {
    const evaluation = evaluateAnswer({
      answer: "idk",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(baseDecision, "idk", evaluation);

    assert.equal(tutor.teachingPlan.repairType, "UNKNOWN_SCAFFOLD");
    assert.equal(tutor.teachingPlan.modules.illnessScript, true);
    assert.equal(tutor.teachingPlan.modules.expertRecognition, true);
    assert.equal(tutor.teachingPlan.modules.comparison, false);
    assert.equal(tutor.teachingPlan.modules.whyTempting, false);
  });

  it("uses contraindication repair with contraindication-specific modules", () => {
    const decision = {
      ...baseDecision,
      topic: "Carboprost contraindication",
      correctAnswer: "carboprost",
      acceptedAnswers: JSON.stringify(["carboprost", "hemabate"]),
      pivotClue: "Asthma",
      commonTrap: "methylergonovine",
      decisionType: "Contraindication",
      managementPearl: "Avoid carboprost because it can cause bronchospasm."
    };
    const evaluation = evaluateAnswer({
      answer: "methylergonovine",
      acceptedAnswers: ["carboprost", "hemabate"],
      canonicalAnswer: "carboprost",
      expectedTask: "Contraindication"
    });
    const tutor = buildTutorContent(decision, "methylergonovine", evaluation);

    assert.equal(tutor.teachingPlan.repairType, "CONTRAINDICATION_REPAIR");
    assert.equal(tutor.teachingPlan.modules.contraindication, true);
    assert.equal(tutor.teachingPlan.modules.comparison, false);
    assert.match(tutor.teachingPlan.contraindication?.rule ?? "", /Asthma is the contraindication clue/);
  });

  it("keeps a generic fallback when no specific repair type applies", () => {
    const evaluation = evaluateAnswer({
      answer: "random answer",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(baseDecision, "random answer", evaluation);

    assert.equal(tutor.teachingPlan.repairType, "GENERIC_REPAIR");
    assert.equal(tutor.teachingPlan.modules.illnessScript, true);
    assert.equal(tutor.teachingPlan.modules.nbmePivot, true);
  });

  it("renders Teach Me More sections from the teaching plan", () => {
    const source = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(source, /modules\.retrieval/);
    assert.match(source, /Retrieval target/);
    assert.match(source, /modules\.contraindication/);
    assert.match(source, /Contraindication rule/);
    assert.match(source, /modules\.comparison/);
    assert.match(source, /modules\.whyTempting/);
  });
});
