import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isRestorablePracticeSession } from "@/hooks/usePracticeSession";
import { getClinicalPromptText } from "@/lib/decision-question-text";
import { normalizeLearnerId } from "@/lib/learner-id";

describe("persistent learner state", () => {
  it("stores durable reasoning memory fields on Progress", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    assert.match(schema, /userId\s+String/);
    assert.doesNotMatch(schema, /userId\s+String\s+@default\("default"\)/);

    [
      "expectedAnswer String?",
      "answerOutcome  String?",
      "evaluationClassification String?",
      "partialCredit  Float?",
      "confidence     Float?",
      "cognitiveErrorType String?",
      "reasoningPattern String?",
      "repairType     String?",
      "decisionType   String?",
      "curriculumNodeId String?",
      "shelfTags      String?",
      "disciplineTags String?"
    ].forEach((field) => assert.match(schema, new RegExp(field.replace(/\s+/g, "\\s+"))));
  });

  it("persists evaluated clinical decision attempts with reasoning and curriculum metadata", () => {
    const route = readFileSync("app/api/practice/answer/route.ts", "utf8");

    assert.match(route, /const learnerId = normalizeLearnerId\(body\.learnerId\)/);
    assert.match(route, /userId: learnerId/);
    assert.match(route, /prisma\.progress\.create/);
    assert.match(route, /expectedAnswer: correctAnswer/);
    assert.match(route, /answerOutcome/);
    assert.match(route, /evaluationClassification: evaluation\.classification/);
    assert.match(route, /partialCredit: evaluation\.partialCredit/);
    assert.match(route, /confidence: evaluation\.confidence/);
    assert.match(route, /cognitiveErrorType: tutor\.cognitiveError\?\.type/);
    assert.match(route, /reasoningPattern: tutor\.reasoningAnalysis\.primaryError/);
    assert.match(route, /repairType: tutor\.repair\.style/);
    assert.match(route, /curriculumNodeId: curriculumContext\.primaryNode\?\.id/);
    assert.match(route, /shelfTags: serializeList\(curriculumContext\.shelfTags\)/);
    assert.match(route, /disciplineTags: serializeList\(curriculumContext\.disciplineTags\)/);
  });

  it("persists UNKNOWN attempts without treating them as UserStats completions", () => {
    const route = readFileSync("app/api/practice/answer/route.ts", "utf8");
    const unknownIndex = route.indexOf('if (answerOutcome === "UNKNOWN" || answerOutcome === "REVEALED_WITHOUT_ATTEMPT")');
    const statsIndex = route.indexOf("const [, previousStats]", unknownIndex);
    const unknownBlock = route.slice(unknownIndex, statsIndex);

    assert.match(unknownBlock, /await prisma\.progress\.create/);
    assert.doesNotMatch(unknownBlock, /userStats/);
  });

  it("uses durable completed decision ids when selecting the next question", () => {
    const route = readFileSync("app/api/questions/next/route.ts", "utf8");

    assert.match(route, /const learnerId = normalizeLearnerId\(searchParams\.get\("learnerId"\)\)/);
    assert.match(route, /where: \{ userId: learnerId \}/);
    assert.match(route, /const \[answered, completed, adaptiveRecommendation, subjectCounts\] = await Promise\.all/);
    assert.match(route, /getAdaptiveDecisionRecommendation\(learnerId, requestedConcept, requestedSubject\)/);
    assert.match(route, /completed\.map\(\(row\) => row\.clinicalDecisionId\)/);
    assert.match(route, /adaptiveRecommendation\?\.decision/);
    assert.match(route, /getNextClinicalDecision\(\[\.{3}answeredDecisionIds\], adaptiveTarget, requestedSubject\)/);
    assert.match(route, /completed\.map\(\(row\) => row\.questionId\)/);
  });

  it("keeps one learner's completed decisions from affecting another learner's selection", () => {
    const route = readFileSync("app/api/questions/next/route.ts", "utf8");
    const progressReads = [...route.matchAll(/prisma\.progress\.findMany\(\{[\s\S]*?where: \{ userId: learnerId \}/g)];

    assert.equal(progressReads.length, 2);
    assert.doesNotMatch(route, /where: \{ userId: "default" \}/);
    assert.match(route, /learnerId\s*\?\s*prisma\.progress\.findMany/);
  });

  it("keeps UNKNOWN memory rows out of scored analytics", () => {
    const stats = readFileSync("lib/stats.ts", "utf8");

    assert.match(stats, /answerOutcome: \{ not: "UNKNOWN" \}/);
    assert.match(stats, /answerOutcome: \{ not: "REVEALED_WITHOUT_ATTEMPT" \}/);
    assert.match(stats, /scoredProgressWhere/);
    assert.doesNotMatch(stats, /userId: "default"/);
    assert.doesNotMatch(stats, /userStats\.upsert/);
  });

  it("creates and sends a stable local learner id from browser storage", () => {
    const session = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(session, /rapidrounds\.anonymousLearnerId\.v1/);
    assert.match(session, /getOrCreateAnonymousLearnerId/);
    assert.match(session, /LOCAL_DEMO_USER_ID/);
    assert.match(session, /normalizeLearnerId\(existing\)/);
    assert.match(session, /params\.set\("learnerId", currentLearnerId\)/);
    assert.match(session, /learnerId: learnerId\.current \|\| getOrCreateAnonymousLearnerId\(\)/);
  });

  it("reuses the stable local learner id across simulated reloads and deployments", () => {
    const session = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(session, /const existing = window\.localStorage\.getItem\(LEARNER_ID_STORAGE_KEY\)/);
    assert.match(session, /if \(existingLearnerId === LOCAL_DEMO_USER_ID\) \{\s*return existingLearnerId;\s*\}/);
    assert.doesNotMatch(session, /localStorage\.removeItem\(LEARNER_ID_STORAGE_KEY\)/);
    assert.doesNotMatch(session, /rapidrounds\.anonymousLearnerId\.v2/);
  });

  it("handles missing learner id safely without falling back to shared progress", () => {
    const answerRoute = readFileSync("app/api/practice/answer/route.ts", "utf8");
    const nextRoute = readFileSync("app/api/questions/next/route.ts", "utf8");

    assert.match(answerRoute, /if \(!learnerId\)/);
    assert.match(answerRoute, /Learner id is required/);
    assert.doesNotMatch(answerRoute, /userId: "default"/);
    assert.match(nextRoute, /: Promise\.resolve\(\[\]\)/);
    assert.doesNotMatch(nextRoute, /userId: "default"/);
  });

  it("accepts anonymous learner identifiers and the local demo user", () => {
    assert.equal(normalizeLearnerId("anon_12345678"), "anon_12345678");
    assert.equal(normalizeLearnerId("local-demo-user"), "local-demo-user");
    assert.equal(normalizeLearnerId(" default "), undefined);
    assert.equal(normalizeLearnerId("user_12345678"), undefined);
    assert.equal(normalizeLearnerId(undefined), undefined);
  });

  it("does not seed a global shared learner account or delete learner progress", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");

    assert.doesNotMatch(seed, /userId: "default"/);
    assert.doesNotMatch(seed, /userStats\.create/);
    assert.doesNotMatch(seed, /progress\.deleteMany/);
    assert.doesNotMatch(seed, /userStats\.deleteMany/);
  });

  it("production seed updates clinical decisions in place instead of replacing ids", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");

    assert.match(seed, /clinicalDecision\.findFirst/);
    assert.match(seed, /clinicalDecision\.update/);
    assert.match(seed, /clinicalDecision\.create/);
    assert.doesNotMatch(seed, /clinicalDecision\.deleteMany/);
    assert.doesNotMatch(seed, /clinicalDecision\.createMany/);
  });

  it("writes and reads learner progress from persistent storage by anonymous learner id", () => {
    const answerRoute = readFileSync("app/api/practice/answer/route.ts", "utf8");
    const nextRoute = readFileSync("app/api/questions/next/route.ts", "utf8");

    assert.match(answerRoute, /prisma\.progress\.create\(\{\s*data: progressData\s*\}\)/);
    assert.match(answerRoute, /userId: learnerId/);
    assert.match(nextRoute, /prisma\.progress\.findMany\(\{/);
    assert.match(nextRoute, /where: \{ userId: learnerId \}/);
    assert.match(nextRoute, /completed\.map\(\(row\) => row\.clinicalDecisionId\)/);
  });

  it("completed decisions remain completed after deployment because persisted ids are excluded", () => {
    const nextRoute = readFileSync("app/api/questions/next/route.ts", "utf8");
    const decisionSelection = readFileSync("database/clinical-decisions.ts", "utf8");

    assert.match(nextRoute, /const answeredDecisionIds = new Set/);
    assert.match(nextRoute, /getNextClinicalDecision\(\[\.{3}answeredDecisionIds\], adaptiveTarget, requestedSubject\)/);
    assert.match(decisionSelection, /id: \{ notIn: excludedIds \}/);
  });

  it("rejects stale persisted sessions with incomplete question DTOs before render", () => {
    const staleSession = {
      version: 1,
      currentRound: 1,
      adaptiveQueuePosition: 1,
      question: {
        id: "stale-question",
        specialty: "OB/GYN",
        topic: "Old topic",
        difficulty: 1
      },
      answer: "",
      result: null,
      mode: "rapid",
      tutor: null,
      reinforcementAnswer: "",
      reinforcementResult: null,
      sessionDecisionCount: 1,
      answeredQuestionIds: [],
      activeSubject: "OB/GYN",
      updatedAt: Date.now()
    };

    assert.equal(isRestorablePracticeSession(staleSession), false);
  });

  it("accepts current persisted rapid sessions with the complete question DTO shape", () => {
    const currentSession = {
      version: 1,
      currentRound: 1,
      adaptiveQueuePosition: 1,
      question: {
        id: "question-1",
        specialty: "OB/GYN",
        topic: "Placenta previa evaluation",
        difficulty: 1,
        stem: "Third-trimester bleeding with suspected placenta previa.",
        pattern: "Third-trimester bleeding",
        management: "Localize the placenta before any cervical exam.",
        diagnosis: "Placenta previa evaluation",
        decisionType: "Initial Test"
      },
      answer: "",
      result: null,
      mode: "rapid",
      tutor: null,
      reinforcementAnswer: "",
      reinforcementResult: null,
      sessionDecisionCount: 1,
      answeredQuestionIds: [],
      activeSubject: "OB/GYN",
      updatedAt: Date.now()
    };

    assert.equal(isRestorablePracticeSession(currentSession), true);
  });

  it("does not crash when formatting a missing clinical prompt from malformed data", () => {
    assert.equal(getClinicalPromptText(undefined), "");
    assert.equal(getClinicalPromptText(null), "");
  });
});
