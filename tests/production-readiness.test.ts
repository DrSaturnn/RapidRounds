import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("production readiness", () => {
  it("uses PostgreSQL for Prisma without changing model names", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    assert.match(schema, /provider = "postgresql"/);
    assert.match(schema, /model Question \{/);
    assert.match(schema, /model ClinicalDecision \{/);
    assert.match(schema, /model Progress \{/);
    assert.doesNotMatch(schema, /provider = "sqlite"/);
  });

  it("keeps seeded OB/GYN clinical decisions plus the ectopic illness-script pilot", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    const decisionsBlock = seed.match(/const decisions:[\s\S]*?= \[([\s\S]*?)\n\];/)?.[1] ?? "";

    assert.equal((decisionsBlock.match(/\n  \{/g) ?? []).length, 86);
    assert.match(seed, /ectopicPregnancyVariants\.map\(rapidRoundsCaseToClinicalDecisionSeed\)/);
    assert.match(seed, /Seeded \$\{decisions\.length\} OB\/GYN clinical decisions\./);
  });

  it("exposes a safe dynamic health check without secrets", () => {
    const healthRoute = readFileSync("app/api/health/route.ts", "utf8");

    assert.match(healthRoute, /export const dynamic = "force-dynamic"/);
    assert.match(healthRoute, /database: \{ connected: true \}/);
    assert.match(healthRoute, /questionCount/);
    assert.match(healthRoute, /SELECT 1/);
    assert.doesNotMatch(healthRoute, /DATABASE_URL/);
    assert.doesNotMatch(healthRoute, /process\.env/);
  });

  it("keeps Prisma-backed pages dynamic for Vercel builds", () => {
    const dashboardPage = readFileSync("app/page.tsx", "utf8");
    const analyticsPage = readFileSync("app/analytics/page.tsx", "utf8");

    assert.match(dashboardPage, /export const dynamic = "force-dynamic"/);
    assert.match(analyticsPage, /export const dynamic = "force-dynamic"/);
  });

  it("shows a seeded-database diagnostic when Practice has no questions", () => {
    const practiceSession = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.match(practiceSession, /No questions found\. Database may not be seeded\./);
  });

  it("uses the Node tsx import runner for Prisma seed", () => {
    const packageJson = readFileSync("package.json", "utf8");

    assert.match(packageJson, /"seed": "node --import tsx prisma\/seed\.ts"/);
  });
});
