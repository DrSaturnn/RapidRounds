import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MedicalFact } from "@/lib/anking-enrichment";
import {
  buildClinicalReasoningOntology,
  ontologyEntryFromMedicalFact,
  validateOntologyEntry,
  type ClinicalReasoningOntologyEntry,
} from "@/lib/clinical-reasoning-ontology";
import type { KnowledgeObject } from "@/lib/curriculum-acquisition";

function baseKnowledgeObject(overrides: Partial<KnowledgeObject> = {}): KnowledgeObject {
  return {
    id: "ko-chlamydial-urethritis",
    sourceType: "cms_style_questions",
    sourceMetadata: {
      sourceId: "cms-sample-1",
      segmentId: "cms-sample-1-q1",
      sourceHash: "sample-hash",
      sourcePath: "sample.pdf",
      itemNumber: 1,
      proprietaryExpressionRetained: false,
    },
    subject: "OB/GYN",
    system: "genitourinary",
    topic: "Chlamydial urethritis",
    blueprintCategory: "Female Reproductive System",
    estimatedYield: 0.82,
    testedConcept: "Chlamydial urethritis",
    competency: "diagnosis",
    questionArchetype: "Diagnosis",
    managementStage: "recognition",
    illnessScript: [
      "Dysuria with pyuria but absent bacteriuria should activate urethritis rather than routine cystitis.",
    ],
    epidemiology: ["sexually active patient with urinary symptoms"],
    context: ["persistent dysuria with sterile pyuria"],
    pivot: "sterile pyuria",
    supportingClues: ["dysuria", "urinary frequency"],
    pertinentNegatives: ["no bacteriuria"],
    discriminatorPair: {
      conceptA: "chlamydial urethritis",
      conceptB: "acute bacterial cystitis",
      pivot: "pyuria without bacteriuria",
      whyPivotSupportsA:
        "Sterile pyuria points toward urethral inflammation from chlamydial infection.",
      whatWouldSupportB: "Bacteriuria and response to cystitis antibiotics.",
      boardRule:
        "Dysuria plus pyuria without bacteriuria should activate urethritis before uncomplicated cystitis.",
    },
    semanticLinks: [
      {
        sourceText: "sterile pyuria",
        relationship: "supports",
        targetConcept: "urethritis",
        targetDiagnosis: "chlamydial urethritis",
      },
    ],
    commonTrap: "promoting urinary frequency above the sterile pyuria pivot",
    nextTimeRule:
      "Dysuria plus pyuria without bacteriuria should activate urethritis before uncomplicated cystitis.",
    clinicalPearl:
      "Sterile pyuria is a clue to urethritis when urinary symptoms persist without bacteria.",
    confidence: 0.86,
    noveltyScore: 0.9,
    duplicateScore: 0.1,
    missingFields: [],
    lowConfidenceWarnings: [],
    validationSources: ["public clinical teaching standard"],
    literalAnswer: "Doxycycline",
    canonicalAnswer: "doxycycline",
    displayAnswer: "doxycycline",
    abstractConcept: "chlamydial urethritis treated with tetracycline-class therapy",
    conceptType: "medication",
    aliases: ["doxycycline", "anti-chlamydial therapy", "tetracycline-class therapy"],
    acceptableAnswerPatterns: ["doxycycline", "tetracycline antibiotic"],
    unacceptableNearMisses: ["ceftriaxone", "broad-spectrum antibiotics"],
    testedDecision: "recognize chlamydial urethritis and select targeted therapy",
    managementActionClass: "anti-chlamydial therapy",
    discriminatorConcepts: ["chlamydial urethritis", "acute bacterial cystitis"],
    avoidLiteralStorage: true,
    complications: [],
    contraindications: [],
    transferConcepts: ["acute bacterial cystitis"],
    ...overrides,
  };
}

function ankingFact(overrides: Partial<MedicalFact> = {}): MedicalFact {
  return {
    id: "anking-fact-doxycycline",
    source: "anking",
    sourceCardId: "ank-1",
    deck: "AnKing Step 2",
    tags: ["#AK_Step2_v12::!Shelf::OBGYN"],
    title: "Doxycycline for chlamydial infection",
    canonicalConcept: "doxycycline",
    aliases: [
      "doxycycline",
      "tetracycline-class therapy",
      "anti-chlamydial therapy",
      "treatment for chlamydia",
    ],
    factType: "management",
    facts: [
      "Doxycycline is used as targeted therapy for chlamydial infection.",
      "Chlamydial urethritis may present with sterile pyuria.",
    ],
    contraindications: [],
    mechanisms: [],
    managementPearls: ["Treat chlamydial infection with targeted anti-chlamydial therapy."],
    shelfTags: ["OB/GYN"],
    stepTags: ["Step 2"],
    confidence: 0.84,
    sourceHash: "ank-hash-1",
    mediaReferences: [],
    ...overrides,
  };
}

