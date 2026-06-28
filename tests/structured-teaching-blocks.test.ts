import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("structured teaching blocks", () => {
  it("renders Teach Me More as selected structured blocks", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /function TeachingBlock/);
    assert.match(tutorMode, /rr-teaching-blocks/);
    assert.match(tutorMode, /Illness script/);
    assert.match(tutorMode, /Typical patient/);
    assert.match(tutorMode, /Retrieval target/);
    assert.match(tutorMode, /Recognition goal/);
    assert.match(tutorMode, /Expert recognition/);
    assert.match(tutorMode, /Don't confuse with/);
    assert.match(tutorMode, /Memory hook/);
    assert.match(tutorMode, /NBME pivot/);
    assert.match(tutorMode, /Why this was tempting/);
    assert.match(tutorMode, /Board pearl/);
  });

  it("keeps irrelevant modules gated by the teaching plan", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /modules\.retrieval && tutor\.teachingPlan\.retrieval/);
    assert.match(tutorMode, /modules\.contraindication && tutor\.teachingPlan\.contraindication/);
    assert.match(tutorMode, /modules\.illnessScript/);
    assert.match(tutorMode, /modules\.expertRecognition/);
    assert.match(tutorMode, /hasComparison/);
    assert.match(tutorMode, /modules\.nbmePivot/);
    assert.match(tutorMode, /modules\.whyTempting && tutor\.whyTempting/);
  });

  it("deduplicates recognition path steps before rendering", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /const steps = dedupeDisplayStrings/);
    assert.match(tutorMode, /rr-path-step/);
    assert.match(tutorMode, /rr-path-terminal/);
  });

  it("keeps Teach Me More as a real collapsed section", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /hasTeachingContent/);
    assert.match(tutorMode, /<TeachingCard title="Teach Me More" defaultOpen=\{false\}>/);
    assert.doesNotMatch(tutorMode, /defaultOpen="desktop"/);
  });

  it("styles structured blocks and visual recognition pathways", () => {
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(css, /rr-teaching-block/);
    assert.match(css, /rr-teaching-block-recognition/);
    assert.match(css, /rr-teaching-block-comparison/);
    assert.match(css, /rr-teaching-block-pivot/);
    assert.match(css, /content: "→"/);
    assert.match(css, /content: "↓"/);
  });
});
