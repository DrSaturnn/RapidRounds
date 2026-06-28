import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("decision repair information hierarchy", () => {
  it("renders pivot clue and correct action before the explanation", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const headingIndex = tutorMode.indexOf("Repair this decision");
    const pivotClueIndex = tutorMode.indexOf("Pivot clue", headingIndex);
    const correctActionIndex = tutorMode.indexOf("Correct action", headingIndex);
    const explanationIndex = tutorMode.indexOf("tutor.repair.why", headingIndex);

    assert.ok(headingIndex > -1);
    assert.ok(pivotClueIndex > headingIndex);
    assert.ok(correctActionIndex > headingIndex);
    assert.ok(explanationIndex > correctActionIndex);
    assert.ok(explanationIndex > pivotClueIndex);
  });

  it("places the correct action and pivot clue on the same compact row", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /sm:grid-cols-2/);
    assert.match(tutorMode, /space-y-3/);
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
