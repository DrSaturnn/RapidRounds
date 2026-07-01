import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAsterCompanionState } from "@/lib/aster-companion";
import {
  LOCAL_DEMO_USER_ID,
  createMemoryLearnerProgressStore
} from "@/lib/learner-progress-store";

describe("LearnerProgressStore", () => {
  it("creates and updates a durable local learner profile", async () => {
    const store = createMemoryLearnerProgressStore();
    const profile = await store.updateProfile(LOCAL_DEMO_USER_ID, {
      activeShelf: "Internal Medicine",
      activeMode: "rapid_round",
      totalQuestionsCompleted: 3,
      totalCorrect: 2,
      currentStreak: 1,
      longestStreak: 2,
      preferences: { questionBreadth: "expanded" }
    });

    assert.equal(profile.userId, LOCAL_DEMO_USER_ID);
    assert.equal(profile.activeShelf, "Internal Medicine");
    assert.equal(profile.preferences.questionBreadth, "expanded");
    assert.equal((await store.getProfile(LOCAL_DEMO_USER_ID))?.totalQuestionsCompleted, 3);
  });

  it("persists question exposure and Teach Me state scoped to userId", async () => {
    const store = createMemoryLearnerProgressStore();
    await store.updateQuestionState(LOCAL_DEMO_USER_ID, "case-1", {
      firstSeenAt: "2026-06-30T10:00:00.000Z",
      lastSeenAt: "2026-06-30T10:05:00.000Z",
      exposureCount: 2,
      taughtOnce: true,
      answeredCorrectlyOnce: false,
      needsLearning: true,
      dueAt: "2026-07-01T10:05:00.000Z",
      lastAnswer: "teach me",
      lastOutcome: "taught"
    });

    const state = await store.getQuestionState(LOCAL_DEMO_USER_ID, "case-1");
    const otherUserState = await store.getQuestionState("local-other-user", "case-1");

    assert.equal(state?.userId, LOCAL_DEMO_USER_ID);
    assert.equal(state?.questionItemId, "case-1");
    assert.equal(state?.exposureCount, 2);
    assert.equal(state?.taughtOnce, true);
    assert.equal(otherUserState, null);
  });

  it("persists Aster profile, active session, and XP events", async () => {
    const store = createMemoryLearnerProgressStore();
    const state = createAsterCompanionState({
      userId: LOCAL_DEMO_USER_ID,
      mode: "rapid_round",
      shelf: "OB/GYN",
      schemaCluster: "Primary amenorrhea"
    });

    await store.updateAsterProfile(LOCAL_DEMO_USER_ID, { ...state.profile, totalXp: 42, level: 2 });
    await store.createAsterSession(LOCAL_DEMO_USER_ID, state.session);
    await store.updateAsterSession(LOCAL_DEMO_USER_ID, state.session.sessionId, {
      questionsCompleted: 4,
      currentNodeIndex: 4,
      xpEarned: 42
    });
    await store.recordXpEvent(LOCAL_DEMO_USER_ID, {
      eventId: "xp-1",
      sessionId: state.session.sessionId,
      amount: 42,
      reason: "correct_answer",
      createdAt: "2026-06-30T10:00:00.000Z"
    });

    const exported = await store.exportProgress(LOCAL_DEMO_USER_ID);
    assert.equal(exported.asterProfile?.totalXp, 42);
    assert.equal(exported.asterSessions[0]?.questionsCompleted, 4);
    assert.equal(exported.xpEvents[0]?.amount, 42);
    assert.equal(exported.xpEvents[0]?.userId, LOCAL_DEMO_USER_ID);
  });

  it("exports and imports progress JSON without mixing users", async () => {
    const source = createMemoryLearnerProgressStore();
    await source.updateProfile(LOCAL_DEMO_USER_ID, {
      activeShelf: "OB/GYN",
      activeMode: "adaptive",
      totalQuestionsCompleted: 1
    });
    await source.updateQuestionState(LOCAL_DEMO_USER_ID, "case-2", {
      exposureCount: 1,
      taughtOnce: false,
      answeredCorrectlyOnce: true,
      needsLearning: false,
      lastOutcome: "correct"
    });

    const exported = await source.exportProgress(LOCAL_DEMO_USER_ID);
    const target = createMemoryLearnerProgressStore();
    await target.importProgress("local-demo-user-copy", JSON.stringify(exported));

    assert.equal((await target.getProfile("local-demo-user-copy"))?.userId, "local-demo-user-copy");
    assert.equal((await target.getQuestionState("local-demo-user-copy", "case-2"))?.answeredCorrectlyOnce, true);
    assert.equal(await target.getQuestionState(LOCAL_DEMO_USER_ID, "case-2"), null);
  });
});
