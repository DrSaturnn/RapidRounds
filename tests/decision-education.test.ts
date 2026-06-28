import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { buildDecisionMeaning, getDecisionEducationCategory } from "@/lib/decision-education";
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

describe("decision-type aware educational assembly", () => {
  it("uses diagnostic language for diagnosis decisions", () => {
    const evaluation = evaluateAnswer({
      answer: "uterine atony",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(baseDecision, "uterine atony", evaluation);

    assert.equal(getDecisionEducationCategory("Diagnosis"), "diagnosis");
    assert.match(tutor.repair.why, /Placenta undelivered after 30 minutes points toward retained placenta/i);
    assert.match(tutor.repair.clueMeaning ?? "", /points toward retained placenta/i);
    assert.equal(tutor.repair.answerLabel, "Correct diagnosis");
  });

  it("uses immediate-action language for management decisions", () => {
    const decision = {
      ...baseDecision,
      topic: "Severe hypertension treatment",
      correctAnswer: "iv labetalol",
      acceptedAnswers: JSON.stringify(["iv labetalol", "labetalol"]),
      pivotClue: "Persistent severe-range blood pressure",
      decisionType: "Management",
      managementPearl: "Treat acute severe hypertension promptly."
    };
    const evaluation = evaluateAnswer({
      answer: "delivery",
      acceptedAnswers: ["iv labetalol", "labetalol"],
      canonicalAnswer: "iv labetalol",
      expectedTask: "Management"
    });
    const tutor = buildTutorContent(decision, "delivery", evaluation);

    assert.equal(getDecisionEducationCategory("Management"), "management");
    assert.match(tutor.repair.why, /points to iv labetalol as the immediate action/i);
    assert.match(tutor.nbmePivot ?? "", /changes the next step to iv labetalol/i);
  });

  it("uses avoid language for contraindication decisions", () => {
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

    assert.equal(getDecisionEducationCategory("Contraindication"), "contraindication");
    assert.match(tutor.repair.why, /Asthma contraindicates carboprost; avoid it/i);
    assert.doesNotMatch(tutor.repair.why, /Asthma supports carboprost/i);
    assert.equal(tutor.repair.answerLabel, "Avoid");
  });

  it("uses retrieval language for fact-recall decisions", () => {
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

    assert.equal(getDecisionEducationCategory("Board Pearl"), "retrieval");
    assert.match(tutor.repair.why, /Carboprost is the retrieval cue for prostaglandin f2 alpha/i);
    assert.equal(tutor.repair.answerLabel, "Correct retrieval");
  });

  it("keeps decision-boundary repair while making the base management language decision-aware", () => {
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

    assert.match(tutor.repair.why, /points to iv labetalol as the immediate action/i);
    assert.match(tutor.repair.why, /Your answer becomes correct when magnesium sulfate/i);
  });

  it("omits misleading generic support language when the decision type is contraindication", () => {
    assert.equal(
      buildDecisionMeaning({
        decisionType: "Contraindication",
        correctAnswer: "carboprost",
        pivotClue: "Asthma"
      }),
      "Asthma contraindicates carboprost; avoid it in this decision."
    );
  });
});
