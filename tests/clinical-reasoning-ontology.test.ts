import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MedicalFact } from "@/lib/anking-enrichment";
import {
  buildClinicalReasoningOntology,
  normalizeCompetingSchemas,
  ontologyEntryFromMedicalFact,
  validateOntologyEntry,
  type ClinicalReasoningOntologyEntry,
} from "@/lib/clinical-reasoning-ontology";
import type { KnowledgeObject } from "@/lib/curriculum-acquisition";
import type { KnowledgeObjectWithSupportingFacts } from "@/lib/anking-enrichment";

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

function enriched(knowledge: KnowledgeObject): KnowledgeObjectWithSupportingFacts {
  return {
    ...knowledge,
    supportingFacts: [],
    durableAliases: knowledge.aliases,
    relatedImages: [],
    visualMemoryReferences: [],
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
    assert.equal(entry.schema_activation.canonical_schema_id, "chlamydial_urethritis");
    assert.ok(entry.schema_activation.nbme_surface_terms.includes("sterile pyuria"));
    assert.ok(entry.schema_activation.answer_choice_aliases.includes("doxycycline"));
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
    assert.equal(entry.schema_activation.canonical_schema_id, "chlamydial_urethritis");
    assert.ok(entry.schema_activation.nbme_surface_terms.includes("sterile pyuria"));
    assert.ok(entry.schema_activation.answer_choice_aliases.includes("doxycycline"));
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
    assert.equal(report.entries[0].schema_activation.canonical_name, "chlamydial urethritis");
    assert.ok(report.entries[0].schema_activation.answer_choice_aliases.includes("doxycycline"));
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

  it("splits bundled answer choices into canonical pairwise competing schemas", () => {
    const knowledge = baseKnowledgeObject({
      id: "ko-chancroid",
      topic: "chancroid organism",
      testedConcept: "chancroid",
      abstractConcept: "chancroid",
      canonicalAnswer: "Haemophilus ducreyi",
      displayAnswer: "Haemophilus ducreyi",
      conceptType: "diagnosis",
      testedDecision: "Identify Haemophilus ducreyi as the cause of chancroid.",
      context: ["painful genital ulcer"],
      illnessScript: ["painful genital ulcer with a tender nonindurated bleeding ulcer"],
      pivot: "tender nonindurated bleeding ulcer",
      discriminatorPair: {
        conceptA: "chancroid",
        conceptB: "Calymmatobacterium granulomatis/Chlamydia trachomatis/Human papillomavirus/Herpes simplex virus/Primary syphilis",
        pivot: "tender nonindurated bleeding ulcer",
        whyPivotSupportsA: "A painful ragged nonindurated ulcer supports chancroid.",
        whatWouldSupportB: "Grouped vesicles, painless induration, or other syndrome-specific ulcer findings.",
        boardRule: "Painful ragged nonindurated genital ulcer should activate chancroid.",
      },
      discriminatorConcepts: [
        "Calymmatobacterium granulomatis",
        "Chlamydia trachomatis",
        "Human papillomavirus",
        "Herpes simplex virus",
        "Primary syphilis",
      ],
      commonTrap: "generic STI organism list",
    });

    const competitors = normalizeCompetingSchemas(enriched(knowledge));
    const ids = competitors.map((competitor) => competitor.schema_id);

    assert.ok(ids.includes("granuloma_inguinale"));
    assert.ok(ids.includes("lymphogranuloma_venereum"));
    assert.ok(ids.includes("herpes_simplex_virus_genital_ulcer"));
    assert.ok(ids.includes("primary_syphilis"));
    assert.equal(ids.includes("human_papillomavirus"), false);
    assert.equal(ids.some((id) => id.includes("calymmatobacterium_granulomatis_chlamydia")), false);
    assert.ok(competitors.every((competitor) => !competitor.schema_id.includes("/")));
    assert.ok(competitors.every((competitor) => competitor.discriminator.length > 20));
    assert.ok(competitors.every((competitor) => competitor.canonical_schema_id === competitor.schema_id));
    assert.ok(competitors.find((competitor) => competitor.schema_id === "herpes_simplex_virus_genital_ulcer")?.nbme_surface_terms.includes("multiple grouped vesicles"));
    assert.ok(competitors.find((competitor) => competitor.schema_id === "granuloma_inguinale")?.answer_choice_aliases.includes("Calymmatobacterium granulomatis"));
  });

  it("filters competitors to the activated clinical pattern instead of preserving all answer choices", () => {
    const knowledge = baseKnowledgeObject({
      id: "ko-bv",
      topic: "bacterial vaginosis confirmation",
      testedConcept: "bacterial vaginosis",
      abstractConcept: "bacterial vaginosis",
      canonicalAnswer: "clue cells",
      displayAnswer: "clue cells",
      conceptType: "diagnosis",
      testedDecision: "Confirm bacterial vaginosis with wet mount clue cells rather than unrelated testing.",
      context: ["vaginal discharge"],
      illnessScript: ["fishy thin vaginal discharge with clue cells"],
      pivot: "fishy thin discharge with clue cells",
      discriminatorPair: {
        conceptA: "bacterial vaginosis",
        conceptB: "Culture for Candida albicans/DNA probe for Chlamydia trachomatis of the cervix/Serologic testing for syphilis",
        pivot: "fishy thin discharge with clue cells",
        whyPivotSupportsA: "Clue cells support bacterial vaginosis.",
        whatWouldSupportB: "Hyphae, mucopurulent cervicitis findings, or painless genital ulcer clues.",
        boardRule: "Clue cells and fishy discharge point to bacterial vaginosis.",
      },
      discriminatorConcepts: [
        "Culture for Candida albicans",
        "DNA probe for Chlamydia trachomatis of the cervix",
        "Serologic testing for syphilis",
      ],
    });

    const competitors = normalizeCompetingSchemas(enriched(knowledge));
    const ids = competitors.map((competitor) => competitor.schema_id);

    assert.ok(ids.includes("vulvovaginal_candidiasis"));
    assert.ok(ids.includes("cervicitis"));
    assert.equal(ids.includes("primary_syphilis"), false);
    assert.equal(ids.includes("lymphogranuloma_venereum"), false);
    assert.ok(competitors.find((competitor) => competitor.schema_id === "cervicitis")?.answer_choice_aliases.includes("Chlamydia trachomatis"));
  });

  it("uses normalized pairwise schemas in generated misactivation and repair objects", () => {
    const report = buildClinicalReasoningOntology([
      baseKnowledgeObject({
        id: "ko-sterile-pyuria",
        abstractConcept: "chlamydial urethritis",
        canonicalAnswer: "chlamydial urethritis",
        displayAnswer: "chlamydial urethritis",
        conceptType: "diagnosis",
        context: ["dysuria with pyuria"],
        pivot: "sterile pyuria",
        discriminatorPair: {
          conceptA: "chlamydial urethritis",
          conceptB: "acute bacterial cystitis/urine cytology for urothelial carcinoma/broad-spectrum antibiotics",
          pivot: "pyuria without bacteriuria",
          whyPivotSupportsA: "Sterile pyuria supports urethritis.",
          whatWouldSupportB: "Bacteriuria or persistent unexplained hematuria.",
          boardRule: "Sterile pyuria should activate urethritis.",
        },
      }),
    ], [ankingFact()]);
    const entry = report.entries[0];
    const ids = entry.competing_schemas.map((schema) => schema.schema_id);

    assert.ok(ids.includes("acute_bacterial_cystitis"));
    assert.ok(ids.includes("urothelial_malignancy"));
    assert.equal(ids.some((id) => id.includes("broad_spectrum")), false);
    assert.ok(entry.common_misactivations[0].learner_branch.includes("acute bacterial cystitis"));
    assert.ok(entry.repair_operations[0].repair_statement.includes("First normalize the syndrome"));
    assert.ok(entry.source_card_references.some((reference) => reference.sourceCardId === "ank-1"));
  });

  it("preserves NBME surface language separately from canonical schema identity", () => {
    const report = buildClinicalReasoningOntology([
      baseKnowledgeObject({
        id: "ko-chancroid-surface",
        topic: "chancroid organism",
        testedConcept: "chancroid",
        abstractConcept: "chancroid",
        canonicalAnswer: "Haemophilus ducreyi",
        displayAnswer: "Haemophilus ducreyi",
        conceptType: "diagnosis",
        context: ["painful genital ulcer"],
        illnessScript: ["painful genital ulcer with a tender nonindurated ulcer that bleeds easily when touched"],
        pivot: "tender nonindurated ulcer that bleeds easily when touched",
        supportingClues: ["painful inguinal lymphadenopathy"],
        discriminatorPair: {
          conceptA: "chancroid",
          conceptB: "Herpes simplex virus/Primary syphilis",
          pivot: "tender nonindurated ulcer that bleeds easily when touched",
          whyPivotSupportsA: "A tender nonindurated bleeding ulcer supports chancroid.",
          whatWouldSupportB: "Grouped vesicles or painless indurated chancre.",
          boardRule: "Painful ragged nonindurated genital ulcer should activate chancroid.",
        },
      }),
    ], []);
    const entry = report.entries[0];

    assert.equal(entry.schema_activation.canonical_schema_id, "chancroid");
    assert.equal(entry.schema_activation.canonical_name, "chancroid");
    assert.ok(entry.schema_activation.nbme_surface_terms.includes("painful genital ulcer"));
    assert.ok(entry.schema_activation.nbme_surface_terms.includes("tender nonindurated ulcer"));
    assert.ok(entry.schema_activation.nbme_surface_terms.includes("bleeds easily when touched"));
    assert.ok(entry.schema_activation.answer_choice_aliases.includes("Haemophilus ducreyi"));
    assert.equal(entry.schema_activation.answer_choice_aliases.some((alias) => alias.includes("/")), false);
    assert.ok(entry.competing_schemas.find((schema) => schema.schema_id === "herpes_simplex_virus_genital_ulcer")?.nbme_surface_terms.includes("multiple grouped vesicles"));
  });
});
