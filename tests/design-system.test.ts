import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("design system", () => {
  it("defines reusable RapidRounds visual language classes", () => {
    const css = readFileSync("app/globals.css", "utf8");

    [
      ".rr-card-soft",
      ".rr-card-paper",
      ".rr-card-clinical",
      ".rr-panel",
      ".rr-panel-collapsed",
      ".rr-explanation-card",
      ".rr-vignette-card",
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

  it("defines semantic color tokens for the v1 product language", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tailwind = readFileSync("tailwind.config.ts", "utf8");

    [
      "--rr-color-background",
      "--rr-color-surface",
      "--rr-color-surface-elevated",
      "--rr-color-border",
      "--rr-color-text-muted",
      "--rr-color-text-primary",
      "--rr-color-accent",
      "--rr-color-recognition",
      "--rr-color-reasoning",
      "--rr-color-comparison",
      "--rr-color-memory",
      "--rr-color-pivot",
      "--rr-color-clue",
      "--rr-color-takeaway",
      "--rr-color-aster",
      "--rr-color-correct",
      "--rr-color-incorrect",
      "--rr-color-warning",
      "--rr-color-info",
      "--rr-color-repair",
      "--rr-color-mastery",
      "--rr-color-observatory-atmosphere"
    ].forEach((token) => assert.match(css, new RegExp(token)));

    [
      "--rr-bg",
      "--rr-bg-subtle",
      "--rr-surface",
      "--rr-surface-elevated",
      "--rr-surface-muted",
      "--rr-border",
      "--rr-border-strong",
      "--rr-text",
      "--rr-text-muted",
      "--rr-text-soft",
      "--rr-accent",
      "--rr-accent-soft",
      "--rr-accent-strong",
      "--rr-success",
      "--rr-success-soft",
      "--rr-warning",
      "--rr-warning-soft",
      "--rr-danger",
      "--rr-danger-soft",
      "--rr-shadow-sm",
      "--rr-shadow-md",
      "--rr-shadow-lg",
      "--rr-radius-sm",
      "--rr-radius-md",
      "--rr-radius-lg",
      "--rr-radius-xl",
      "--rr-font-sans",
      "--rr-font-serif",
      "--rr-font-mono",
      "--rr-paper-texture",
      "--rr-rule-opacity",
      "--rr-gradient-bg",
      "--rr-card-edge"
    ].forEach((token) => assert.match(css, new RegExp(token)));

    [
      "accent",
      "recognition",
      "reasoning",
      "comparison",
      "memory",
      "pivot",
      "clue",
      "takeaway",
      "correct",
      "incorrect",
      "warning",
      "info",
      "repair",
      "mastery",
      "observatory"
    ].forEach((token) => assert.match(tailwind, new RegExp(`${token}: "var\\(--rr-color-`)));
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
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(tutorMode, /rr-path/);
    assert.match(tutorMode, /rr-path-step/);
    assert.match(tutorMode, /rr-path-terminal/);
    assert.match(tutorMode, /rr-clinical-flow-pivot/);
    assert.match(tutorMode, /rr-table/);
    assert.match(css, /rr-teaching-block-pivot/);
    assert.match(tutorMode, /rr-chip/);
  });

  it("provides real theme skins and removes unimplemented sidebar repair controls", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    [
      "modern-academic",
      "warm-notebook",
      "dark-clinical",
      "editorial"
    ].forEach((theme) => {
      assert.match(practicePanel, new RegExp(theme));
      assert.match(css, new RegExp(`data-theme="${theme}"`));
    });

    assert.match(practicePanel, /SKIN_STORAGE_KEY/);
    assert.match(practicePanel, /window\.localStorage\.setItem\(SKIN_STORAGE_KEY, skin\)/);
    assert.match(practicePanel, /role="radiogroup"/);
    assert.match(practicePanel, /Moleskine Notebook/);
    assert.match(practicePanel, /Editorial Magazine/);
    assert.doesNotMatch(practicePanel, /Repair a Miss/);
  });

  it("defines theme-aware vignette annotation roles", () => {
    const css = readFileSync("app/globals.css", "utf8");

    [
      ".rr-annotation",
      ".rr-annotation-pivot",
      ".rr-annotation-supporting",
      ".rr-annotation-distractor",
      ".rr-annotation-context",
      ".rr-annotation-neutral",
      ".rr-vignette-annotation-pivot-clue",
      ".rr-vignette-annotation-supporting",
      ".rr-vignette-annotation-noise",
      ".rr-vignette-annotation-context"
    ].forEach((className) => assert.match(css, new RegExp(className.replace(".", "\\."))));
  });
});
