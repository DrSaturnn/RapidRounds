import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("two-pane educational workspace", () => {
  it("keeps the question card above a dedicated post-answer workspace", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");

    assert.match(practicePanel, /rr-question-card/);
    assert.match(practicePanel, /rr-practice-main-wide/);
    assert.ok(practicePanel.indexOf("rr-question-card") < practicePanel.indexOf("<TutorMode"));
  });

  it("lays out repair, Teach Me More, and next challenge as responsive workspace panes", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");

    assert.match(tutorMode, /rr-post-answer-workspace/);
    assert.match(tutorMode, /rr-post-answer-repair/);
    assert.match(tutorMode, /rr-post-answer-depth/);
    assert.match(tutorMode, /rr-post-answer-next/);
    assert.match(styles, /grid-template-areas:\s*"repair depth"\s*"next depth"/);
    assert.match(styles, /@media \(min-width: 1024px\)/);
  });

  it("keeps mobile source order as repair, next challenge, then Teach Me More", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const repairIndex = tutorMode.indexOf("rr-post-answer-repair");
    const nextIndex = tutorMode.indexOf("rr-post-answer-next");
    const depthIndex = tutorMode.indexOf("rr-post-answer-depth");

    assert.ok(repairIndex > -1);
    assert.ok(nextIndex > repairIndex);
    assert.ok(depthIndex > nextIndex);
  });

  it("removes redundant go-deeper prompt now that Teach Me More is beside repair", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.doesNotMatch(tutorMode, /Go deeper/);
    assert.doesNotMatch(tutorMode, /Open Teach me more/);
  });
});
