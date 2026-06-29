import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { buildClinicalNotebookViewModel } from "@/lib/clinical-notebook-view-model";
import { serializeRapidRoundsCaseTag, type RapidRoundsCase } from "@/lib/rapidrounds-case";
import { buildTutorContent } from "@/lib/tutor-content";

const placentaPreviaDecision = {
  specialty: "Obstetrics",
  system: "Antepartum Bleeding",
  topic: "Placenta previa",
  prompt: "A 32-year-old G2P1 at 32 weeks has painless bright red bleeding and no abdominal pain.",
  correctAnswer: "placenta previa",
  acceptedAnswers: JSON.stringify(["placenta previa"]),
  boardPearl: "Third-trimester painless bleeding suggests placenta previa; confirm placental location by ultrasound.",
  tags: JSON.stringify(["third-trimester bleeding", "painless bleeding", "placenta previa"]),
  pivotClue: "No abdominal pain / painless bleeding",
  commonTrap: "placental abruption",
  clinicalPattern: "Third-trimester bleeding",
  decisionType: "Diagnosis",
  managementPearl: "Avoid digital cervical exam until placenta previa is excluded."
};

const placentaPreviaCase: RapidRoundsCase = {
  id: "obgyn-placenta-previa-boundary",
  scriptId: "third_trimester_bleeding",
  domain: "obgyn",
  topic: "Placenta previa",
  canonicalProblem: "Third-trimester bleeding",
  variantType: "diagnosis",
  difficulty: 2,
  vignette: "Painless bright red bleeding in the third trimester.",
  answerPrompt: "What is the most likely diagnosis?",
  acceptedAnswers: ["placenta previa"],
  pivotClues: ["No abdominal pain / painless bleeding"],
  supportingClues: ["Bright red bleeding", "Stable vital signs"],
  distractorClues: ["No contractions"],
  correctReasoning: "Painless bleeding supports placenta previa.",
  commonWrongReasoning: ["Both present with third-trimester bleeding."],
  decisionBoundary: [
    {
      confusedWith: "Placental abruption",
      howToDistinguish: "Abruption should have abdominal pain, uterine tenderness, contractions, or fetal distress."
    }
  ],
  teachMeMore: "Painless third-trimester bleeding should trigger placenta previa until ultrasound excludes it."
};

function incorrectEvaluation(answer: string) {
  return evaluateAnswer({
    answer,
    acceptedAnswers: ["placenta previa"],
    canonicalAnswer: "placenta previa",
    expectedTask: "Diagnosis"
  });
}

