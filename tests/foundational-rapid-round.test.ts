import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildFoundationalTeaching,
  createInitialFoundationalAttemptState,
  evaluateFoundationalRapidRoundAnswer,
  getFoundationalRapidRoundItems,
  getFoundationalTeachMeMode,
  markFoundationalTaught,
  toFoundationalQuestionDto
} from "@/lib/foundational-rapid-round";

describe("foundational Rapid Round mode", () => {
  const item = getFoundationalRapidRoundItems("OB/GYN")[0];

  it("provides at least one complete OB/GYN schema cluster", () => {
    assert.ok(item);
    const question = toFoundationalQuestionDto(item);
    const teaching = buildFoundationalTeaching(item);

    assert.equal(question.specialty, "OB/GYN");
    assert.equal(question.foundationalRapidRound?.mode, "foundational_rapid_round");
    assert.ok(teaching.definition);
    assert.ok(teaching.mechanism);
    assert.ok(teaching.recognitionPattern.length >= 4);
    assert.ok(teaching.completeIllnessScript.length >= 4);
    assert.ok(teaching.competingIllnessScript.length >= 4);
    assert.ok(teaching.discriminator.rows.length >= 3);
    assert.ok(teaching.nbmeTestingFrame);
  });

  it("does not expose hints or annotations before answer", () => {
    const question = toFoundationalQuestionDto(item);

    assert.equal(question.clinicalCues, undefined);
    assert.equal(question.vignetteFindings, undefined);
    assert.equal(question.stem.includes("Pivot"), false);
    assert.equal(question.stem.includes("Today"), false);
  });

  it("marks first Teach Me exposure as acquisition without mastery", () => {
    const initial = createInitialFoundationalAttemptState(item.id, new Date("2026-06-30T12:00:00Z"));
    const taught = markFoundationalTaught(initial, new Date("2026-06-30T12:01:00Z"));

    assert.equal(taught.taughtOnce, true);
    assert.equal(taught.needsLearning, true);
    assert.equal(taught.answeredCorrectlyOnce, false);
    assert.equal(taught.lastOutcome, "taught");
  });

  it("turns later Teach Me exposure into a retrieval reminder", () => {
    const initial = createInitialFoundationalAttemptState(item.id);
    assert.equal(getFoundationalTeachMeMode(initial), "teach");
    assert.equal(getFoundationalTeachMeMode(markFoundationalTaught(initial)), "retrieval_reminder");
  });

  it("highlights only today's discriminator inside the recognition pattern", () => {
    const teaching = buildFoundationalTeaching(item);
    const highlighted = teaching.recognitionPattern.filter((entry) =>
      entry.toLowerCase().includes(teaching.discriminator.todayDiscriminator.toLowerCase())
    );

    assert.deepEqual(highlighted, ["normal pubic hair"]);
  });

  it("infers the activated wrong illness script when confidence is sufficient", () => {
    const result = evaluateFoundationalRapidRoundAnswer(item, "androgen insensitivity syndrome");

    assert.equal(result.isCorrect, false);
    assert.equal(result.teaching.inferredWrongScript?.name, "Androgen insensitivity syndrome");
    assert.equal(result.teaching.inferredWrongScript?.confidence, "high");
    assert.match(result.teaching.inferredWrongScript?.stopClue ?? "", /normal pubic hair/i);
  });

  it("falls back to missed schema cluster when wrong answer is unmapped", () => {
    const result = evaluateFoundationalRapidRoundAnswer(item, "Turner syndrome");

    assert.equal(result.isCorrect, false);
    assert.equal(result.teaching.inferredWrongScript, undefined);
    assert.equal(result.teaching.missedPattern, item.schemaCluster);
  });

  it("keeps Clinical Cue out of foundational Rapid Round rendering", () => {
    const panel = readFileSync("components/PracticePanel.tsx", "utf8");
    const session = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(panel, /isFoundationalRapidRound/);
    assert.match(panel, /T opens Teach Me/);
    assert.match(session, /Enter an answer, or use Teach Me/);
    const renderBranch = panel.match(/if \(isFoundationalRapidRound && foundationalItem[\s\S]*?if \(skin === "warm-notebook"\)/)?.[0] ?? "";
    assert.match(renderBranch, /FoundationalTeachingMode/);
    assert.doesNotMatch(renderBranch, /requestClinicalCue/);
    assert.doesNotMatch(renderBranch, /Clinical Cue/);
  });
});
