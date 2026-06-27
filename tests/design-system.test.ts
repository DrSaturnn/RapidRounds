import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("design system", () => {
  it("defines reusable RapidRounds visual language classes", () => {
    const css = readFileSync("app/globals.css", "utf8");

    [
      ".rr-page-title",
      ".rr-question-stem",
      ".rr-card",
      ".rr-button-primary",
      ".rr-button-secondary",
      ".rr-badge-repair",
      ".rr-table",
      ".rr-path",
      ".rr-chip",
      ".rr-empty",
      ".rr-loading"
    ].forEach((className) => assert.match(css, new RegExp(className.replace(".", "\\."))));
  });

  it("uses design-system classes for core reusable components", () => {
    const button = readFileSync("components/Button.tsx", "utf8");
    const teachingCard = readFileSync("components/TeachingCard.tsx", "utf8");
    const emptyState = readFileSync("components/EmptyState.tsx", "utf8");
    const metric = readFileSync("components/Metric.tsx", "utf8");

    assert.match(button, /rr-button/);
    assert.match(teachingCard, /rr-card/);
    assert.match(emptyState, /rr-empty/);
    assert.match(metric, /rr-card/);
  });

  it("styles educational sections with recognizable visual treatments", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /rr-path/);
    assert.match(tutorMode, /rr-table/);
    assert.match(tutorMode, /rr-callout-pivot/);
    assert.match(tutorMode, /rr-chip/);
  });
});
