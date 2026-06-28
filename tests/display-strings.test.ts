import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dedupeDisplayStrings } from "@/lib/display-strings";
import { buildTutorContent } from "@/lib/tutor-content";

const baseDecision = {
  specialty: "Obstetrics",
  system: "Postpartum",
  topic: "Postpartum hemorrhage",
  prompt: "Postpartum hemorrhage with heavy bleeding.",
  correctAnswer: "uterine atony",
  acceptedAnswers: JSON.stringify(["uterine atony"]),
  boardPearl: "Boggy uterus suggests uterine atony.",
  tags: JSON.stringify(["Postpartum hemorrhage", "postpartum hemorrhage", "  postpartum   hemorrhage  "]),
  pivotClue: "Boggy uterus",
  commonTrap: "retained placenta",
  clinicalPattern: "Postpartum hemorrhage",
  decisionType: "Diagnosis",
  managementPearl: "Uterine massage and oxytocin treat uterine atony."
};

describe("display string deduplication", () => {
  it("deduplicates display strings case-insensitively after trimming and collapsing spaces", () => {
    assert.deepEqual(
      dedupeDisplayStrings(["Postpartum hemorrhage", "postpartum hemorrhage", "  postpartum   hemorrhage  ", "", "Boggy uterus"]),
      ["Postpartum hemorrhage", "Boggy uterus"]
    );
  });

  it("deduplicates recognition cues after all cue sources are merged", () => {
    const tutor = buildTutorContent(baseDecision, "idk", {
      isCorrect: false,
      classification: "UNKNOWN",
      canonicalAnswer: "uterine atony",
      confidence: 1,
      spellingCorrected: false,
      requiresTeaching: true,
      partialCredit: 0,
      reason: "Unknown response."
    });

    assert.deepEqual(tutor.repair.recognitionClues, ["Boggy uterus", "Postpartum hemorrhage"]);
  });
});