describe("wrong-answer schema discriminator", () => {
  it("builds learnerAnswerSchema for an incorrect learner answer", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "placental abruption", incorrectEvaluation("placental abruption"));

    assert.equal(tutor.postAnswerTeaching.learnerAnswer, "placental abruption");
    assert.ok(tutor.postAnswerTeaching.learnerAnswerSchema.some((step) => /abruption/i.test(step)));
    assert.equal(tutor.postAnswerTeaching.isCorrect, false);
  });

  it("uses the correct schema when the learner answer is correct", () => {
    const evaluation = evaluateAnswer({
      answer: "placenta previa",
      acceptedAnswers: ["placenta previa"],
      canonicalAnswer: "placenta previa",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(placentaPreviaDecision, "placenta previa", evaluation);

    assert.deepEqual(tutor.postAnswerTeaching.learnerAnswerSchema, tutor.postAnswerTeaching.correctSchema);
    assert.equal(tutor.postAnswerTeaching.isCorrect, true);
  });

  it("keeps the intended discriminator pair independent of an off-track learner answer", () => {
    const decisionWithBoundary = {
      ...placentaPreviaDecision,
      tags: JSON.stringify([...JSON.parse(placentaPreviaDecision.tags), serializeRapidRoundsCaseTag(placentaPreviaCase)])
    };
    const tutor = buildTutorContent(decisionWithBoundary, "vasa previa", incorrectEvaluation("vasa previa"));

    assert.equal(tutor.postAnswerTeaching.learnerAnswer, "vasa previa");
    assert.equal(tutor.postAnswerTeaching.intendedDiscriminatorPair?.conceptA, "placenta previa");
    assert.equal(tutor.postAnswerTeaching.intendedDiscriminatorPair?.conceptB, "Placental abruption");
  });

  it("connects pivot text to the discriminator concept through semantic links", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "placental abruption", incorrectEvaluation("placental abruption"));
    const link = tutor.postAnswerTeaching.semanticLinks[0];

    assert.equal(link.sourceText, tutor.postAnswerTeaching.pivotClue);
    assert.match(link.relationship, /proves|supports/);
    assert.match(link.targetConcept, /Placenta previa|Placental abruption/);
  });

  it("places clinical resolution after pivot and discriminator fields in the semantic model", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "placental abruption", incorrectEvaluation("placental abruption"));
    const keys = Object.keys(tutor.postAnswerTeaching);

    assert.ok(keys.indexOf("clinicalResolution") > keys.indexOf("pivotClue"));
    assert.ok(keys.indexOf("clinicalResolution") > keys.indexOf("intendedDiscriminatorPair"));
  });

  it("renders a discriminator comparison for a wrong answer with known decisionBoundary data", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "placental abruption", incorrectEvaluation("placental abruption"));

    assert.equal(tutor.schemaDiscriminator?.correctSchema, "Placenta previa");
    assert.equal(tutor.schemaDiscriminator?.learnerSchema, "Placental abruption");
    assert.equal(tutor.schemaDiscriminator?.source, "learner_answer");
    assert.match(JSON.stringify(tutor.schemaDiscriminator), /No abdominal pain|painless bleeding/i);
    assert.match(JSON.stringify(tutor.schemaDiscriminator), /Board rule/i);
  });

  it("hides the wrong-answer comparison for correct answers", () => {
    const evaluation = evaluateAnswer({
      answer: "placenta previa",
      acceptedAnswers: ["placenta previa"],
      canonicalAnswer: "placenta previa",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(placentaPreviaDecision, "placenta previa", evaluation);

    assert.equal(tutor.repair.style, "CORRECT");
    assert.equal(tutor.schemaDiscriminator, undefined);
  });

  it("uses the learner answer schema when the wrong answer maps to a known confusion", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "placental abruption", incorrectEvaluation("placental abruption"));

    assert.equal(tutor.schemaDiscriminator?.source, "learner_answer");
    assert.equal(tutor.schemaDiscriminator?.learnerSchema, "Placental abruption");
  });

  it("falls back to authored confusedWith only when the learner answer is unmapped", () => {
    const decisionWithBoundary = {
      ...placentaPreviaDecision,
      tags: JSON.stringify([...JSON.parse(placentaPreviaDecision.tags), serializeRapidRoundsCaseTag(placentaPreviaCase)])
    };
    const tutor = buildTutorContent(decisionWithBoundary, "vasa previa", incorrectEvaluation("vasa previa"));

    assert.equal(tutor.schemaDiscriminator?.source, "fallback");
    assert.equal(tutor.schemaDiscriminator?.learnerSchema, "Placental abruption");
    assert.match(JSON.stringify(tutor.schemaDiscriminator), /Abruption should have abdominal pain/i);
  });

  it("hides the comparison when there is no decisionBoundary or mapped learner schema", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "vasa previa", incorrectEvaluation("vasa previa"));

    assert.equal(tutor.schemaDiscriminator, undefined);
  });

  it("feeds the same semantic comparison to Moleskine and Modern Academic renderers", () => {
    const tutor = buildTutorContent(placentaPreviaDecision, "placental abruption", incorrectEvaluation("placental abruption"));
    const notebook = buildClinicalNotebookViewModel({
      question: {
        id: "placenta-previa",
        specialty: "Obstetrics",
        system: "Antepartum Bleeding",
        topic: "Placenta previa",
        difficulty: 2,
        stem: placentaPreviaDecision.prompt,
        decisionType: "Diagnosis",
        pattern: placentaPreviaDecision.clinicalPattern,
        management: placentaPreviaDecision.managementPearl,
        diagnosis: placentaPreviaDecision.correctAnswer
      },
      tutor,
      hasAnswered: true,
      subject: "OB/GYN",
      sessionDecisionCount: 1,
      displayedTotalDecisionCount: 96,
      progressDots: [true],
      decisionQuestion: "What is the most likely diagnosis?"
    });

    assert.deepEqual(notebook.rightPage?.schemaDiscriminator?.rows, tutor.schemaDiscriminator?.rows);
    assert.equal(notebook.rightPage?.schemaDiscriminator?.correctSchema, tutor.schemaDiscriminator?.correctSchema);
    assert.equal(notebook.rightPage?.schemaDiscriminator?.learnerSchema, tutor.schemaDiscriminator?.learnerSchema);
  });

  it("keeps grading logic out of presentation components", () => {
    const presentationSource = [
      readFileSync("components/TutorMode.tsx", "utf8"),
      readFileSync("components/moleskine/MoleskinePracticeRenderer.tsx", "utf8")
    ].join("\n");

    assert.doesNotMatch(presentationSource, /evaluateAnswer/);
    assert.doesNotMatch(presentationSource, /semanticMatchResult/);
    assert.doesNotMatch(presentationSource, /partialCreditResult/);
    assert.doesNotMatch(presentationSource, /sourceText: /);
    assert.doesNotMatch(presentationSource, /relationship: "supports"/);
    assert.match(presentationSource, /schemaDiscriminator/);
    assert.match(presentationSource, /SchemaDiscriminatorInsert|NotebookSchemaDiscriminator/);
  });
});
