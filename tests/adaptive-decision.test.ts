import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { selectAdaptiveDecision } from "@/lib/adaptive-decision";
import { summarizeLearnerProgress } from "@/lib/learner-state";

const baseTime = Date.parse("2026-06-28T12:00:00.000Z");

type DecisionOption = Parameters<typeof selectAdaptiveDecision>[1][number];

function decision(overrides: Partial<DecisionOption> = {}): DecisionOption {
  return {
    id: "decision-a",
    specialty: "OB/GYN",
    system: "Postpartum",
    topic: "Uterine atony",
    clinicalPattern: "Postpartum hemorrhage with boggy uterus",
    decisionType: "Diagnosis",
    prompt: "A postpartum patient has heavy bleeding and a boggy uterus.",
    managementPearl: "Uterine massage and oxytocin",
    difficulty: 1,
    tags: JSON.stringify(["postpartum hemorrhage"]),
    createdAt: new Date(baseTime),
    ...overrides
  };
}

function progress(overrides: Partial<Parameters<typeof summarizeLearnerProgress>[1][number]> = {}) {
  return {
    userId: "anon_learner123",
    clinicalDecisionId: "decision-a",
    questionId: null,
    diagnosis: "Uterine atony",
    isCorrect: false,
    answerOutcome: "DECISION_ERROR",
    confidence: 0.4,
    cognitiveErrorType: "Missed Pivot Clue",
    reasoningPattern: "Missed Pivot Clue",
    decisionType: "Diagnosis",
    curriculumNodeId: "uterine-atony",
    shelfTags: JSON.stringify(["OB/GYN"]),
    disciplineTags: JSON.stringify(["obstetrics"]),
    createdAt: new Date(baseTime),
    ...overrides
  };
}

describe("adaptive decision engine v1", () => {
  it("avoids completed decisions when alternatives exist", () => {
    const learnerState = summarizeLearnerProgress("anon_learner123", [
      progress({
        clinicalDecisionId: "decision-a",
        diagnosis: "Unrelated concept",
        isCorrect: true,
        answerOutcome: "CORRECT",
        curriculumNodeId: null
      })
    ]);
    const selected = selectAdaptiveDecision(learnerState, [
      decision({ id: "decision-a" }),
      decision({ id: "decision-b", topic: "Retained placenta", createdAt: new Date(baseTime + 1000) })
    ]);

    assert.equal(selected.decision?.id, "decision-b");
    assert.equal(selected.actionType, "avoid_completed_if_possible");
    assert.match(selected.explanation, /Avoiding completed decision/);
  });

  it("falls back safely for empty learner state", () => {
    const learnerState = summarizeLearnerProgress("anon_learner123", []);
    const selected = selectAdaptiveDecision(learnerState, [
      decision({ id: "later", difficulty: 2, createdAt: new Date(baseTime + 1000) }),
      decision({ id: "first", difficulty: 1 })
    ]);

    assert.equal(selected.decision?.id, "first");
    assert.equal(selected.actionType, "continue_new_decision");
    assert.match(selected.explanation, /learner state is empty/);
  });

  it("uses a recent miss to trigger conservative reinforcement", () => {
    const learnerState = summarizeLearnerProgress("anon_learner123", [
      progress({ diagnosis: "Uterine atony", curriculumNodeId: "uterine-atony" })
    ]);
    const selected = selectAdaptiveDecision(learnerState, [
      decision({ id: "unrelated", topic: "Breast abscess", system: "Breast", clinicalPattern: "Fluctuant breast mass", tags: "[]" }),
      decision({
        id: "related",
        topic: "Initial postpartum hemorrhage management",
        decisionType: "Management",
        clinicalPattern: "Postpartum hemorrhage with uterine atony",
        createdAt: new Date(baseTime + 1000)
      })
    ]);

    assert.equal(selected.decision?.id, "related");
    assert.equal(selected.actionType, "reinforce_recent_miss");
    assert.match(selected.explanation, /Reinforcing recent miss in Uterine atony/);
  });

  it("uses weak concepts to influence selection", () => {
    const learnerState = summarizeLearnerProgress("anon_learner123", [
      progress({ diagnosis: "Placenta previa", curriculumNodeId: "placenta-previa", createdAt: new Date(baseTime + 2000) }),
      progress({ clinicalDecisionId: "decision-b", diagnosis: "Placenta previa", curriculumNodeId: "placenta-previa" })
    ]);
    const selected = selectAdaptiveDecision({ ...learnerState, recentMisses: [] }, [
      decision({ id: "unrelated", topic: "Breast abscess", system: "Breast", clinicalPattern: "Fluctuant breast mass", tags: "[]" }),
      decision({
        id: "previa-eval",
        topic: "Placenta previa evaluation",
        system: "Antepartum bleeding",
        clinicalPattern: "Painless third-trimester bleeding",
        createdAt: new Date(baseTime + 1000)
      })
    ]);

    assert.equal(selected.decision?.id, "previa-eval");
    assert.equal(selected.actionType, "revisit_weak_concept");
    assert.match(selected.explanation, /recent accuracy needs reinforcement/);
  });

  it("uses curriculum relationships when available", () => {
    const learnerState = summarizeLearnerProgress("anon_learner123", [
      progress({
        diagnosis: "Postpartum hemorrhage",
        isCorrect: true,
        answerOutcome: "CORRECT",
        curriculumNodeId: "postpartum-hemorrhage"
      })
    ]);
    const selected = selectAdaptiveDecision(learnerState, [
      decision({ id: "unrelated", topic: "Breast abscess", system: "Breast", clinicalPattern: "Fluctuant breast mass" }),
      decision({ id: "uterine-atony-next", topic: "Uterine atony", createdAt: new Date(baseTime + 1000) })
    ]);

    assert.equal(selected.decision?.id, "uterine-atony-next");
    assert.equal(selected.actionType, "practice_related_decision");
    assert.match(selected.explanation, /curriculum relationship/i);
  });

  it("scopes adaptive selection by anonymous learner id", () => {
    const learnerState = summarizeLearnerProgress("anon_learner123", [
      progress({
        userId: "anon_other999",
        clinicalDecisionId: "decision-a",
        diagnosis: "Uterine atony",
        isCorrect: true,
        answerOutcome: "CORRECT"
      })
    ]);
    const selected = selectAdaptiveDecision(learnerState, [
      decision({ id: "decision-a" }),
      decision({ id: "decision-b", topic: "Retained placenta", difficulty: 2 })
    ]);

    assert.equal(learnerState.totalAttempts, 0);
    assert.equal(selected.decision?.id, "decision-a");
  });

  it("integrates with the next-question route without exposing another learner's progress", () => {
    const route = readFileSync("app/api/questions/next/route.ts", "utf8");
    const service = readFileSync("lib/adaptive-decision.ts", "utf8");

    assert.match(route, /getAdaptiveDecisionRecommendation\(learnerId, requestedConcept, requestedSubject\)/);
    assert.match(route, /adaptiveRecommendation\.actionType/);
    assert.match(service, /getLearnerState\(learnerId\)/);
    assert.match(service, /completedClinicalDecisionIds/);
    assert.doesNotMatch(route, /userId: "default"/);
    assert.doesNotMatch(service, /userId: "default"/);
  });
});
