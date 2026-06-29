import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { selectAdaptiveGeneratedCase, type SchemaProgressEvent } from "@/lib/adaptive-schema-scheduler";
import { getGeneratedCasesForSubject } from "@/lib/seed-case-generator";

const baseTime = Date.parse("2026-06-29T12:00:00.000Z");

function event(questionId: string, overrides: Partial<SchemaProgressEvent> = {}): SchemaProgressEvent {
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

describe("clinical cues and assistance-based mastery", () => {
  it("keeps empty submit in pre-answer state without activating Tutor or grading", () => {
    const session = readFileSync("hooks/usePracticeSession.ts", "utf8");
    const route = readFileSync("app/api/practice/answer/route.ts", "utf8");

    assert.match(session, /if \(!trimmedAnswer\)/);
    assert.match(session, /setClinicalCuePrompt\("Enter an answer, or use a clinical cue\."\)/);
    assert.doesNotMatch(session, /answer:\s*"Not answered yet"/);
    assert.match(route, /if \(!trimmedAnswer && !body\.revealUsed\)/);
    assert.match(route, /needsAnswer: true/);
  });

  it("renders staged clinical cues without clinical resolution before reveal", () => {
    const panel = readFileSync("components/PracticePanel.tsx", "utf8");

    assert.match(panel, /Cue 1 · Pivot only/);
    assert.match(panel, /Cue 2 · Schema scaffold/);
    assert.match(panel, /Cue 3 · Decision boundary/);
    assert.match(panel, /clinicalCueLevel >= 3/);
    assert.match(panel, /revealAnswer/);
  });

  it("persists assistance fields and reveal outcomes on Progress", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const route = readFileSync("app/api/practice/answer/route.ts", "utf8");

    assert.match(schema, /cueLevelUsed\s+String\?/);
    assert.match(schema, /levelOfAssistanceRequired String\?/);
    assert.match(schema, /answeredAfterCue Boolean @default\(false\)/);
    assert.match(schema, /revealUsed\s+Boolean @default\(false\)/);
    assert.match(schema, /schemaNodeId\s+String\?/);
    assert.match(schema, /competency\s+String\?/);
    assert.match(route, /REVEALED_WITHOUT_ATTEMPT/);
    assert.match(route, /levelOfAssistanceRequired: assistanceLevel/);
  });

  it("does not treat cue-assisted correct answers as independent competency mastery", () => {
    const cases = getGeneratedCasesForSubject("Psychiatry", "comprehensive").filter((candidate) => candidate.topic === "MDD");
    const recognitionCase = cases.find((candidate) => candidate.schemaNode?.nodeKind === "diagnosis");
    const laterRecognitionCase = cases.find(
      (candidate) => candidate.schemaNode?.nodeKind === "diagnosis" && candidate.id !== recognitionCase?.id
    );
    const managementCases = cases.filter((candidate) => candidate.schemaNode?.nodeKind === "management");

    assert.ok(recognitionCase);
    assert.ok(laterRecognitionCase);
    assert.ok(managementCases.length > 0);

    const selected = selectAdaptiveGeneratedCase([recognitionCase, laterRecognitionCase, ...managementCases], [
      event(recognitionCase.id, {
        diagnosis: "MDD",
        levelOfAssistanceRequired: "pivot_cue",
        createdAt: new Date(baseTime)
      })
    ]);

    assert.ok(selected.case);
    assert.equal(selected.case.schemaNode?.nodeKind, "diagnosis");
  });

  it("uses reveal events for review rather than mastery advancement", () => {
    const cases = getGeneratedCasesForSubject("OB/GYN", "comprehensive");
    const revealedCase = cases.find((candidate) => candidate.schemaNode?.nodeKind === "management");

    assert.ok(revealedCase);

    const selected = selectAdaptiveGeneratedCase(cases, [
      event(revealedCase.id, {
        diagnosis: revealedCase.topic,
        isCorrect: false,
        answerOutcome: "REVEALED_WITHOUT_ATTEMPT",
        levelOfAssistanceRequired: "revealed_without_attempt",
        revealUsed: true,
        createdAt: new Date(baseTime)
      })
    ]);

    assert.ok(selected.case);
    assert.notEqual(selected.case.id, revealedCase.id);
    assert.equal(selected.case.schemaNode?.nodeKind === "diagnosis" || selected.case.schemaNode?.nodeKind === "recognition", true);
  });
});
