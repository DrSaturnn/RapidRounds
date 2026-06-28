import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("continuous educational workspace", () => {
  it("keeps the question card above the post-answer learning workspace", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");

    assert.match(practicePanel, /rr-question-card/);
    assert.match(practicePanel, /rr-practice-main-wide/);

    assert.ok(practicePanel.indexOf("<MoleskineLeftPage") < practicePanel.indexOf("<TutorMode"));
    assert.ok(practicePanel.indexOf("rr-question-card-compact") < practicePanel.lastIndexOf("<TutorMode"));
  });

  it("lays out repair, pattern teaching, and next challenge as one continuous workspace", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");

    assert.match(tutorMode, /rr-post-answer-workspace/);
    assert.match(tutorMode, /rr-post-answer-repair/);
    assert.match(tutorMode, /rr-post-answer-depth/);
    assert.match(tutorMode, /rr-post-answer-next/);
    assert.match(styles, /\.rr-post-answer-workspace\s*\{\s*@apply grid gap-4;/);
    assert.doesNotMatch(styles, /grid-template-areas:\s*"repair depth"\s*"next depth"/);
  });

  it("keeps source order as repair, teaching depth, then next challenge", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const repairIndex = tutorMode.indexOf("rr-post-answer-repair");
    const nextIndex = tutorMode.indexOf("rr-post-answer-next");
    const depthIndex = tutorMode.indexOf("rr-post-answer-depth");

    assert.ok(repairIndex > -1);
    assert.ok(depthIndex > repairIndex);
    assert.ok(nextIndex > depthIndex);
  });

  it("removes redundant go-deeper prompt now that teaching depth is integrated", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.doesNotMatch(tutorMode, /Go deeper/);
    assert.doesNotMatch(tutorMode, /Open Teach me more/);
  });
});
