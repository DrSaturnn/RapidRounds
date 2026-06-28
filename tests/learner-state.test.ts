import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { summarizeLearnerProgress } from "@/lib/learner-state";

const baseTime = Date.parse("2026-06-28T12:00:00.000Z");

function event(overrides: Partial<Parameters<typeof summarizeLearnerProgress>[1][number]> = {}) {
  return {
    userId: "anon_learner123",
    clinicalDecisionId: "decision-a",
    questionId: null,
    diagnosis: "Placenta previa",
    isCorrect: false,
    answerOutcome: "DECISION_ERROR",
    confidence: 0.4,
    cognitiveErrorType: "Premature Closure",
    reasoningPattern: "Missed Pivot Clue",
    decisionType: "Diagnosis",
    curriculumNodeId: "placenta-previa",
    shelfTags: JSON.stringify(["OB/GYN", "Emergency Medicine"]),
    disciplineTags: JSON.stringify(["obstetrics", "emergency medicine"]),
    createdAt: new Date(baseTime),
    ...overrides
  };
}

describe("read-only learner state service", () => {
  it("computes learner state from Progress-shaped events", () => {
    const state = summarizeLearnerProgress("anon_learner123", [
      event({ clinicalDecisionId: "decision-a", createdAt: new Date(baseTime + 3000) }),
      event({
        clinicalDecisionId: "decision-b",
        diagnosis: "Placental abruption",
        isCorrect: true,
        answerOutcome: "CORRECT",
        confidence: 0.9,
        reasoningPattern: null,
        cognitiveErrorType: null,
        curriculumNodeId: "placental-abruption",
        createdAt: new Date(baseTime + 2000)
      }),
      event({
        clinicalDecisionId: "decision-c",
        diagnosis: "Placenta previa",
        createdAt: new Date(baseTime + 1000)
      })
    ]);

    assert.equal(state.totalAttempts, 3);
    assert.deepEqual(state.completedClinicalDecisionIds.sort(), ["decision-a", "decision-b", "decision-c"]);
    assert.equal(state.attemptsByConcept.find((concept) => concept.concept === "Placenta previa")?.attempts, 2);
    assert.equal(state.attemptsByDecisionType[0].decisionType, "Diagnosis");
    assert.equal(state.curriculumNodeSummaries.length, 2);
  });

  it("scopes summaries by anonymous learner id", () => {
    const state = summarizeLearnerProgress("anon_learner123", [
      event({ diagnosis: "Placenta previa" }),
      event({
        userId: "anon_other999",
        clinicalDecisionId: "other-decision",
        diagnosis: "Eclampsia",
        cognitiveErrorType: "Knowledge Gap",
        reasoningPattern: "Knowledge Gap"
      })
    ]);

    assert.equal(state.totalAttempts, 1);
    assert.equal(state.completedClinicalDecisionIds.includes("other-decision"), false);
    assert.equal(state.attemptsByConcept.some((concept) => concept.concept === "Eclampsia"), false);
  });

  it("identifies repeated reasoning patterns and cognitive error summaries", () => {
    const state = summarizeLearnerProgress("anon_learner123", [
      event({ createdAt: new Date(baseTime + 3000) }),
      event({ clinicalDecisionId: "decision-b", createdAt: new Date(baseTime + 2000) }),
      event({
        clinicalDecisionId: "decision-c",
        reasoningPattern: "Management Sequencing Error",
        cognitiveErrorType: "Management Error",
        createdAt: new Date(baseTime + 1000)
      })
    ]);

    assert.deepEqual(state.repeatedReasoningPatterns, [{ pattern: "Missed Pivot Clue", count: 2 }]);
    assert.equal(state.cognitiveErrorSummaries.find((summary) => summary.type === "Premature Closure")?.count, 2);
    assert.equal(state.recentReasoningAttempts.length, 3);
  });

  it("returns recent misses and last-seen timestamps", () => {
    const state = summarizeLearnerProgress("anon_learner123", [
      event({ diagnosis: "Placenta previa", createdAt: new Date(baseTime + 5000) }),
      event({
        diagnosis: "Gestational hypertension",
        isCorrect: true,
        answerOutcome: "CORRECT",
        createdAt: new Date(baseTime + 1000)
      })
    ]);

    assert.equal(state.recentMisses.length, 1);
    assert.equal(state.recentMisses[0].concept, "Placenta previa");
    assert.equal(
      state.lastSeenByConcept.find((concept) => concept.concept === "Placenta previa")?.lastSeenAt,
      new Date(baseTime + 5000).toISOString()
    );
  });

  it("computes confidence, shelf, discipline, and provisional mastery summaries", () => {
    const state = summarizeLearnerProgress("anon_learner123", [
      event({ isCorrect: true, answerOutcome: "CORRECT", confidence: 0.8 }),
      event({ clinicalDecisionId: "decision-b", isCorrect: true, answerOutcome: "CORRECT", confidence: 0.9 }),
      event({ clinicalDecisionId: "decision-c", isCorrect: false, confidence: 0.4 })
    ]);

    assert.equal(state.confidenceSummaries[0].averageConfidence, 0.7);
    assert.equal(state.shelfTagSummaries.find((summary) => summary.tag === "OB/GYN")?.attempts, 3);
    assert.equal(state.disciplineTagSummaries.find((summary) => summary.tag === "obstetrics")?.attempts, 3);
    assert.equal(state.attemptsByConcept[0].mastery, "developing");
  });

  it("returns no state for invalid or different learner identifiers", () => {
    const invalid = summarizeLearnerProgress("default", [event()]);
    const other = summarizeLearnerProgress("anon_other999", [event()]);

    assert.equal(invalid.totalAttempts, 0);
    assert.equal(other.totalAttempts, 0);
  });

  it("uses the read-only learner state service for reasoning coaching without owning persistence", () => {
    const route = readFileSync("app/api/practice/answer/route.ts", "utf8");
    const service = readFileSync("lib/learner-state.ts", "utf8");

    assert.match(route, /getLearnerState\(learnerId\)/);
    assert.match(route, /learnerState\.recentReasoningAttempts/);
    assert.match(service, /prisma\.progress\.findMany/);
    assert.doesNotMatch(service, /prisma\.progress\.create/);
    assert.doesNotMatch(service, /prisma\.progress\.update/);
    assert.doesNotMatch(service, /prisma\.progress\.delete/);
  });
});
