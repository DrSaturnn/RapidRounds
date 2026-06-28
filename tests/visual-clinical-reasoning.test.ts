import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("visual clinical reasoning renderer", () => {
  it("renders the repair flow from existing tutor metadata", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /const visualFlowSteps = dedupeDisplayStrings/);
    assert.match(tutorMode, /visibleRecognitionClues\[0\]/);
    assert.match(tutorMode, /tutor\.repair\.clue/);
    assert.match(tutorMode, /getDecisionTaskLabel\(tutor\)/);
    assert.match(tutorMode, /tutor\.repair\.correctAnswer/);
    assert.match(tutorMode, /<ClinicalReasoningFlow steps=\{visualFlowSteps\} \/>/);
  });

  it("suppresses redundant recognition bullets when the visual flow is shown", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.doesNotMatch(tutorMode, /Recognition path/);
    assert.doesNotMatch(tutorMode, /visibleRecognitionClues\.map/);
    assert.doesNotMatch(tutorMode, /list-disc/);
  });

  it("shortens expert reasoning into an optional memory line", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /function getCompactReasoning/);
    assert.match(tutorMode, /compactReasoning/);
    assert.match(tutorMode, /What to remember/);
    assert.doesNotMatch(tutorMode, /<p className="rr-meta">Expert reasoning<\/p>/);
  });

  it("styles the flow as a clinical decision pathway", () => {
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(css, /rr-clinical-flow/);
    assert.match(css, /rr-clinical-flow-pivot/);
    assert.match(css, /rr-clinical-flow-terminal/);
    assert.match(css, /content: "↓"/);
    assert.match(css, /max-width: 90rem/);
  });
});
