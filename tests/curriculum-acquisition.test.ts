import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  acquireCurriculum,
  acquireCurriculumFromText,
  buildKnowledgeObject,
  detectSourceType,
  identifyCorrectAnswer,
  knowledgeObjectToShelfSchemaNode,
  segmentQuestions,
  writeCurriculumAcquisitionReports
} from "@/lib/curriculum-acquisition";
import { generateCasesFromSchemaNode } from "@/lib/seed-case-generator";

const sampleSource = [
  "Question 1. Internal Medicine ACS item. A patient has crushing chest pressure, diaphoresis, and ST elevations.",
  "What is the initial management?",
  "Answer: aspirin and immediate reperfusion.",
  "Explanation: ST elevations distinguish acute coronary syndrome from stable angina; use urgent reperfusion rather than outpatient testing.",
  "",
  "Question 2. OB/GYN item. A pregnant patient has painless third-trimester bleeding and stable vital signs.",
  "What is the most likely diagnosis?",
  "Correct answer: placenta previa.",
  "Explanation: Painless bleeding distinguishes placenta previa from placental abruption."
].join("\n");

describe("Curriculum Acquisition Engine", () => {
  it("segments educational sources and identifies correct answers without treating questions as permanent output", () => {
    const segments = segmentQuestions(sampleSource, "sample-source", "cms_style_questions");

    assert.equal(segments.length, 2);
    assert.equal(identifyCorrectAnswer(segments[0].rawText), "aspirin and immediate reperfusion");
    assert.equal(identifyCorrectAnswer(segments[1].rawText), "placenta previa");
    assert.ok(segments.every((segment) => segment.sourceHash.length > 0));
  });

  it("extracts normalized Knowledge Objects with shelf, system, competency, management stage, and blueprint mapping", () => {
    const [segment] = segmentQuestions(sampleSource, "sample-source", "cms_style_questions");
    const knowledge = buildKnowledgeObject(segment);

    assert.equal(knowledge.subject, "Internal Medicine");
    assert.equal(knowledge.system, "Cardiovascular");
    assert.equal(knowledge.topic, "Acute coronary syndrome");
    assert.equal(knowledge.blueprintCategory, "Cardiovascular Disorders");
    assert.equal(knowledge.competency, "management");
    assert.equal(knowledge.managementStage, "initial_stabilization");
    assert.equal(knowledge.literalAnswer, "aspirin and immediate reperfusion");
    assert.equal(knowledge.testedConcept, "Acute coronary syndrome");
    assert.equal(knowledge.abstractConcept, "Acute coronary syndrome");
    assert.equal(knowledge.avoidLiteralStorage, true);
    assert.ok(knowledge.confidence > 0.5);
    assert.equal(knowledge.sourceMetadata.proprietaryExpressionRetained, false);
  });

  it("extracts discriminator pairs, semantic links, duplicate scoring, and validation warnings", () => {
    const report = acquireCurriculumFromText(sampleSource, {
      sourceId: "sample-source",
      sourceType: "cms_style_questions"
    });
    const placentaPrevia = report.knowledgeObjects.find((item) => item.topic === "Placenta previa");

    assert.ok(placentaPrevia);
    assert.equal(placentaPrevia.subject, "OB/GYN");
    assert.equal(placentaPrevia.discriminatorPair.conceptA, "Placenta previa");
    assert.match(placentaPrevia.discriminatorPair.conceptB, /placental abruption/i);
    assert.ok(placentaPrevia.semanticLinks.some((link) => link.sourceText === placentaPrevia.pivot));
    assert.equal(typeof placentaPrevia.duplicateScore, "number");
    assert.equal(typeof placentaPrevia.noveltyScore, "number");
    assert.ok(Array.isArray(placentaPrevia.missingFields));
    assert.ok(Array.isArray(placentaPrevia.lowConfidenceWarnings));
  });

  it("parses CMS answer choices without parentheses and keeps vignette pivots ahead of explanation definitions", () => {
    const cmsText = [
      "Exam Section : Item 1 of 50 National Board of Medical Examiners Obstetrics and Gynecology Self-Assessment",
      "1. Thirty minutes after vaginal delivery, the placenta delivers with a nontapering vessel extending to the margin of the membranes.",
      "The patient has heavy vaginal bleeding. Which of the following is the most likely diagnosis?",
      "A Abruptio placentae B Placenta accreta C Placenta percreta D Placenta previa E Succenturiate placental lobe",
      "Correct Answer: E.",
      "Succenturiate placental lobes are accessory lobes of the placenta.",
      "Incorrect Answers: Placenta accreta requires abnormal placental adherence.",
      "Educational Objective: Succenturiate placental lobes can cause postpartum hemorrhage due to retained placental tissue."
    ].join(" ");
    const [segment] = segmentQuestions(cmsText, "cms-5a", "cms_style_questions");
    const knowledge = buildKnowledgeObject(segment);

    assert.equal(identifyCorrectAnswer(segment.rawText), "Succenturiate placental lobe");
    assert.equal(knowledge.subject, "OB/GYN");
    assert.equal(knowledge.literalAnswer, "Succenturiate placental lobe");
    assert.equal(knowledge.testedConcept, "succenturiate placental lobe with retained placental tissue");
    assert.equal(knowledge.abstractConcept, "succenturiate placental lobe with retained placental tissue");
    assert.match(knowledge.pivot, /nontapering vessel extending to the margin of the membranes/i);
    assert.doesNotMatch(knowledge.pivot, /accessory lobes/i);
  });

  it("abstracts literal answer strings into durable RapidRounds schema concepts", () => {
    const mastitisText = [
      "Question 1. OB/GYN item. A breastfeeding patient has fever, nipple fissures, and a unilateral erythematous tender indurated breast.",
      "Which antibiotic should be given?",
      "A Ampicillin B Dicloxacillin C Erythromycin D Tetracycline",
      "Correct Answer: B.",
      "Educational Objective: Lactational mastitis is treated with an anti-staphylococcal antibiotic."
    ].join(" ");
    const rhText = [
      "Question 2. OB/GYN item. An unsensitized Rh-negative pregnant patient has first-trimester bleeding.",
      "What should be administered?",
      "Answer: Administration of Rho(D) immune globulin.",
      "Educational Objective: Rh-negative pregnancy bleeding requires alloimmunization prophylaxis."
    ].join("\n");

    const [mastitisSegment] = segmentQuestions(mastitisText, "cms-abstraction", "cms_style_questions");
    const mastitis = buildKnowledgeObject(mastitisSegment);
    const rh = buildKnowledgeObject(segmentQuestions(rhText, "rh", "cms_style_questions")[0]);

    assert.equal(mastitis.literalAnswer, "Dicloxacillin");
    assert.equal(mastitis.abstractConcept, "lactational mastitis treated with anti-staphylococcal therapy");
    assert.equal(mastitis.managementActionClass, "anti-staphylococcal antibiotic therapy");
    assert.equal(mastitis.avoidLiteralStorage, true);

    assert.equal(rh.literalAnswer, "Administration of Rho(D) immune globulin");
    assert.equal(rh.abstractConcept, "Rh-negative pregnancy alloimmunization prophylaxis");
    assert.equal(rh.managementActionClass, "alloimmunization prophylaxis");
    assert.equal(rh.avoidLiteralStorage, true);
  });

  it("abstracts procedures to the tested clinical decision when the category matters", () => {
    const amenorrhea = [
      "Question 1. OB/GYN item. A patient with secondary amenorrhea needs initial evaluation.",
      "Which test should be performed first?",
      "Answer: Measurement of serum β-hCG.",
      "Educational Objective: Pregnancy should be excluded before additional amenorrhea workup."
    ].join("\n");
    const aub = [
      "Question 2. OB/GYN item. A 48-year-old patient has abnormal uterine bleeding.",
      "What diagnostic test should be performed?",
      "Answer: Endometrial biopsy.",
      "Educational Objective: Abnormal uterine bleeding after age 45 requires evaluation for endometrial cancer."
    ].join("\n");

    const pregnancyTest = buildKnowledgeObject(segmentQuestions(amenorrhea, "amenorrhea", "cms_style_questions")[0]);
    const biopsy = buildKnowledgeObject(segmentQuestions(aub, "aub", "cms_style_questions")[0]);

    assert.equal(pregnancyTest.abstractConcept, "pregnancy exclusion before amenorrhea workup");
    assert.equal(pregnancyTest.managementActionClass, "initial diagnostic exclusion");
    assert.equal(biopsy.abstractConcept, "abnormal uterine bleeding age >45 / endometrial cancer rule-out");
    assert.equal(biopsy.managementActionClass, "endometrial cancer exclusion");
  });

  it("converts Knowledge Objects into ShelfSchemaNodes and generated original cases", () => {
    const [segment] = segmentQuestions(sampleSource, "sample-source", "cms_style_questions");
    const knowledge = buildKnowledgeObject(segment);
    const schemaNode = knowledgeObjectToShelfSchemaNode(knowledge);
    const generatedCases = generateCasesFromSchemaNode(schemaNode, "primary");

    assert.equal(schemaNode.acquiredFromKnowledgeObjectId, knowledge.id);
    assert.equal(schemaNode.subject, "Internal Medicine");
    assert.equal(schemaNode.sourcePolicyMetadata.reconstructedFromMedicalTruth, true);
    assert.equal(schemaNode.sourcePolicyMetadata.proprietaryExpressionRetained, false);
    assert.ok(schemaNode.discriminatorPair.conceptA);
    assert.ok(schemaNode.discriminatorPair.conceptB);
    assert.ok(schemaNode.semanticLinks.length > 0);
    assert.ok(generatedCases.length > 0);
    assert.ok(generatedCases.every((generatedCase) => generatedCase.answerChoices.length >= 4));
    assert.ok(generatedCases.every((generatedCase) => generatedCase.correctAnswer));
    assert.ok(generatedCases.every((generatedCase) => generatedCase.reasoningObject));
  });

  it("detects PDF-like educational sources and writes sanitized acquisition reports", () => {
    const tempRoot = "/private/tmp/rapidrounds-cae-test";
    const pdfPath = join(tempRoot, "cms-sample.pdf");
    const reportRoot = join(tempRoot, "reports");
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    writeFileSync(
      pdfPath,
      [
        "%PDF-1.4",
        "(Question 1. ACS with ST elevations. What is the initial management? Answer: urgent reperfusion. Explanation: ST elevations distinguish ACS from stable angina.)"
      ].join("\n")
    );

    const text = readFileSync(pdfPath, "latin1");
    assert.equal(detectSourceType(pdfPath, text), "cms_style_questions");

    const report = acquireCurriculum({ file: pdfPath });
    writeCurriculumAcquisitionReports(report, reportRoot);

    assert.equal(report.sourceCount, 1);
    assert.ok(report.segmentCount >= 1);
    for (const name of [
      "curriculum-acquisition.json",
      "schema-summary.json",
      "duplicate-report.json",
      "novelty-report.json",
      "blueprint-coverage.json"
    ]) {
      assert.ok(existsSync(join(reportRoot, name)), `${name} should be written`);
    }

    const acquisitionJson = readFileSync(join(reportRoot, "curriculum-acquisition.json"), "utf8");
    assert.doesNotMatch(acquisitionJson, /Question 1\. ACS with ST elevations\. What is the initial management\?/);
    assert.doesNotMatch(acquisitionJson, /Explanation:/);
  });
});
