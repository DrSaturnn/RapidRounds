import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { buildTutorContent } from "@/lib/tutor-content";

const ultrasoundCase = {
  specialty: "Obstetrics & Gynecology",
  system: "Antepartum Bleeding",
  topic: "Placenta previa evaluation",
  clinicalPattern: "Third-trimester bleeding",
  decisionType: "Initial Test",
  prompt: "Third-trimester bleeding with suspected placenta previa.",
  acceptedAnswers: [
    "transvaginal ultrasound",
    "TVUS",
    "transvaginal US",
    "transvaginal ultrasonography",
    "ultrasound",
    "pelvic ultrasound"
  ],
  boardPearl: "Transvaginal ultrasound is safe and best for diagnosing placenta previa.",
  pivotClue: "Suspected placenta previa",
  commonTrap: "digital cervical examination",
  managementPearl: "Localize the placenta before any cervical exam.",
  tags: ["previa", "ultrasound", "third trimester bleeding"]
};

function evaluateForTheme(theme: "modern-academic" | "warm-notebook", answer: string) {
  assert.ok(theme === "modern-academic" || theme === "warm-notebook");

  return evaluateAnswer({
    answer,
    acceptedAnswers: ultrasoundCase.acceptedAnswers,
    canonicalAnswer: ultrasoundCase.acceptedAnswers[0],
    expectedTask: ultrasoundCase.decisionType,
    clinicalConcepts: [
      ultrasoundCase.topic,
      ultrasoundCase.clinicalPattern,
      ultrasoundCase.commonTrap,
      ...ultrasoundCase.tags
    ]
  });
}

function buildTutorFor(answer: string) {
  const evaluation = evaluateForTheme("warm-notebook", answer);

  return buildTutorContent(
    {
      ...ultrasoundCase,
      correctAnswer: ultrasoundCase.acceptedAnswers[0],
      acceptedAnswers: JSON.stringify(ultrasoundCase.acceptedAnswers),
      tags: JSON.stringify(ultrasoundCase.tags)
    },
    answer,
    evaluation
  );
}

