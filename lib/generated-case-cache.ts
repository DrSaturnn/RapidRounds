import type { GeneratedRapidRoundsCase, QuestionBreadth, RapidRoundsSubject } from "@/lib/subject-seeds/seed-types";

export type GeneratedCaseCacheStats = {
  schemaNodeCasePoolBuilds: number;
  subjectCasePoolBuilds: number;
  caseIdIndexBuilds: number;
  subjectCacheKeys: string[];
  schemaNodeCacheKeys: string[];
  indexedCaseCount: number;
};

const schemaNodeCasePools = new Map<string, GeneratedRapidRoundsCase[]>();
const subjectCasePools = new Map<string, GeneratedRapidRoundsCase[]>();
let caseIdIndex: Map<string, GeneratedRapidRoundsCase> | undefined;
let schemaNodeCasePoolBuilds = 0;
let subjectCasePoolBuilds = 0;
let caseIdIndexBuilds = 0;

function profileGeneratedCaseStep<T>(label: string, action: () => T): T {
  const shouldProfile = process.env.NODE_ENV === "development" || process.env.RAPIDROUNDS_PROFILE_CURRICULUM === "1";
  if (!shouldProfile) {
    return action();
  }

  const startedAt = performance.now();
  const result = action();
  const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;
  console.info(`[RapidRounds curriculum] ${label}: ${elapsedMs}ms`);
  return result;
}

export function getSchemaNodeCasePoolFromCache(
  schemaNodeId: string,
  breadth: QuestionBreadth,
  build: () => GeneratedRapidRoundsCase[]
) {
  const key = `${schemaNodeId}:${breadth}`;
  const cached = schemaNodeCasePools.get(key);
  if (cached) {
    return cached;
  }

  const generated = profileGeneratedCaseStep(`generate schema-node case pool ${key}`, () => {
    schemaNodeCasePoolBuilds += 1;
    return build();
  });
  schemaNodeCasePools.set(key, generated);
  caseIdIndex = undefined;
  return generated;
}

export function getSubjectCasePoolFromCache(
  subject: RapidRoundsSubject | "all",
  breadth: QuestionBreadth,
  build: () => GeneratedRapidRoundsCase[]
) {
  const key = `${subject}:${breadth}`;
  const cached = subjectCasePools.get(key);
  if (cached) {
    return cached;
  }

  const generated = profileGeneratedCaseStep(`generate subject case pool ${key}`, () => {
    subjectCasePoolBuilds += 1;
    return build();
  });
  subjectCasePools.set(key, generated);
  return generated;
}

export function getCaseIdIndexFromCache(build: () => Map<string, GeneratedRapidRoundsCase>) {
  if (caseIdIndex) {
    return caseIdIndex;
  }

  caseIdIndex = profileGeneratedCaseStep("build generated-case id index", () => {
    caseIdIndexBuilds += 1;
    return build();
  });
  return caseIdIndex;
}

export function getGeneratedCaseCacheStats(): GeneratedCaseCacheStats {
  return {
    schemaNodeCasePoolBuilds,
    subjectCasePoolBuilds,
    caseIdIndexBuilds,
    subjectCacheKeys: [...subjectCasePools.keys()],
    schemaNodeCacheKeys: [...schemaNodeCasePools.keys()],
    indexedCaseCount: caseIdIndex?.size ?? 0
  };
}

export function resetGeneratedCaseCacheForTests() {
  schemaNodeCasePools.clear();
  subjectCasePools.clear();
  caseIdIndex = undefined;
  schemaNodeCasePoolBuilds = 0;
  subjectCasePoolBuilds = 0;
  caseIdIndexBuilds = 0;
}
