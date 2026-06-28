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

  it("keeps settings and Aster controls out of the main content flow", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(practicePanel, /settingsAnchor/);
    assert.match(practicePanel, /renderThemePopover/);
    assert.match(practicePanel, /rr-menu-anchor/);
    assert.match(practicePanel, /rr-tool-popover-anchor/);
    assert.doesNotMatch(practicePanel, /activeTool === "settings"/);
    assert.doesNotMatch(practicePanel, /setActiveTool\(.*settings/);

    assert.match(practicePanel, /AsterCompanion/);
    assert.match(practicePanel, /Case-aware chat is coming soon/);
    assert.match(practicePanel, /onClick=\{toggleAster\}/);
    assert.doesNotMatch(practicePanel, /onClick=\{showTeaching\}\\s*>\\s*✧ Aster/);

    assert.match(css, /\.rr-popover/);
    assert.match(css, /\.rr-aster-companion/);
  });

  it("renders the shelf selector as an anchored real subject menu", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const hook = readFileSync("hooks/usePracticeSession.ts", "utf8");
    const route = readFileSync("app/api/questions/next/route.ts", "utf8");
    const subjectsRoute = readFileSync("app/api/subjects/route.ts", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    [
      "Internal Medicine",
      "Surgery",
      "Pediatrics",
      "OB/GYN",
      "Psychiatry",
      "Family Medicine",
      "Emergency Medicine",
      "Neurology"
    ].forEach((subject) => assert.match(practicePanel, new RegExp(subject.replace("/", "\\/"))));

    assert.match(practicePanel, /isSubjectSelectorOpen/);
    assert.match(practicePanel, /rr-subject-anchor/);
    assert.match(practicePanel, /rr-subject-popover/);
    assert.match(practicePanel, /Coming soon/);
    assert.match(practicePanel, /disabled=\{!isAvailable\}/);
    assert.match(practicePanel, /selectSubject\(subject\)/);
    assert.match(hook, /rapidrounds\.activeSubject\.v1/);
    assert.match(hook, /params\.set\("subject", requestedSubject\)/);
    assert.match(route, /searchParams\.get\("subject"\)/);
    assert.match(route, /getClinicalDecisionSubjectCounts/);
    assert.match(subjectsRoute, /getClinicalDecisionSubjectCounts/);
    assert.match(css, /\.rr-subject-popover/);
    assert.match(css, /\.rr-subject-grid/);
    assert.match(css, /\.rr-subject-option/);
  });

  it("scopes Moleskine paper materiality to the Moleskine theme", () => {
    const css = readFileSync("app/globals.css", "utf8");

    const modernIndex = css.indexOf('[data-theme="modern-academic"]');
    const moleskineIndex = css.indexOf('[data-theme="warm-notebook"]');
    const darkIndex = css.indexOf('[data-theme="dark-clinical"]');
    const editorialIndex = css.indexOf('[data-theme="editorial"]');
    const firstComponentIndex = css.indexOf("* {");
    const modernThemeBlock = css.slice(modernIndex, moleskineIndex);
    const moleskineThemeBlock = css.slice(moleskineIndex, darkIndex);
    const darkThemeBlock = css.slice(darkIndex, editorialIndex);
    const editorialThemeBlock = css.slice(editorialIndex, firstComponentIndex);

    assert.match(moleskineThemeBlock, /--rr-bg:\s*#f4ead7/i);
    assert.match(moleskineThemeBlock, /--rr-surface:\s*#fff6de/i);
    assert.match(moleskineThemeBlock, /--rr-paper-texture-opacity:\s*0\.105/);
    assert.match(moleskineThemeBlock, /--rr-rule-opacity:\s*0\.1/);
    assert.match(moleskineThemeBlock, /repeating-linear-gradient\(to bottom/);

    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-practice-shell::after/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-product-nav/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-tool-rail/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-button-primary/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-moleskine-shell/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-moleskine-notebook-spread/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-moleskine-notebook-spread::before/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-moleskine-notebook-spread::after/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-question-card::before/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-explanation-notebook::before/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-teaching-card\[open\]::before/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-card-paper/);
    assert.match(css, /\[data-theme="warm-notebook"\] \.rr-vignette-label/);
    assert.doesNotMatch(modernThemeBlock, /rr-question-card::before/);
    assert.doesNotMatch(darkThemeBlock, /rr-question-card::before/);
    assert.doesNotMatch(editorialThemeBlock, /rr-question-card::before/);
  });

  it("wires Moleskine material classes into visible practice surfaces", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const teachingCard = readFileSync("components/TeachingCard.tsx", "utf8");

    assert.match(practicePanel, /skin === "warm-notebook"/);
    assert.match(practicePanel, /function MoleskinePracticeLayout/);
    assert.match(practicePanel, /function MoleskineShell/);
    assert.match(practicePanel, /function MoleskineSidebar/);
    assert.match(practicePanel, /function MoleskineNotebookSpread/);
    assert.match(practicePanel, /function MoleskineLeftPage/);
    assert.match(practicePanel, /function MoleskineRightPage/);
    assert.match(practicePanel, /function MoleskineFooterActions/);
    assert.match(practicePanel, /rr-notebook-shell rr-notebook-surface rr-moleskine-shell/);
    assert.match(practicePanel, /rr-tool-rail rr-panel rr-moleskine-sidebar-page/);
    assert.match(practicePanel, /rr-moleskine-notebook-spread/);
    assert.match(practicePanel, /rr-card rr-question-card rr-vignette-card rr-card-paper rr-moleskine-left-page/);
    assert.match(practicePanel, /rr-tool-panel rr-panel rr-moleskine-page-section/);
    assert.match(practicePanel, /rr-bottom-nav rr-panel rr-moleskine-footer-strip/);

    assert.match(tutorMode, /presentation\?: "default" \| "moleskine"/);
    assert.match(tutorMode, /function MoleskineTeachingDocument/);
    assert.match(tutorMode, /function MoleskineReasoningChain/);
    assert.match(tutorMode, /function MoleskineClinicalPearl/);
    assert.match(tutorMode, /function MoleskineTeachMeMore/);
    assert.match(tutorMode, /rr-moleskine-teaching-document/);
    assert.match(tutorMode, /rr-moleskine-teach-more/);
    assert.match(tutorMode, /rr-moleskine-right-page/);
    assert.match(tutorMode, /rr-moleskine-teaching-section/);
    assert.match(tutorMode, /rr-explanation-card rr-card-paper rr-adaptive-card rr-moleskine-page-section/);

    assert.match(teachingCard, /rr-teaching-card rr-explanation-card rr-card-paper rr-moleskine-insert/);
    assert.match(teachingCard, /rr-panel-collapsed/);
  });
});
