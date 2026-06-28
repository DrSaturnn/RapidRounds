import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareAnswer, evaluateAnswer, normalizeAnswer } from "@/lib/answer-check";

describe("answer intelligence", () => {
  it("normalizes punctuation, capitalization, hyphens, and plural forms", () => {
    assert.equal(normalizeAnswer("  Trans-vaginal   Ultrasounds!! "), "trans vaginal ultrasound");
  });

  it("accepts configured aliases as equivalent concepts", () => {
    const evaluation = evaluateAnswer({
      answer: "Trans-vaginal US",
      acceptedAnswers: ["transvaginal ultrasound", "tvu", "trans vaginal us", "trans-vaginal us"],
      canonicalAnswer: "transvaginal ultrasound",
      expectedTask: "Initial Test"
    });

    assert.equal(evaluation.isCorrect, true);
    assert.equal(evaluation.classification, "EQUIVALENT");
    assert.equal(evaluation.canonicalAnswer, "transvaginal ultrasound");
    assert.ok(["trans vaginal us", "trans-vaginal us"].includes(evaluation.matchedAlias ?? ""));
  });

  it("maps older GSM terminology to the preferred term", () => {
    ["vulvar atrophy", "vaginal atrophy", "atrophic vaginitis"].forEach((answer) => {
      const evaluation = evaluateAnswer({
        answer,
        acceptedAnswers: ["genitourinary syndrome of menopause", "vaginal atrophy", "atrophic vaginitis"],
        canonicalAnswer: "genitourinary syndrome of menopause",
        expectedTask: "Diagnosis"
      });

      assert.equal(evaluation.isCorrect, true);
      assert.equal(evaluation.classification, "EQUIVALENT");
      assert.equal(evaluation.learnerFacingClassification?.category, "Preferred terminology");
      assert.match(evaluation.learnerFacingClassification?.message ?? "", /preferred term is genitourinary syndrome of menopause/i);
    });
  });

  it("accepts conservative spelling variations without guessing broadly", () => {
    const evaluation = evaluateAnswer({
      answer: "Methylergonovin",
      acceptedAnswers: ["methylergonovine"],
      expectedTask: "Management"
    });

    assert.equal(evaluation.isCorrect, true);
    assert.equal(evaluation.classification, "SPELLING_VARIATION");
    assert.equal(evaluation.learnerFacingClassification?.category, "Misspelled but acceptable");
    assert.equal(evaluation.spellingCorrected, true);
  });

  it("recognizes broad but incomplete answers", () => {
    const evaluation = evaluateAnswer({
      answer: "IUD",
      acceptedAnswers: ["IUD placement"],
      canonicalAnswer: "IUD placement",
      expectedTask: "Management"
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "PARTIAL");
    assert.equal(evaluation.learnerFacingClassification?.category, "Broad but incomplete");
    assert.match(evaluation.reason, /complete action/i);
  });

  it("recognizes treatment family answers that need a specific regimen", () => {
    const evaluation = evaluateAnswer({
      answer: "Antibiotics",
      acceptedAnswers: ["clindamycin and gentamicin"],
      canonicalAnswer: "clindamycin and gentamicin",
      expectedTask: "Management"
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "PARTIAL");
    assert.equal(evaluation.partialCredit, 0.45);
    assert.equal(evaluation.learnerFacingClassification?.category, "Correct category / insufficient specificity");
    assert.match(evaluation.reason, /specific treatment/i);
  });

  it("recognizes a diagnosis when the task asks for management", () => {
    const evaluation = evaluateAnswer({
      answer: "Cord prolapse",
      acceptedAnswers: ["emergency cesarean delivery", "emergent cesarean", "cesarean delivery"],
      canonicalAnswer: "emergency cesarean delivery",
      expectedTask: "Management",
      clinicalConcepts: ["Cord prolapse", "fetal bradycardia", "rupture of membranes"]
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "TASK_MISMATCH");
    assert.equal(evaluation.recognizedConcept, "Cord prolapse");
    assert.equal(evaluation.requiresTeaching, true);
  });

  it("returns partial credit for incomplete answers", () => {
    const evaluation = evaluateAnswer({
      answer: "digital cervical",
      acceptedAnswers: ["digital cervical examination"],
      canonicalAnswer: "digital cervical examination",
      expectedTask: "Contraindication"
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "PARTIAL");
    assert.equal(evaluation.learnerFacingClassification?.category, "Broad but incomplete");
    assert.equal(evaluation.partialCredit, 0.5);
  });

  it("identifies answers that need more specificity", () => {
    const evaluation = evaluateAnswer({
      answer: "cervical examination speculum",
      acceptedAnswers: ["digital cervical examination"],
      canonicalAnswer: "digital cervical examination",
      expectedTask: "Contraindication"
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "PARTIAL");
    assert.equal(evaluation.learnerFacingClassification?.category, "Needs more specificity");
  });

  it("classifies neighboring diagnoses as related but incorrect", () => {
    const evaluation = evaluateAnswer({
      answer: "placental abruption",
      acceptedAnswers: ["placenta previa"],
      canonicalAnswer: "placenta previa",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["placental abruption", "painless vaginal bleeding", "third trimester bleeding"]
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "PARTIAL");
    assert.equal(evaluation.partialCredit, 0.35);
    assert.equal(evaluation.learnerFacingClassification?.category, "Related but incorrect");
  });

  it("keeps truly wrong unrelated answers incorrect", () => {
    const evaluation = evaluateAnswer({
      answer: "appendicitis",
      acceptedAnswers: ["placenta previa"],
      canonicalAnswer: "placenta previa",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["placental abruption", "painless vaginal bleeding", "third trimester bleeding"]
    });

    assert.equal(evaluation.isCorrect, false);
    assert.equal(evaluation.classification, "INCORRECT");
    assert.equal(evaluation.learnerFacingClassification?.category, "Incorrect");
  });

  it("classifies unknown responses before clinical matching", () => {
    ["", "   ", "idk", "don't know", "i dont know", "unsure", "?", "pass"].forEach((answer) => {
      const evaluation = evaluateAnswer({
        answer,
        acceptedAnswers: ["iv labetalol"],
        canonicalAnswer: "iv labetalol",
        expectedTask: "Management"
      });

      assert.equal(evaluation.isCorrect, false);
      assert.equal(evaluation.classification, "UNKNOWN");
      assert.equal(evaluation.learnerFacingClassification?.category, "Unknown");
      assert.equal(evaluation.requiresTeaching, true);
      assert.equal(evaluation.partialCredit, 0);
    });
  });

  it("preserves the legacy boolean compareAnswer API", () => {
    assert.equal(compareAnswer("Rhogam", ["rh immune globulin", "rho(d) immune globulin", "rhogam"]), true);
    assert.equal(compareAnswer("placental abruption", ["placenta previa"]), false);
  });
});
