import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("decision repair information hierarchy", () => {
  it("renders learner schema before pivot, bridge, discriminator, and resolution", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const headingIndex = tutorMode.indexOf("Build the pattern");
    const schemaIndex = tutorMode.indexOf("<SchemaArrowChain", headingIndex);
    const pivotIndex = tutorMode.indexOf("rr-dominant-pivot", headingIndex);
    const bridgeIndex = tutorMode.indexOf("<SemanticBridge", headingIndex);
    const tableIndex = tutorMode.indexOf("<DecisionBoundaryTable", headingIndex);
    const resolutionIndex = tutorMode.indexOf("Clinical Resolution", headingIndex);

    assert.ok(headingIndex > -1);
    assert.ok(schemaIndex > headingIndex);
    assert.ok(pivotIndex > schemaIndex);
    assert.ok(bridgeIndex > pivotIndex);
    assert.ok(tableIndex > bridgeIndex);
    assert.ok(resolutionIndex > tableIndex);
  });

  it("renames the answer reveal to clinical resolution", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /Clinical Resolution/);
    assert.match(tutorMode, /clinicalResolution/);
    assert.match(tutorMode, /Next-time rule/);
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
