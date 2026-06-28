import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
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
    const unknownIndex = route.indexOf('if (answerOutcome === "UNKNOWN")');
    const statsIndex = route.indexOf("const [, previousStats]", unknownIndex);
    const unknownBlock = route.slice(unknownIndex, statsIndex);

    assert.match(unknownBlock, /await prisma\.progress\.create/);
    assert.doesNotMatch(unknownBlock, /userStats/);
  });

  it("uses durable completed decision ids when selecting the next question", () => {
    const route = readFileSync("app/api/questions/next/route.ts", "utf8");

    assert.match(route, /const learnerId = normalizeLearnerId\(searchParams\.get\("learnerId"\)\)/);
    assert.match(route, /where: \{ userId: learnerId \}/);
    assert.match(route, /const \[answered, completed\] = await Promise\.all/);
    assert.match(route, /completed\.map\(\(row\) => row\.clinicalDecisionId\)/);
    assert.match(route, /getNextClinicalDecision\(\[\.{3}answeredDecisionIds\], adaptiveTarget\)/);
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
    assert.match(stats, /scoredProgressWhere/);
    assert.doesNotMatch(stats, /userId: "default"/);
    assert.doesNotMatch(stats, /userStats\.upsert/);
  });

  it("creates and sends a stable anonymous learner id from browser storage", () => {
    const session = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(session, /rapidrounds\.anonymousLearnerId\.v1/);
    assert.match(session, /getOrCreateAnonymousLearnerId/);
    assert.match(session, /crypto\.randomUUID/);
    assert.match(session, /params\.set\("learnerId", currentLearnerId\)/);
    assert.match(session, /learnerId: learnerId\.current \|\| getOrCreateAnonymousLearnerId\(\)/);
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

  it("accepts only anonymous learner identifiers", () => {
    assert.equal(normalizeLearnerId("anon_12345678"), "anon_12345678");
    assert.equal(normalizeLearnerId(" default "), undefined);
    assert.equal(normalizeLearnerId("user_12345678"), undefined);
    assert.equal(normalizeLearnerId(undefined), undefined);
  });

  it("does not seed a global shared learner account", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");

    assert.doesNotMatch(seed, /userId: "default"/);
    assert.doesNotMatch(seed, /userStats\.create/);
  });
});
