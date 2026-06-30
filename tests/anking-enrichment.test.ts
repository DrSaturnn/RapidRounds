import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrichKnowledgeObjectsWithAnKing,
  importAnKingText,
  searchKnowledgeObjectsWithAnKingAliases,
  type MedicalFact
} from "@/lib/anking-enrichment";
import { buildKnowledgeObject, segmentQuestions } from "@/lib/curriculum-acquisition";
import { buildTutorContent } from "@/lib/tutor-content";

const doxycyclineKnowledge = buildKnowledgeObject(
  segmentQuestions(
    [
      "Question 1. OB/GYN item. A patient has mucopurulent cervicitis and a positive nucleic acid test for Chlamydia trachomatis.",
      "Which medication should be given?",
      "A Ceftriaxone B Azithromycin C Doxycycline D Broad-spectrum antibiotics",
      "Correct Answer: C.",
      "Educational Objective: Chlamydial cervicitis and nongonococcal urethritis are treated with doxycycline."
    ].join(" "),
    "anking-doxycycline",
    "cms_style_questions"
  )[0]
);

describe("AnKing Enrichment Engine", () => {
  it("imports AnKing exports as MedicalFact objects without creating ShelfSchemaNodes", () => {
    const report = importAnKingText(
      [
        "Doxycycline\tTetracycline-class antibiotic used for chlamydial infection and nongonococcal urethritis\tStep2::OBGYN",
        "Rh immune globulin\tPrevents Rh alloimmunization in unsensitized Rh-negative pregnancy bleeding\tStep2::OBGYN"
      ].join("\n"),
      { sourceId: "anking-sample" }
    );

    assert.equal(report.factCount, 2);
    assert.equal(report.facts[0].source, "anking");
    assert.equal(report.facts[0].canonicalConcept, "doxycycline");
    assert.ok(report.facts[0].aliases.includes("tetracycline-class therapy"));
    assert.equal("schemaNodes" in report, false);
  });

  it("enriches KnowledgeObjects with supporting facts without overwriting CAE reasoning", () => {
    const pivotBefore = doxycyclineKnowledge.pivot;
    const discriminatorBefore = { ...doxycyclineKnowledge.discriminatorPair };
    const importReport = importAnKingText(
      "Doxycycline\tDoxycycline is a tetracycline antibiotic; it treats chlamydial infection and nongonococcal urethritis.\tStep2::OBGYN",
      { sourceId: "anking-doxy" }
    );

    const report = enrichKnowledgeObjectsWithAnKing([doxycyclineKnowledge], importReport.facts);
    const enriched = report.enrichedKnowledgeObjects[0];

    assert.equal(report.enrichedKnowledgeObjectCount, 1);
    assert.equal(enriched.pivot, pivotBefore);
    assert.deepEqual(enriched.discriminatorPair, discriminatorBefore);
    assert.equal(enriched.supportingFacts.length, 1);
    assert.ok(enriched.durableAliases.includes("anti-chlamydial therapy"));
  });

  it("matches doxycycline aliases but rejects configured near misses", () => {
    const doxyFact = importAnKingText(
      "Tetracycline antibiotic\tAnti-chlamydial therapy; treatment for nongonococcal urethritis.\tStep2::OBGYN",
      { sourceId: "anking-alias" }
    ).facts[0];
    const nearMissFacts: MedicalFact[] = ["ceftriaxone", "azithromycin", "broad-spectrum antibiotics", "STI treatment"].map(
      (concept) => ({
        id: `fact-${concept}`,
        source: "anking",
        sourceCardId: `card-${concept}`,
        deck: "AnKing",
        tags: ["Step2::OBGYN"],
        title: concept,
        canonicalConcept: concept,
        aliases: [concept],
        factType: "drug",
        facts: [`${concept} is a nearby but different answer.`],
        contraindications: [],
        mechanisms: [],
        managementPearls: [],
        shelfTags: ["OB/GYN"],
        stepTags: ["Step2::OBGYN"],
        confidence: 0.9,
        sourceHash: concept
      })
    );

    const report = enrichKnowledgeObjectsWithAnKing([doxycyclineKnowledge], [doxyFact, ...nearMissFacts]);
    const enriched = report.enrichedKnowledgeObjects[0];

    assert.equal(enriched.supportingFacts.length, 1);
    assert.equal(enriched.supportingFacts[0].id, doxyFact.id);
    assert.equal(report.unmatchedFacts.length, 4);
  });

  it("lets Teach Me More consume supportingFacts without rendering a new UI surface", () => {
    const fact = importAnKingText(
      "Doxycycline\tDoxycycline is a tetracycline antibiotic used for chlamydial infection.\tStep2::OBGYN",
      { sourceId: "anking-tutor" }
    ).facts[0];
    const tutor = buildTutorContent({
      specialty: "OB/GYN",
      topic: doxycyclineKnowledge.topic,
      correctAnswer: doxycyclineKnowledge.displayAnswer,
      acceptedAnswers: JSON.stringify([doxycyclineKnowledge.displayAnswer]),
      boardPearl: doxycyclineKnowledge.nextTimeRule,
      tags: "[]",
      pivotClue: doxycyclineKnowledge.pivot,
      supportingFacts: [fact]
    });

    assert.equal(tutor.supportingFacts?.[0].canonicalConcept, "doxycycline");
  });

  it("finds enriched KnowledgeObjects through AnKing aliases for search", () => {
    const fact = importAnKingText(
      "Doxycycline\tTreatment for nongonococcal urethritis uses tetracycline-class therapy.\tStep2::OBGYN",
      { sourceId: "anking-search" }
    ).facts[0];
    const report = enrichKnowledgeObjectsWithAnKing([doxycyclineKnowledge], [fact]);
    const results = searchKnowledgeObjectsWithAnKingAliases(report.enrichedKnowledgeObjects, "tetracycline class therapy");

    assert.equal(results.length, 1);
    assert.equal(results[0].id, doxycyclineKnowledge.id);
  });

  it("deduplicates media into VisualMemory objects and selects primary images by concept relevance", () => {
    const importReport = importAnKingText(
      [
        "Doxycycline is tetracycline-class therapy for chlamydia.<img src=\"doxycycline-algorithm.png\">\\t#AK_Step2_v12::#UWorld::Step",
        "Doxycycline treats nongonococcal urethritis.<img src=\"doxycycline-algorithm.png\">\\t#AK_Step2_v12::!Shelf::IM"
      ].join("\n"),
      { sourceId: "anking-visual" }
    );
    const report = enrichKnowledgeObjectsWithAnKing(
      [doxycyclineKnowledge],
      importReport.facts,
      importReport.visualMemories
    );
    const enriched = report.enrichedKnowledgeObjects[0];

    assert.equal(importReport.visualMemories?.length, 1);
    assert.equal(enriched.primaryImage?.filename, "doxycycline-algorithm.png");
    assert.equal(enriched.visualMemoryReferences.length, 1);
    assert.equal(report.unmatchedImages.length, 0);
  });

  it("keeps visual memory separate from KnowledgeObject reasoning fields", () => {
    const pivotBefore = doxycyclineKnowledge.pivot;
    const discriminatorBefore = { ...doxycyclineKnowledge.discriminatorPair };
    const fact = importAnKingText(
      "Doxycycline management algorithm for chlamydia.<img src=\"doxycycline-flow.png\">\\t#AK_Step2_v12::#CMS",
      { sourceId: "anking-visual-no-overwrite" }
    );
    const report = enrichKnowledgeObjectsWithAnKing([doxycyclineKnowledge], fact.facts, fact.visualMemories);
    const enriched = report.enrichedKnowledgeObjects[0];

    assert.equal(enriched.pivot, pivotBefore);
    assert.deepEqual(enriched.discriminatorPair, discriminatorBefore);
    assert.equal(enriched.primaryImage?.source, "anking");
  });
});
