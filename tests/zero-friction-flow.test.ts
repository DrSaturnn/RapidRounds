import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("zero-friction training flow", () => {
  it("makes the home route render practice directly without dashboard resume controls", () => {
    const homePage = readFileSync("app/page.tsx", "utf8");

    assert.match(homePage, /import \{ PracticePanel \}/);
    assert.match(homePage, /return <PracticePanel \/>/);
    assert.doesNotMatch(homePage, /Dashboard/);
    assert.doesNotMatch(homePage, /Resume Practice/);
    assert.doesNotMatch(homePage, /getDashboardStats/);
  });

  it("starts new learners in OB/GYN Rapid Round by default", () => {
    const practiceSession = readFileSync("hooks/usePracticeSession.ts", "utf8");
    const progressStore = readFileSync("lib/learner-progress-store.ts", "utf8");

    assert.match(practiceSession, /const DEFAULT_SUBJECT = "OB\/GYN"/);
    assert.match(practiceSession, /const DEFAULT_STUDY_MODE = "rapid_round"/);
    assert.match(progressStore, /activeShelf: "OB\/GYN"/);
    assert.match(progressStore, /activeMode: "rapid_round"/);
  });

  it("keeps analytics secondary as Progress navigation and removes dashboard navigation", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");

    assert.match(layout, /label: "Progress"/);
    assert.match(layout, /href: "\/analytics"/);
    assert.doesNotMatch(layout, /label: "Dashboard"/);
    assert.doesNotMatch(layout, /label: "Practice"/);
  });

  it("persists the active training state for fast resume", () => {
    const practiceSession = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(practiceSession, /rapidrounds\.practiceSession\.v1/);
    assert.match(practiceSession, /readPersistedSession/);
    assert.match(practiceSession, /writePersistedSession/);
    assert.match(practiceSession, /question,/);
    assert.match(practiceSession, /result,/);
    assert.match(practiceSession, /tutor,/);
    assert.match(practiceSession, /sessionDecisionCount/);
    assert.match(practiceSession, /answeredQuestionIds/);
    assert.match(practiceSession, /adaptiveQueuePosition/);
  });

  it("checks for a resumable session before starting a new adaptive question", () => {
    const practiceSession = readFileSync("hooks/usePracticeSession.ts", "utf8");
    const restoreIndex = practiceSession.indexOf("const persisted = readPersistedSession()");
    const loadIndex = practiceSession.indexOf("void loadQuestion()", restoreIndex);

    assert.ok(restoreIndex > -1);
    assert.ok(loadIndex > restoreIndex);
  });
});
