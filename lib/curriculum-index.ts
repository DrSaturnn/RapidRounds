import {
  SUBJECTS,
  SUBJECT_SCHEMA_NODE_REGISTRY,
  allSchemaNodes
} from "@/lib/subject-seeds";
import type { QuestionBreadth, RapidRoundsSubject, SchemaNode } from "@/lib/subject-seeds/seed-types";

type CurriculumIndex = {
  allSchemaNodes: SchemaNode[];
  bySubject: Map<RapidRoundsSubject, SchemaNode[]>;
  schemaNodeById: Map<string, SchemaNode>;
  subjectNodeCounts: Array<{ subject: RapidRoundsSubject; count: number }>;
};

let curriculumIndex: CurriculumIndex | undefined;
let curriculumIndexBuilds = 0;

export function normalizeQuestionBreadth(value?: string | null): QuestionBreadth {
  if (value === "primary" || value === "expanded" || value === "comprehensive") {
    return value;
  }

  return "comprehensive";
}

export function profileCurriculumStep<T>(label: string, action: () => T): T {
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

function buildCurriculumIndex(): CurriculumIndex {
  return profileCurriculumStep("build schema-node curriculum index", () => {
    curriculumIndexBuilds += 1;
    const bySubject = new Map<RapidRoundsSubject, SchemaNode[]>();

    for (const subject of SUBJECTS) {
      bySubject.set(subject, SUBJECT_SCHEMA_NODE_REGISTRY[subject]);
    }

    return {
      allSchemaNodes,
      bySubject,
      schemaNodeById: new Map(allSchemaNodes.map((node) => [node.id, node])),
      subjectNodeCounts: SUBJECTS.map((subject) => ({
        subject,
        count: SUBJECT_SCHEMA_NODE_REGISTRY[subject].length
      }))
    };
  });
}

export function getCurriculumIndex() {
  curriculumIndex ??= buildCurriculumIndex();
  return curriculumIndex;
}

export function getIndexedSchemaNodes(subject?: string | null) {
  const index = getCurriculumIndex();
  if (!subject) {
    return index.allSchemaNodes;
  }

  return index.bySubject.get(subject as RapidRoundsSubject) ?? [];
}

export function getIndexedSchemaNodeById(id: string) {
  return getCurriculumIndex().schemaNodeById.get(id);
}

export function getIndexedSubjectNodeCounts() {
  return getCurriculumIndex().subjectNodeCounts;
}

export function getCurriculumIndexStats() {
  return {
    curriculumIndexBuilds,
    schemaNodeCount: getCurriculumIndex().allSchemaNodes.length,
    subjectCount: SUBJECTS.length
  };
}

export function resetCurriculumIndexForTests() {
  curriculumIndex = undefined;
  curriculumIndexBuilds = 0;
}
