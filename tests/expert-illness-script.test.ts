import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildExpertIllnessScript } from "@/lib/expert-illness-script";

const baseDecision = {
  specialty: "Obstetrics",
  topic: "Preeclampsia without severe features",
  correctAnswer: "preeclampsia without severe features",
  acceptedAnswers: JSON.stringify(["preeclampsia without severe features", "preeclampsia"]),
  boardPearl: "Hypertension after 20 weeks plus proteinuria is preeclampsia.",
  tags: JSON.stringify(["preeclampsia", "proteinuria", "hypertension"]),
  pivotClue: "Proteinuria after 20 weeks",
  commonTrap: "gestational hypertension",
  clinicalPattern: "Hypertension in pregnancy",
  decisionType: "Diagnosis",
  managementPearl: "Deliver at 37 weeks if no severe features."
};

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

describe("expert illness script generator", () => {
  it("builds a concise expert mental model for preeclampsia without severe features", () => {
    const script = buildExpertIllnessScript(baseDecision);

    assert.match(script, /Pregnant patient after 20 weeks/);
    assert.match(script, /new-onset hypertension and proteinuria/);
    assert.match(script, /no severe features/);
    assert.match(script, /progress/);
    assert.match(script, /deliver at 37 weeks/i);
    assert.ok(wordCount(script) >= 40);
    assert.ok(wordCount(script) <= 70);
  });

  it("does not emit dictionary-style illness script openings", () => {
    const scripts = [
      buildExpertIllnessScript(baseDecision),
      buildExpertIllnessScript({
        ...baseDecision,
        topic: "Gestational hypertension",
        correctAnswer: "gestational hypertension",
        boardPearl: "Hypertension after 20 weeks without proteinuria or severe features is gestational hypertension.",
        pivotClue: "No proteinuria or end-organ symptoms",
        managementPearl: "Monitor closely because gestational hypertension can progress to preeclampsia."
      }),
      buildExpertIllnessScript({
        ...baseDecision,
        specialty: "Surgery",
        topic: "Acute mesenteric ischemia",
        correctAnswer: "acute mesenteric ischemia",
        clinicalPattern: "Severe abdominal pain",
        pivotClue: "Pain out of proportion",
        boardPearl: "Pain out of proportion suggests acute mesenteric ischemia.",
        managementPearl: "Get CT angiography and urgent surgical consultation."
      })
    ];

    for (const script of scripts) {
      assert.doesNotMatch(script, /^\w.* is recognized by/i);
      assert.doesNotMatch(script, /^\w.* is characterized by/i);
      assert.doesNotMatch(script, /^\w.* occurs when/i);
      assert.doesNotMatch(script, /is the best fit for the defining findings/i);
    }
  });

  it("keeps old definition phrases out of Teach Me More source", () => {
    const source = readFileSync("lib/tutor-content.ts", "utf8");

    assert.doesNotMatch(source, /is recognized by/);
    assert.doesNotMatch(source, /is characterized by/);
    assert.doesNotMatch(source, /occurs when/);
    assert.doesNotMatch(source, /best fit for the defining findings/);
  });
});
