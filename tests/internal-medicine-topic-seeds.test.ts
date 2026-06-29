import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getInternalMedicineTopicSeed,
  internalMedicineSeedsAsClinicalSchemas,
  internalMedicineTopicSeeds,
  type RapidRoundsConceptSeed
} from "@/lib/internal-medicine-topic-seeds";
import { buildRapidRoundsReasoningObject } from "@/lib/local-reasoning-engine";

const requiredTopics = [
  "HFrEF",
  "ACS",
  "COPD exacerbation",
  "Asthma exacerbation",
  "Pneumonia",
  "Pulmonary embolism",
  "DKA/HHS",
  "Thyroid storm",
  "Adrenal insufficiency",
  "Cirrhosis complications",
  "AKI",
  "CKD",
  "Nephritic/nephrotic syndrome",
  "Anemia workup",
  "GI bleed",
  "Sepsis",
  "Infective endocarditis"
];

function assertSeedContract(seed: RapidRoundsConceptSeed) {
  assert.equal(seed.domain, "Internal Medicine");
  assert.ok(seed.topic.length > 0);
  assert.ok(seed.schema.length > 0);
  assert.ok(seed.questionArchetypes.length > 0);
  assert.ok(seed.pivotClues.length > 0);
  assert.ok(seed.supportingClues.length > 0);
  assert.ok(seed.contextualClues.length > 0);
  assert.ok(seed.commonTraps.length > 0);
  assert.ok(seed.primaryDiscriminators.length > 0);
  assert.ok(seed.secondaryDiscriminators.length > 0);
  assert.ok(seed.managementRules.length > 0);
  assert.ok(seed.nextTimeRule.length > 0);
  assert.ok(seed.relatedConcepts.length > 0);
  assert.ok(seed.guidelineReferences.length > 0);
}

describe("Internal Medicine topic seed system", () => {
  it("defines the required reusable concept schema for every initial IM topic", () => {
    assert.deepEqual(
      internalMedicineTopicSeeds.map((seed) => seed.topic).sort(),
      requiredTopics.sort()
    );

    for (const seed of internalMedicineTopicSeeds) {
      assertSeedContract(seed);
    }
  });

  it("uses public guideline-derived references without proprietary question-bank wording", () => {
    const serialized = JSON.stringify(internalMedicineTopicSeeds);

    assert.doesNotMatch(serialized, /uworld|amboss|nbme form|question bank|copyright/i);
    assert.match(serialized, /ACC\/AHA|IDSA|KDIGO|Surviving Sepsis|GOLD|GINA/);
    assert.ok(internalMedicineTopicSeeds.every((seed) => seed.guidelineReferences.every((reference) => !/[.?!]\s/.test(reference))));
  });

  it("converts concept seeds into clinical schema hints for the local reasoning engine", () => {
    const schemas = internalMedicineSeedsAsClinicalSchemas();
    const pulmonaryEmbolism = schemas.find((schema) => schema.name === "Pulmonary embolism");

    assert.equal(schemas.length, requiredTopics.length);
    assert.ok(pulmonaryEmbolism);
    assert.ok(pulmonaryEmbolism.clueTerms.some((clue) => /sudden dyspnea/i.test(clue)));
    assert.ok(pulmonaryEmbolism.expectedPivots.some((pivot) => /tachycardia|pleuritic/i.test(pivot)));
  });

  it("feeds RapidRoundsReasoningObject generation without UWorld explanation formatting", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: [
        "A patient has sudden dyspnea, pleuritic chest pain, tachycardia, and unilateral leg swelling after recent surgery.",
        "What is the most likely diagnosis?",
        "A. Pneumonia",
        "B. Pulmonary embolism",
        "C. Asthma exacerbation",
        "D. ACS"
      ].join("\n")
    });

    assert.equal(result.sourceType, "nbme_style_question");
    assert.equal(result.nbmeArchetype, "Diagnosis");
    assert.equal(result.clinicalSchema?.name.toLowerCase(), "pulmonary embolism");
    assert.ok(result.candidatePivots.some((pivot) => /sudden dyspnea|pleuritic|tachycardia|leg swelling/i.test(pivot.text)));
    assert.equal(result.conceptCard.archetype, "Diagnosis");
  });

  it("lets UWorld-style explanation text confirm and refine an IM concept without owning the reasoning path", () => {
    const result = buildRapidRoundsReasoningObject({
      rawText: [
        "A patient with severe hyperglycemia has anion gap metabolic acidosis and ketones.",
        "What is the initial management?",
        "A. Insulin before labs",
        "B. Isotonic fluids and potassium assessment",
        "C. Bicarbonate for all patients"
      ].join("\n"),
      highlightedText: [
        "Educational objective: Manage DKA by restoring volume and checking potassium before insulin when potassium may be low.",
        "Correct answer: Isotonic fluids and potassium assessment.",
        "Incorrect answer A: Starting insulin before potassium assessment can be unsafe when potassium is depleted."
      ].join("\n")
    });

    assert.equal(result.sourceType, "mixed_question_and_explanation");
    assert.equal(result.clinicalSchema?.name, "DKA/HHS");
    assert.equal(result.conceptCard.sourceConfidence, "confirmed");
    assert.ok(result.authorityTrace.includes("educational_objective"));
    assert.doesNotMatch(JSON.stringify(result), /Educational objective: Manage DKA by restoring volume/);
  });

  it("retrieves seeds by stable id or topic for future question generation", () => {
    assert.equal(getInternalMedicineTopicSeed("im-hfref")?.topic, "HFrEF");
    assert.equal(getInternalMedicineTopicSeed("ACS")?.id, "im-acs");
  });
});