describe("presentation adapter regression safety", () => {
  it("marks exact transvaginal ultrasound correct in both default and Moleskine layouts", () => {
    const defaultResult = evaluateForTheme("modern-academic", "transvaginal ultrasound");
    const moleskineResult = evaluateForTheme("warm-notebook", "transvaginal ultrasound");
    const tutor = buildTutorFor("transvaginal ultrasound");

    assert.deepEqual(moleskineResult, defaultResult);
    assert.equal(moleskineResult.isCorrect, true);
    assert.equal(moleskineResult.classification, "EXACT");
    assert.equal(moleskineResult.requiresTeaching, false);
    assert.equal(moleskineResult.partialCredit, 1);
    assert.equal(tutor.correctAnswer, "transvaginal ultrasound");
    assert.equal(tutor.repair.correctAnswer, "transvaginal ultrasound");
    assert.doesNotMatch(tutor.repair.why, /you selected|wrong|didn't fit/i);
  });

  it("marks case-insensitive and whitespace-normalized exact ultrasound answers correct in both layouts", () => {
    const defaultResult = evaluateForTheme("modern-academic", "  Transvaginal Ultrasound  ");
    const moleskineResult = evaluateForTheme("warm-notebook", "  Transvaginal Ultrasound  ");

    assert.deepEqual(moleskineResult, defaultResult);
    assert.equal(moleskineResult.isCorrect, true);
    assert.equal(moleskineResult.classification, "EXACT");
    assert.equal(moleskineResult.canonicalAnswer, "transvaginal ultrasound");
  });

  it("accepts configured ultrasound aliases in both default and Moleskine layouts", () => {
    ["TVUS", "transvaginal US", "transvaginal ultrasonography"].forEach((answer) => {
      const defaultResult = evaluateForTheme("modern-academic", answer);
      const moleskineResult = evaluateForTheme("warm-notebook", answer);

      assert.deepEqual(moleskineResult, defaultResult);
      assert.equal(moleskineResult.isCorrect, true, answer);
      assert.ok(["EQUIVALENT", "EXACT"].includes(moleskineResult.classification), answer);
      assert.equal(moleskineResult.canonicalAnswer, "transvaginal ultrasound");
    });
  });

  it("keeps wrong ultrasound answers incorrect in both layouts and builds repair content after submission", () => {
    const defaultResult = evaluateForTheme("modern-academic", "CT scan");
    const moleskineResult = evaluateForTheme("warm-notebook", "CT scan");
    const tutor = buildTutorFor("CT scan");

    assert.deepEqual(moleskineResult, defaultResult);
    assert.equal(moleskineResult.isCorrect, false);
    assert.equal(moleskineResult.classification, "INCORRECT");
    assert.equal(tutor.repair.correctAnswer, "transvaginal ultrasound");
    assert.match(tutor.repair.why, /CT scan|transvaginal ultrasound|Suspected placenta previa/i);
    assert.doesNotMatch(tutor.repair.why, /^Correct\.$/i);
  });

  it("keeps the Moleskine adapter on the canonical answer state and submit path", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const moleskineRenderer = readFileSync("components/moleskine/MoleskinePracticeRenderer.tsx", "utf8");
    const hook = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(practicePanel, /<MoleskinePracticeRenderer/);
    assert.match(practicePanel, /answer=\{answer\}/);
    assert.match(practicePanel, /onAnswerChange=\{setAnswer\}/);
    assert.match(practicePanel, /onSubmit=\{onSubmit\}/);
    assert.match(moleskineRenderer, /<form onSubmit=\{onSubmit\} className="rr-answer-dock rr-moleskine-solve-form rr-notebook-answer-form">/);
    assert.match(moleskineRenderer, /value=\{answer\}/);
    assert.match(moleskineRenderer, /onChange=\{\(event\) => onAnswerChange\(event\.target\.value\)\}/);
    assert.match(moleskineRenderer, /\{isSubmitting \? "Checking" : "Submit"\}/);
    assert.match(hook, /body:\s*JSON\.stringify\(\{[\s\S]*answer,[\s\S]*responseTimeMs:/);
    assert.doesNotMatch(practicePanel, /evaluateAnswer|compareAnswer|isCorrect\s*=/);
    assert.doesNotMatch(moleskineRenderer, /evaluateAnswer|compareAnswer|isCorrect\s*=/);
  });

  it("does not route correct submissions into automatic repair mode", () => {
    const practiceSession = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(practiceSession, /if \(data\.tutor && !data\.isCorrect\)/);
    assert.match(practiceSession, /setTutor\(null\);[\s\S]*setMode\("rapid"\);/);
  });

  it("keeps Moleskine solve state quiet before submission", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const moleskineRenderer = readFileSync("components/moleskine/MoleskinePracticeRenderer.tsx", "utf8");

    assert.match(practicePanel, /if \(skin === "warm-notebook"\)/);
    assert.match(practicePanel, /notebook=\{clinicalNotebook\}/);
    assert.match(moleskineRenderer, /notebook\.state === "question"/);
    assert.match(moleskineRenderer, /rr-notebook-quiet-page/);
    assert.match(moleskineRenderer, /Answer first\. The reasoning will unfold here\./);
    assert.match(moleskineRenderer, /rr-clinical-notebook-spread-question/);
    assert.doesNotMatch(practicePanel, /moleskineLeftPageContent/);
  });

  it("keeps Moleskine learn state inside one left page and the right teaching document conditional", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const moleskineRenderer = readFileSync("components/moleskine/MoleskinePracticeRenderer.tsx", "utf8");
    const notebookViewModel = readFileSync("lib/clinical-notebook-view-model.ts", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");

    assert.match(practicePanel, /buildClinicalNotebookViewModel/);
    assert.match(moleskineRenderer, /rr-notebook-left-page/);
    assert.match(moleskineRenderer, /<NotebookReasoning notebook=\{notebook\} \/>/);
    assert.match(moleskineRenderer, /<NotebookRightPage notebook=\{notebook\} \/>/);
    assert.match(moleskineRenderer, /rr-notebook-teach-more/);
    assert.match(notebookViewModel, /rightPage:\s*hasAnswered/);
    assert.match(notebookViewModel, /annotations = hasAnswered/);
    assert.doesNotMatch(styles, /display:\s*contents/);
    assert.doesNotMatch(styles, /grid-row:\s*3/);
  });

  it("keeps ultrasound aliases in the seeded placenta previa evaluation item", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");

    assert.match(seed, /topic: "Placenta previa evaluation"/);
    assert.match(seed, /"transvaginal ultrasound"/);
    assert.match(seed, /"TVUS"/);
    assert.match(seed, /"transvaginal US"/);
    assert.match(seed, /"transvaginal ultrasonography"/);
  });
});
