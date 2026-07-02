import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("continuous educational workspace", () => {
  it("keeps the question card above the post-answer learning workspace", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const moleskineRenderer = readFileSync("components/moleskine/MoleskinePracticeRenderer.tsx", "utf8");

    assert.match(practicePanel, /rr-question-card/);
    assert.match(practicePanel, /rr-practice-main-wide/);

    assert.match(practicePanel, /<MoleskinePracticeRenderer/);
    assert.match(moleskineRenderer, /rr-notebook-left-page/);
    assert.match(moleskineRenderer, /<NotebookRightPage notebook=\{notebook\} \/>/);
    assert.ok(practicePanel.indexOf("rr-question-card-compact") < practicePanel.lastIndexOf("<TutorMode"));
  });

  it("uses patient and clinical reasoning panes for the standard desktop practice layout", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");

    assert.match(practicePanel, /rr-standard-workspace-root/);
    assert.match(practicePanel, /rr-clinical-workspace-main/);
    assert.match(practicePanel, /rr-patient-workspace rr-clinical-patient-pane/);
    assert.match(practicePanel, /rr-reasoning-workspace rr-clinical-reasoning-pane/);
    assert.match(styles, /\.rr-standard-workspace-root[\s\S]*height: 100dvh/);
    assert.match(styles, /\.rr-standard-workspace-root \.rr-clinical-workspace-grid[\s\S]*grid-template-columns: minmax\(0, 1\.35fr\) minmax\(24rem, 1fr\)/);
    assert.match(styles, /\.rr-standard-workspace-root \.rr-clinical-patient-pane,\s*\n\s*\.rr-standard-workspace-root \.rr-clinical-reasoning-pane[\s\S]*overflow-y: auto/);
  });

  it("renders the standard pre-answer vignette as unannotated recognition clue lines", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");

    assert.match(practicePanel, /result \? \(/);
    assert.match(practicePanel, /<RecognitionChallenge\s+stem=\{clinicalPrompt\}\s+question=\{getRecognitionQuestionPrompt\(\)\}/);
    assert.match(practicePanel, /findings=\{visibleVignetteFindings\}[\s\S]*annotated/);
    assert.match(practicePanel, /function getRecognitionQuestionPrompt\(\)[\s\S]*Which diagnosis best fits this clinical pattern\?/);
    assert.match(styles, /\.rr-recognition-clues[\s\S]*gap: clamp\(0\.55rem, 1vw, 0\.85rem\)/);
    assert.match(styles, /\.rr-recognition-clue-line[\s\S]*font-size: clamp\(1\.02rem, 1\.6vw, 1\.28rem\)/);
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
