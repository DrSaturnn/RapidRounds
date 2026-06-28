import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildReasoningMemoryCoaching } from "@/lib/reasoning-memory";
import type { TutorContent } from "@/types/practice";

const baseTutor = {
  repair: {
    style: "INCORRECT",
    correctAnswer: "gestational hypertension",
    clue: "No proteinuria or severe features",
    why: "The pivot clue supports gestational hypertension.",
    fingerprint: "Hypertension after 20 weeks without severe features is gestational hypertension."
  },
  reasoningAnalysis: {
    primaryError: "Premature Closure",
    confidence: "High",
    whyAttractive: "Preeclampsia overlaps with hypertension after 20 weeks.",
    whyIncorrect: "The pivot is absence of proteinuria.",
    adaptiveFocus: "Compare the closest competing diagnoses."
  },
  cognitiveError: {
    type: "Premature Closure",
    whyAttractive: "Preeclampsia was attractive because the first pattern looked familiar.",
    missedClue: "The reasoning should have stopped at no proteinuria or severe features.",
    expertCorrection: "Experts confirm the required finding before closing on the familiar diagnosis."
  },
  teachingPlan: {
    repairType: "GENERIC_REPAIR",
    modules: {
      illnessScript: true,
      expertRecognition: false,
      expertCorrection: false,
      comparison: false,
      nbmePivot: true,
      whyTempting: false,
      retrieval: false,
      contraindication: false
    }
  },
  correctAnswer: "gestational hypertension",
  whyIncorrect: {
    userAnswer: "preeclampsia",
    pivotClue: "No proteinuria or severe features"
  },
  illnessScript: {
    typicalPatient: "Pregnant patient",
    classicPresentation: "Hypertension after 20 weeks without proteinuria or severe features.",
    buzzwords: ["gestational hypertension"]
  },
  managementPearl: "Monitor closely.",
  comparison: {
    correctDiagnosis: "Gestational hypertension",
    competingDiagnosis: "Preeclampsia",
    rows: []
  }
} satisfies TutorContent;

describe("reasoning memory surfacing", () => {
  it("detects repeated cognitive reasoning patterns after prior same-learner misses", () => {
    const coaching = buildReasoningMemoryCoaching(baseTutor, "DECISION_ERROR", [
      {
        cognitiveErrorType: "Premature Closure",
        reasoningPattern: "Distractor Error",
        answerOutcome: "DECISION_ERROR"
      }
    ]);

    assert.ok(coaching);
    assert.match(coaching.message, /stopped one step too early/i);
    assert.equal(coaching.supportingPattern, "Premature Closure");
  });

  it("does not surface a pattern message with insufficient history", () => {
    const coaching = buildReasoningMemoryCoaching(baseTutor, "DECISION_ERROR", [
      {
        cognitiveErrorType: "Missed Pivot Clue",
        reasoningPattern: "Missed Pivot Clue",
        answerOutcome: "DECISION_ERROR"
      }
    ]);

    assert.equal(coaching, undefined);
  });

  it("does not surface coaching for correct or unknown answers", () => {
    const priorAttempts = [
      {
        cognitiveErrorType: "Premature Closure",
        reasoningPattern: "Premature Closure",
        answerOutcome: "DECISION_ERROR"
      }
    ];

    assert.equal(buildReasoningMemoryCoaching(baseTutor, "CORRECT", priorAttempts), undefined);
    assert.equal(buildReasoningMemoryCoaching(baseTutor, "UNKNOWN", priorAttempts), undefined);
  });

  it("keeps learner-specific memory scoped to the anonymous learner id", () => {
    const route = readFileSync("app/api/practice/answer/route.ts", "utf8");

    assert.match(route, /loadPriorReasoningAttempts\(learnerId, answerOutcome\)/);
    assert.match(route, /where: \{\s*userId: learnerId,\s*isCorrect: false,\s*answerOutcome: \{ not: "UNKNOWN" \}/);
    assert.doesNotMatch(route, /userId: "default"/);
  });

  it("renders learner-facing coaching without exposing raw cognitive labels", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /Pattern to watch/);
    assert.match(tutorMode, /tutor\.coaching\.message/);
    assert.doesNotMatch(tutorMode, /supportingPattern/);
    assert.doesNotMatch(tutorMode, /Cognitive Error/);
  });
});
