import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("decision repair information hierarchy", () => {
  it("renders the visual reasoning flow before optional prose", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const headingIndex = tutorMode.indexOf("Build the pattern");
    const flowIndex = tutorMode.indexOf("<ClinicalReasoningFlow", headingIndex);
    const whatMatteredIndex = tutorMode.indexOf("What mattered", headingIndex);
    const rememberIndex = tutorMode.indexOf("What to remember", headingIndex);

    assert.ok(headingIndex > -1);
    assert.ok(flowIndex > headingIndex);
    assert.ok(whatMatteredIndex > flowIndex);
    assert.ok(rememberIndex > flowIndex);
  });

  it("combines pattern, pivot, task, and answer into one compact flow", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /function ClinicalReasoningFlow/);
    assert.match(tutorMode, /Clinical pattern/);
    assert.match(tutorMode, /Pivot clue/);
    assert.match(tutorMode, /Decision/);
    assert.match(tutorMode, /Correct answer/);
    assert.match(tutorMode, /border-t border-rr-soft-line pt-3/);
    assert.doesNotMatch(tutorMode, /rr-card rr-card-section space-y-3">\s*<p className="text-sm font-medium leading-6">\{tutor\.reinforcement\.question\}/);
  });

  it("removes analytics-style labels from the visible repair panel", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.doesNotMatch(tutorMode, /Cognitive Error/);
    assert.doesNotMatch(tutorMode, /Management Error/);
    assert.doesNotMatch(tutorMode, /Knowledge Gap/);
    assert.doesNotMatch(tutorMode, /Pattern Error/);
    assert.doesNotMatch(tutorMode, /rr-badge-repair/);
  });
});
