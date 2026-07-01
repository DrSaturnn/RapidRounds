import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import {
  applyAsterEvent,
  classifyAsterRouteOutcome,
  containsPunitiveAsterLanguage,
  createAsterCompanionState,
  formatPomodoroTime,
  getAsterLevelProgress
} from "@/lib/aster-companion";

describe("Aster companion for foundational Rapid Round", () => {
  test("creates a compact expedition session with a 20-question route", () => {
    const state = createAsterCompanionState({
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });

    assert.equal(state.session.questionTarget, 20);
    assert.equal(state.session.questionsCompleted, 0);
    assert.equal(state.session.routeOutcome, "in_progress");
    assert.equal(state.session.pomodoroState.remainingSeconds, 25 * 60);
  });

  test("advances one route node and awards retrieval XP after a correct answer", () => {
    const state = createAsterCompanionState({
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });
    const next = applyAsterEvent(state, { type: "correct_answer" });

    assert.equal(next.session.questionsCompleted, 1);
    assert.equal(next.session.currentNodeIndex, 1);
    assert.equal(next.session.correctCount, 1);
    assert.equal(next.session.xpEarned, 7);
    assert.equal(next.session.animationState, "walking");
  });

  test("incorrect answers still move the expedition forward without punitive language", () => {
    const state = createAsterCompanionState({
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });
    const next = applyAsterEvent(state, { type: "incorrect_answer" });

    assert.equal(next.session.questionsCompleted, 1);
    assert.equal(next.session.incorrectCount, 1);
    assert.equal(next.session.xpEarned, 5);
    assert.equal(next.session.lastMessage, "Aster paused to study the map.");
    assert.equal(containsPunitiveAsterLanguage(next.session.lastMessage), false);
  });

  test("Teach Me grants small acquisition XP and marks the map without penalty", () => {
    const state = createAsterCompanionState({
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });
    const next = applyAsterEvent(state, { type: "teach_me_used" });

    assert.equal(next.session.teachMeCount, 1);
    assert.equal(next.session.questionsCompleted, 0);
    assert.equal(next.session.xpEarned, 1);
    assert.equal(next.session.animationState, "reading_map");
    assert.equal(next.session.lastMessage, "Aster marked this for learning.");
  });

  test("classifies session outcomes as shortcut, normal, or review route", () => {
    assert.equal(classifyAsterRouteOutcome(18, 20), "shortcut");
    assert.equal(classifyAsterRouteOutcome(12, 20), "normal");
    assert.equal(classifyAsterRouteOutcome(11, 20), "review_route");
  });

  test("low mastery completion unlocks a review route using supportive language", () => {
    let state = createAsterCompanionState({
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });

    for (let index = 0; index < 20; index += 1) {
      state = applyAsterEvent(state, { type: index < 8 ? "correct_answer" : "incorrect_answer" });
    }

    assert.equal(state.session.routeOutcome, "review_route");
    assert.match(state.session.lastMessage, /Review route unlocked/i);
    assert.equal(containsPunitiveAsterLanguage(state.session.lastMessage), false);
  });

  test("tracks level progress and pomodoro display without depending on medical content", () => {
    let state = createAsterCompanionState({
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });
    state = applyAsterEvent(state, { type: "teach_me_used" });
    state = applyAsterEvent(state, { type: "correct_answer" });

    const levelProgress = getAsterLevelProgress(state.profile);
    assert.equal(levelProgress.level, state.profile.level);
    assert.equal(formatPomodoroTime(17 * 60 + 34), "17:34");
  });

  test("wires the top-right launcher to an open/close companion overlay", () => {
    const source = readFileSync("components/PracticePanel.tsx", "utf8");

    assert.match(source, /aria-label="Open Aster companion"/);
    assert.match(source, /aria-expanded=\{isAsterOpen\}/);
    assert.match(source, /setIsAsterOpen\(\(current\) => !current\)/);
    assert.match(source, /aria-label="Close Aster"/);
    assert.match(source, /role="dialog"/);
  });

  test("uses a reusable Aster avatar with mood, size, and shadow variants", () => {
    const source = readFileSync("components/aster/Aster.tsx", "utf8");
    const adapter = readFileSync("components/AsterAvatar.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(source, /export function AsterAvatar/);
    assert.match(source, /size = "small"/);
    assert.match(source, /mood = "neutral"/);
    assert.match(source, /showShadow = true/);
    assert.match(source, /rr-aster-eye/);
    assert.match(source, /rr-aster-core/);
    assert.match(source, /rr-aster-panel/);
    assert.match(source, /rr-aster-visor-gloss/);
    assert.doesNotMatch(source, /mouth/i);
    assert.match(adapter, /components\/aster\/Aster/);
    assert.match(css, /\.rr-aster-mood-thinking/);
    assert.match(css, /\.rr-aster-mood-celebrating/);
    assert.match(css, /\.rr-aster-mood-curious/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });

  test("renders an overworld map instead of a linear progress bar", () => {
    const source = readFileSync("components/AsterOverworldMap.tsx", "utf8");
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(source, /export function AsterOverworldMap/);
    assert.match(source, /MAP_NODE_POSITIONS/);
    assert.match(source, /rr-aster-map-path/);
    assert.match(source, /rr-aster-map-node/);
    assert.match(source, /AsterAvatar/);
    assert.match(source, /rr-aster-map-shortcut/);
    assert.match(source, /rr-aster-map-review/);
    assert.match(practicePanel, /AsterOverworldMap/);
    assert.doesNotMatch(practicePanel, /AsterRouteMap/);
    assert.match(css, /\.rr-aster-overworld/);
    assert.match(css, /\.rr-aster-map-avatar/);
  });

  test("keeps Aster governed by canonical design-system assets and rules", () => {
    const constitution = readFileSync("design-system/aster/ASTER_CONSTITUTION.md", "utf8");
    const doNotDeviate = readFileSync("design-system/aster/DO_NOT_DEVIATE.md", "utf8");
    const runtimeReadme = readFileSync("components/aster/README.md", "utf8");
    const source = readFileSync("components/PracticePanel.tsx", "utf8");

    assert.match(constitution, /glossy black visor/i);
    assert.match(constitution, /chest crystal/i);
    assert.match(doNotDeviate, /Do Not Deviate/i);
    assert.match(runtimeReadme, /Do not create independent Aster implementations/i);
    assert.match(source, /components\/aster\/Aster/);
  });
});
