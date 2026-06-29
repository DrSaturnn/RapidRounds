import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { selectAdaptiveGeneratedCase, type SchemaProgressEvent } from "@/lib/adaptive-schema-scheduler";
import { getGeneratedCasesForSubject } from "@/lib/seed-case-generator";

const baseTime = Date.parse("2026-06-29T12:00:00.000Z");

function progress(questionId: string, overrides: Partial<SchemaProgressEvent> = {}): SchemaProgressEvent {
  return {
    questionId,
    diagnosis: "MDD",
    decisionType: "Diagnosis",
    isCorrect: true,
    answerOutcome: "CORRECT",
    createdAt: new Date(baseTime),
    ...overrides
  };
}

describe("adaptive schema scheduler", () => {
  it("does not keep selecting MDD after extensive completed MDD work when other psychiatry schemas are available", () => {
    const cases = getGeneratedCasesForSubject("Psychiatry", "comprehensive");
    const mddCases = cases.filter((candidate) => candidate.topic === "MDD");
    const simulatedHistory = Array.from({ length: 70 }, (_, index) =>
      progress(mddCases[index % mddCases.length].id, {
        diagnosis: "MDD",
        createdAt: new Date(baseTime + index * 1000)
      })
    );

    const selected = selectAdaptiveGeneratedCase(cases, simulatedHistory, { mode: "adaptive" });

    assert.ok(selected.case);
    assert.notEqual(selected.case.topic, "MDD");
    assert.match(selected.explanation, /reasoning competency|spacing recent schemas|Selected/i);
  });

  it("uses recognition mastery to unlock the next available competency for the same schema topic", () => {
    const cases = getGeneratedCasesForSubject("Psychiatry", "comprehensive").filter((candidate) => candidate.topic === "MDD");
    const recognitionCase = cases.find((candidate) => candidate.schemaNode?.nodeKind === "diagnosis");
    const managementCases = cases.filter((candidate) => candidate.schemaNode?.nodeKind === "management");

    assert.ok(recognitionCase);
    assert.ok(managementCases.length > 0);

    const selected = selectAdaptiveGeneratedCase([recognitionCase, ...managementCases], [
      progress(recognitionCase.id, {
        diagnosis: "MDD",
        decisionType: "Diagnosis",
        isCorrect: true,
        createdAt: new Date(baseTime)
      })
    ]);

    assert.ok(selected.case);
    assert.equal(selected.case.schemaNode?.nodeKind, "management");
    assert.match(selected.explanation, /after recognition mastery/i);
  });

  it("avoids the same SchemaNode consecutively unless no alternative exists", () => {
    const cases = getGeneratedCasesForSubject("OB/GYN", "primary");
    const recentCase = cases[0];
    const sameNodeCases = cases.filter((candidate) => candidate.schemaNode?.id === recentCase.schemaNode?.id);

    assert.ok(recentCase.schemaNode?.id);
    assert.ok(sameNodeCases.length > 1);

    const selected = selectAdaptiveGeneratedCase(cases, [
      progress(recentCase.id, {
        diagnosis: recentCase.topic,
        decisionType: recentCase.question.decisionType,
        isCorrect: true,
        createdAt: new Date(baseTime)
      })
    ]);

    assert.ok(selected.case);
    assert.notEqual(selected.case.schemaNode?.id, recentCase.schemaNode.id);
  });

  it("integrates generated-case scheduler and persists generated question ids in the practice APIs", () => {
    const nextRoute = readFileSync("app/api/questions/next/route.ts", "utf8");
    const answerRoute = readFileSync("app/api/practice/answer/route.ts", "utf8");

    assert.match(nextRoute, /selectAdaptiveGeneratedCase/);
    assert.match(nextRoute, /mode: requestedSessionMode/);
    assert.match(nextRoute, /requestedConcept/);
    assert.match(nextRoute, /generatedSelection\.explanation/);
    assert.match(answerRoute, /questionId: generatedCase\.id/);
  });
});
