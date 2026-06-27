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

  it("accepts conservative spelling variations without guessing broadly", () => {
    const evaluation = evaluateAnswer({
      answer: "methotrxate",
      acceptedAnswers: ["methotrexate", "medical management with methotrexate"],
      expectedTask: "Management"
    });

    assert.equal(evaluation.isCorrect, true);
    assert.equal(evaluation.classification, "SPELLING_VARIATION");
    assert.equal(evaluation.spellingCorrected, true);
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
    assert.equal(evaluation.partialCredit, 0.5);
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
      assert.equal(evaluation.requiresTeaching, true);
      assert.equal(evaluation.partialCredit, 0);
    });
  });

  it("preserves the legacy boolean compareAnswer API", () => {
    assert.equal(compareAnswer("Rhogam", ["rh immune globulin", "rho(d) immune globulin", "rhogam"]), true);
    assert.equal(compareAnswer("placental abruption", ["placenta previa"]), false);
  });
});