describe("clinical reasoning ontology", () => {
  it("derives a schema ontology from KnowledgeObjects enriched by AnKing facts", () => {
    const report = buildClinicalReasoningOntology([baseKnowledgeObject()], [ankingFact()]);
    const entry = report.entries[0];

    assert.equal(report.ontologyEntryCount, 1);
    assert.equal(entry.object_type, "schema");
    assert.equal(entry.source_kind, "hybrid");
    assert.ok(entry.source_knowledge_object_ids.includes("ko-chlamydial-urethritis"));
    assert.ok(entry.source_card_references.some((ref) => ref.sourceCardId === "ank-1"));
    assert.equal(entry.schema_activation.diagnosis_or_concept.includes("chlamydial"), true);
    assert.ok(entry.activation.pivot_clues.includes("sterile pyuria"));
    assert.ok(entry.competing_schemas.some((schema) => schema.schema_id.includes("cystitis")));
    assert.ok(entry.common_misactivations.length >= 1);
    assert.ok(entry.repair_operations.length >= 1);
    assert.ok(entry.commit_rule.includes("Dysuria plus pyuria"));
    assert.ok(entry.retrieval_prompts.some((prompt) => prompt.includes("sterile pyuria")));
    assert.ok(entry.ontology_objects.includes("discriminator"));
    assert.ok(entry.ontology_objects.includes("source_card_reference"));
    assert.equal(report.validation[0].valid, true);
  });

  it("preserves raw AnKing facts as source material rather than creating schema nodes from them", () => {
    const fact = ankingFact();
    const entry = ontologyEntryFromMedicalFact(fact);

    assert.equal(entry.source_kind, "anking_derived");
    assert.equal(entry.source_knowledge_object_ids.length, 0);
    assert.equal(entry.source_card_references.length, 1);
    assert.equal(entry.source_card_references[0].sourceCardId, fact.sourceCardId);
    assert.equal(entry.schema_activation.diagnosis_or_concept, fact.canonicalConcept);
    assert.ok(entry.validation_warnings.includes("No competing schema/discriminator available yet."));
  });

  it("allows curated ontology entries to override generated entries without losing source references", () => {
    const generated = buildClinicalReasoningOntology([baseKnowledgeObject()], [ankingFact()]).entries[0];
    const curated: ClinicalReasoningOntologyEntry = {
      ...generated,
      clinical_pattern: "persistent dysuria with sterile pyuria",
      source_kind: "manual_curated",
      activation: {
        ...generated.activation,
        anchor_clue: "dysuria with pyuria but no bacteriuria",
      },
    };

    const report = buildClinicalReasoningOntology([baseKnowledgeObject()], [ankingFact()], {
      curatedEntries: [curated],
    });
    const entry = report.entries[0];

    assert.equal(report.ontologyEntryCount, 1);
    assert.equal(entry.source_kind, "manual_curated");
    assert.equal(entry.clinical_pattern, "persistent dysuria with sterile pyuria");
    assert.equal(entry.activation.anchor_clue, "dysuria with pyuria but no bacteriuria");
    assert.ok(entry.source_card_references.some((ref) => ref.sourceCardId === "ank-1"));
    assert.ok(entry.source_knowledge_object_ids.includes("ko-chlamydial-urethritis"));
  });

  it("can include fact-only ontology entries when requested", () => {
    const report = buildClinicalReasoningOntology([], [ankingFact()], {
      includeFactOnlyEntries: true,
    });

    assert.equal(report.ontologyEntryCount, 1);
    assert.equal(report.entries[0].source_kind, "anking_derived");
    assert.equal(report.entries[0].schema_activation.diagnosis_or_concept, "doxycycline");
    assert.ok(report.validation[0].warnings.includes("No competing schema/discriminator available yet."));
  });

  it("validates missing ontology fields before tutor use", () => {
    const entry = buildClinicalReasoningOntology([baseKnowledgeObject()], [ankingFact()]).entries[0];
    const invalid: ClinicalReasoningOntologyEntry = {
      ...entry,
      activation: {
        ...entry.activation,
        pivot_clues: [],
      },
      source_card_references: [],
      source_knowledge_object_ids: [],
    };

    const validation = validateOntologyEntry(invalid);

    assert.equal(validation.valid, false);
    assert.ok(validation.missingFields.includes("activation.pivot_clues"));
    assert.ok(validation.missingFields.includes("source_card_references_or_source_knowledge_object_ids"));
  });
});
