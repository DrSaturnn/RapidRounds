import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildClinicalComparison } from "@/lib/clinical-comparison";

const baseDecision = {
  specialty: "Obstetrics",
  correctAnswer: "placeholder",
  acceptedAnswers: JSON.stringify(["placeholder"]),
  boardPearl: "Use the defining board clue.",
  tags: JSON.stringify([]),
  decisionType: "Diagnosis"
};

function comparisonText(topic: string) {
  return JSON.stringify(
    buildClinicalComparison({
      ...baseDecision,
      topic,
      correctAnswer: topic,
      commonTrap: "nearby diagnosis"
    })
  );
}

describe("clinical comparison engine", () => {
  it("compares placental abruption against placenta previa with NBME discriminators", () => {
    const comparison = buildClinicalComparison({
      ...baseDecision,
      topic: "Placental abruption",
      correctAnswer: "placental abruption",
      boardPearl: "Painful bleeding with uterine tenderness suggests placental abruption.",
      pivotClue: "Tender rigid uterus with painful bleeding",
      commonTrap: "placenta previa",
      clinicalPattern: "Third-trimester bleeding with pain"
    });
    const text = JSON.stringify(comparison);

    assert.equal(comparison.correctDiagnosis, "Placental abruption");
    assert.equal(comparison.competingDiagnosis, "Placenta previa");
    assert.match(text, /Painful third-trimester bleeding/);
    assert.match(text, /Painless bright red third-trimester bleeding/);
    assert.match(text, /Tender, rigid uterus/);
    assert.match(text, /Soft, nontender uterus/);
  });

  it("compares Category I tracing against Category II tracing by fetal-monitoring criteria", () => {
    const text = comparisonText("Category I fetal tracing");

    assert.match(text, /Baseline 110-160 with moderate variability/);
    assert.match(text, /Indeterminate tracing/);
    assert.match(text, /Moderate variability is reassuring/);
    assert.match(text, /Any recurrent deceleration pattern moves the tracing out of Category I/);
  });

  it("compares vulvovaginal candidiasis against bacterial vaginosis with microscopy clues", () => {
    const text = comparisonText("Vulvovaginal candidiasis");

    assert.match(text, /Vulvar pruritus with thick white discharge/);
    assert.match(text, /Thin gray discharge with fishy odor/);
    assert.match(text, /Pseudohyphae or budding yeast/);
    assert.match(text, /Clue cells and positive whiff test/);
  });

  it("keeps placeholder implementation phrases out of comparison output and source", () => {
    const generated = [
      comparisonText("Gestational hypertension"),
      comparisonText("Placental abruption"),
      comparisonText("Category I fetal tracing"),
      comparisonText("Vulvovaginal candidiasis"),
      comparisonText("Bacterial vaginosis")
    ].join("\n");
    const source = [
      readFileSync("lib/clinical-comparison.ts", "utf8"),
      readFileSync("lib/tutor-content.ts", "utf8")
    ].join("\n");
    const forbidden = [
      /Requires findings that establish/,
      /Different next best step/,
      /Look for findings specific to/,
      /Surface-level overlap/
    ];

    for (const phrase of forbidden) {
      assert.doesNotMatch(generated, phrase);
      assert.doesNotMatch(source, phrase);
    }
  });
});
