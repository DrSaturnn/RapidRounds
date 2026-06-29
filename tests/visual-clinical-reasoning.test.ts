import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("visual clinical reasoning renderer", () => {
  it("renders the post-answer teaching model from semantic tutor fields", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /function PostAnswerTeachingModel/);
    assert.match(tutorMode, /tutor\.postAnswerTeaching/);
    assert.match(tutorMode, /learnerAnswerSchema/);
    assert.match(tutorMode, /semanticLinks/);
    assert.match(tutorMode, /intendedDiscriminatorPair/);
    assert.match(tutorMode, /Clinical Resolution/);
    assert.match(tutorMode, /Next-time rule/);
    assert.doesNotMatch(tutorMode, /semanticLinks\s*=\s*\[/);
  });

  it("suppresses redundant recognition bullets when the visual flow is shown", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.doesNotMatch(tutorMode, /Recognition path/);
    assert.doesNotMatch(tutorMode, /visibleRecognitionClues\.map/);
    assert.doesNotMatch(tutorMode, /list-disc/);
  });

  it("keeps the pivot as the primary teaching event", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /rr-dominant-pivot/);
    assert.match(tutorMode, /Pivot/);
    assert.match(tutorMode, /teaching\.pivotClue/);
    assert.doesNotMatch(tutorMode, /<p className="rr-meta">Expert reasoning<\/p>/);
  });

  it("styles the schema-first teaching pathway", () => {
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(css, /rr-schema-arrow-chain/);
    assert.match(css, /rr-dominant-pivot/);
    assert.match(css, /rr-semantic-bridge/);
    assert.match(css, /rr-decision-boundary-model/);
    assert.match(css, /rr-explanation-notebook/);
    assert.match(css, /max-width: 78rem/);
  });
});
