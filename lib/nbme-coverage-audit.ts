import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getGeneratedCasesForSubject } from "@/lib/seed-case-generator";
import { SUBJECTS, getSubjectSchemaNodes } from "@/lib/subject-seeds";
import type {
  GeneratedRapidRoundsCase,
  RapidRoundsSubject,
  SchemaNode
} from "@/lib/subject-seeds/seed-types";

export type BlueprintExpectation = {
  category: string;
  minPercent: number;
  maxPercent: number;
};

export type SchemaRequirementAudit = {
  id: string;
  topic: string;
  schemaName: string;
  blueprintCategory: string;
  hasPivotClue: boolean;
  hasDiscriminatorPair: boolean;
  hasSemanticLink: boolean;
  hasValidationSource: boolean;
  coreEligible: boolean;
  comprehensiveEligible: boolean;
};

export type BlueprintCategoryAudit = {
  category: string;
  expectedPercentageRange: string | null;
  observedSchemaPercentage: number;
  schemaNodeCount: number;
  coreCaseCount: number;
  comprehensiveCaseCount: number;
  topTopicsCovered: Array<{ topic: string; schemaNodes: number }>;
  missingOrThinCategories: string[];
  repeatedSchemaWarnings: string[];
  schemaRequirements: SchemaRequirementAudit[];
};

export type ShelfCoverageAudit = {
  shelf: RapidRoundsSubject;
  schemaNodeCount: number;
  coreCaseCount: number;
  comprehensiveCaseCount: number;
  categories: BlueprintCategoryAudit[];
  warnings: string[];
};

export type NbmeCoverageAuditReport = {
  generatedAt: string;
  strict: boolean;
  summary: {
    shelfCount: number;
    schemaNodeCount: number;
    coreCaseCount: number;
    comprehensiveCaseCount: number;
    warningCount: number;
  };
  shelves: ShelfCoverageAudit[];
};

export const INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS: BlueprintExpectation[] = [
  { category: "General Principles", minPercent: 5, maxPercent: 10 },
  { category: "Immunologic Disorders", minPercent: 1, maxPercent: 5 },
  { category: "Diseases of the Blood", minPercent: 5, maxPercent: 10 },
  { category: "Mental Disorders", minPercent: 1, maxPercent: 5 },
  { category: "Diseases of the Nervous System", minPercent: 5, maxPercent: 10 },
  { category: "Cardiovascular Disorders", minPercent: 10, maxPercent: 15 },
  { category: "Diseases of the Respiratory System", minPercent: 10, maxPercent: 15 },
  { category: "Nutritional and Digestive Disorders", minPercent: 10, maxPercent: 15 },
  { category: "Female Reproductive System", minPercent: 1, maxPercent: 5 },
  { category: "Renal, Urinary, Male Reproductive Systems", minPercent: 5, maxPercent: 10 },
  { category: "Diseases of the Skin", minPercent: 1, maxPercent: 5 },
  { category: "Musculoskeletal and Connective Tissue Disorders", minPercent: 1, maxPercent: 5 },
  { category: "Endocrine and Metabolic Disorders", minPercent: 8, maxPercent: 12 }
];

const expectationByCategory = new Map(
  INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS.map((expectation) => [expectation.category, expectation])
);

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function rangeLabel(expectation?: BlueprintExpectation) {
  return expectation ? `${expectation.minPercent}-${expectation.maxPercent}%` : null;
}

function topTopics(nodes: SchemaNode[]) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    counts.set(node.topic, (counts.get(node.topic) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([topic, schemaNodes]) => ({ topic, schemaNodes }));
}

function schemaRequirements(nodes: SchemaNode[]): SchemaRequirementAudit[] {
  return nodes.map((node) => ({
    id: node.id,
    topic: node.topic,
    schemaName: node.schemaName,
    blueprintCategory: node.nbmeBlueprintCategory,
    hasPivotClue: Boolean(node.pivotClue && node.pivotClues.length > 0),
    hasDiscriminatorPair: Boolean(
      node.discriminatorPair?.conceptA &&
      node.discriminatorPair?.conceptB &&
      node.discriminatorPair?.pivotThatSeparates
    ),
    hasSemanticLink: node.semanticLinks.some((link) => Boolean(link.sourceText && link.relationship && link.targetConcept)),
    hasValidationSource: node.sourcePolicyMetadata.validationSources.length > 0 || node.guidelineReferences.length > 0,
    coreEligible: node.caseTierEligibility.core,
    comprehensiveEligible: node.caseTierEligibility.comprehensive
  }));
}

function categoryForCase(generatedCase: GeneratedRapidRoundsCase) {
  return generatedCase.schemaNode?.nbmeBlueprintCategory ?? "Unmapped generated case";
}

function warningsForSchemaRequirements(requirements: SchemaRequirementAudit[]) {
  return requirements.flatMap((requirement) => {
    const warnings: string[] = [];
    if (!requirement.hasPivotClue) warnings.push(`${requirement.id} lacks a pivot clue.`);
    if (!requirement.hasDiscriminatorPair) warnings.push(`${requirement.id} lacks a discriminator pair.`);
    if (!requirement.hasSemanticLink) warnings.push(`${requirement.id} lacks a semantic link.`);
    if (!requirement.hasValidationSource) warnings.push(`${requirement.id} lacks a guideline/public validation source.`);
    if (!requirement.coreEligible && !requirement.comprehensiveEligible) {
      warnings.push(`${requirement.id} is not eligible for Core or Comprehensive packaging.`);
    }
    return warnings;
  });
}

function repeatedSchemaWarnings(cases: GeneratedRapidRoundsCase[]) {
  const groups = new Map<string, GeneratedRapidRoundsCase[]>();

  for (const generatedCase of cases) {
    const schemaId = generatedCase.schemaNode?.id ?? generatedCase.id;
    const pivot = generatedCase.schemaNode?.pivotClue ?? generatedCase.clueMap.find((clue) => clue.role === "pivot_clue")?.text ?? "";
    const key = [schemaId, pivot.toLowerCase(), generatedCase.correctAnswer.toLowerCase()].join("::");
    const grouped = groups.get(key) ?? [];
    grouped.push(generatedCase);
    groups.set(key, grouped);
  }

  return [...groups.entries()]
    .filter(([, grouped]) => grouped.length >= 3)
    .map(([key, grouped]) => {
      const [schemaId] = key.split("::");
      const variants = new Set(grouped.map((item) => item.variantTemplate?.composition ?? "unknown"));
      return `${schemaId} repeats the same schema/pivot/correct answer across ${grouped.length} cases (${variants.size} variant compositions).`;
    });
}

function caseQualityWarnings(coreCases: GeneratedRapidRoundsCase[], comprehensiveCases: GeneratedRapidRoundsCase[]) {
  const warnings: string[] = [];

  for (const generatedCase of coreCases) {
    const wordCount = generatedCase.vignette.split(/\s+/).filter(Boolean).length;
    const pivot = generatedCase.schemaNode?.pivotClue;
    if (wordCount > 45) {
      warnings.push(`${generatedCase.id} Core case is long (${wordCount} words); Core cases should stay concise and pivot-driven.`);
    }
    if (pivot && !generatedCase.vignette.toLowerCase().includes(pivot.toLowerCase())) {
      warnings.push(`${generatedCase.id} Core case does not visibly include its pivot clue.`);
    }
  }

  for (const generatedCase of comprehensiveCases) {
    if (generatedCase.variantTemplate?.breadth !== "comprehensive") continue;
    const hasBreadthSignal = Boolean(
      generatedCase.schemaNode?.priorInterventions.length ||
      generatedCase.schemaNode?.downstreamStateChanges.length ||
      /already received|fails to improve|after|does not follow the expected course|reassessed/i.test(generatedCase.vignette)
    );
    if (!hasBreadthSignal) {
      warnings.push(`${generatedCase.id} Comprehensive case may not add downstream or breadth context.`);
    }
  }

  return warnings;
}

function categoryAudit(
  subject: RapidRoundsSubject,
  category: string,
  nodes: SchemaNode[],
  allNodes: SchemaNode[],
  coreCases: GeneratedRapidRoundsCase[],
  comprehensiveCases: GeneratedRapidRoundsCase[]
): BlueprintCategoryAudit {
  const categoryCoreCases = coreCases.filter((generatedCase) => categoryForCase(generatedCase) === category);
  const categoryComprehensiveCases = comprehensiveCases.filter((generatedCase) => categoryForCase(generatedCase) === category);
  const expectation = subject === "Internal Medicine" ? expectationByCategory.get(category) : undefined;
  const requirements = schemaRequirements(nodes);
  const missingOrThinCategories: string[] = [];

  if (nodes.length === 0) {
    missingOrThinCategories.push(`${category} has zero SchemaNodes.`);
  }

  if (expectation) {
    const observed = percent(nodes.length, allNodes.length);
    const isHighYield = expectation.maxPercent >= 10 || expectation.minPercent >= 8;
    if (isHighYield && observed < expectation.minPercent) {
      missingOrThinCategories.push(
        `${category} is underrepresented for Internal Medicine (${observed}% observed vs ${rangeLabel(expectation)} expected).`
      );
    }
    if (expectation.maxPercent <= 5 && categoryComprehensiveCases.length === 0) {
      missingOrThinCategories.push(`${category} is low-yield but missing from Comprehensive packaging.`);
    }
  }

  return {
    category,
    expectedPercentageRange: rangeLabel(expectation),
    observedSchemaPercentage: percent(nodes.length, allNodes.length),
    schemaNodeCount: nodes.length,
    coreCaseCount: categoryCoreCases.length,
    comprehensiveCaseCount: categoryComprehensiveCases.length,
    topTopicsCovered: topTopics(nodes),
    missingOrThinCategories,
    repeatedSchemaWarnings: repeatedSchemaWarnings(categoryComprehensiveCases),
    schemaRequirements: requirements
  };
}

function categoriesForSubject(subject: RapidRoundsSubject, nodes: SchemaNode[]) {
  const categories = new Set(nodes.map((node) => node.nbmeBlueprintCategory));
  if (subject === "Internal Medicine") {
    for (const expectation of INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS) {
      categories.add(expectation.category);
    }
  }

  return [...categories].sort((left, right) => {
    const leftExpected = expectationByCategory.get(left);
    const rightExpected = expectationByCategory.get(right);
    if (leftExpected && rightExpected) {
      return INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS.indexOf(leftExpected) -
        INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS.indexOf(rightExpected);
    }
    if (leftExpected) return -1;
    if (rightExpected) return 1;
    return left.localeCompare(right);
  });
}

function auditShelf(subject: RapidRoundsSubject): ShelfCoverageAudit {
  const nodes = getSubjectSchemaNodes(subject);
  const coreCases = getGeneratedCasesForSubject(subject, "primary");
  const comprehensiveCases = getGeneratedCasesForSubject(subject, "comprehensive");
  const categories = categoriesForSubject(subject, nodes).map((category) =>
    categoryAudit(
      subject,
      category,
      nodes.filter((node) => node.nbmeBlueprintCategory === category),
      nodes,
      coreCases,
      comprehensiveCases
    )
  );
  const warnings = [
    ...categories.flatMap((category) => category.missingOrThinCategories),
    ...categories.flatMap((category) => category.repeatedSchemaWarnings),
    ...categories.flatMap((category) => warningsForSchemaRequirements(category.schemaRequirements)),
    ...caseQualityWarnings(coreCases, comprehensiveCases)
  ];

  return {
    shelf: subject,
    schemaNodeCount: nodes.length,
    coreCaseCount: coreCases.length,
    comprehensiveCaseCount: comprehensiveCases.length,
    categories,
    warnings
  };
}

export function buildNbmeCoverageAuditReport(options: { strict?: boolean } = {}): NbmeCoverageAuditReport {
  const shelves = SUBJECTS.map(auditShelf);
  const warningCount = shelves.reduce((count, shelf) => count + shelf.warnings.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    strict: Boolean(options.strict),
    summary: {
      shelfCount: shelves.length,
      schemaNodeCount: shelves.reduce((count, shelf) => count + shelf.schemaNodeCount, 0),
      coreCaseCount: shelves.reduce((count, shelf) => count + shelf.coreCaseCount, 0),
      comprehensiveCaseCount: shelves.reduce((count, shelf) => count + shelf.comprehensiveCaseCount, 0),
      warningCount
    },
    shelves
  };
}

export function writeNbmeCoverageAuditReport(
  report: NbmeCoverageAuditReport,
  outputPath = "reports/nbme-schema-coverage.json"
) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function formatNbmeCoverageAuditSummary(report: NbmeCoverageAuditReport) {
  const lines = [
    "NBME Schema Coverage Audit",
    `Generated: ${report.generatedAt}`,
    `Shelves: ${report.summary.shelfCount}`,
    `SchemaNodes: ${report.summary.schemaNodeCount}`,
    `Core cases: ${report.summary.coreCaseCount}`,
    `Comprehensive cases: ${report.summary.comprehensiveCaseCount}`,
    `Warnings: ${report.summary.warningCount}`,
    ""
  ];

  for (const shelf of report.shelves) {
    lines.push(`${shelf.shelf}: ${shelf.schemaNodeCount} SchemaNodes, ${shelf.coreCaseCount} Core cases, ${shelf.comprehensiveCaseCount} Comprehensive cases`);
    for (const category of shelf.categories) {
      const expected = category.expectedPercentageRange ? ` expected ${category.expectedPercentageRange}` : "";
      lines.push(
        `  - ${category.category}: ${category.schemaNodeCount} nodes (${category.observedSchemaPercentage}%)${expected}; ` +
        `${category.coreCaseCount} Core / ${category.comprehensiveCaseCount} Comprehensive`
      );
      if (category.topTopicsCovered.length > 0) {
        lines.push(`    Top topics: ${category.topTopicsCovered.map((topic) => `${topic.topic} (${topic.schemaNodes})`).join(", ")}`);
      }
      for (const warning of category.missingOrThinCategories.slice(0, 3)) {
        lines.push(`    WARN: ${warning}`);
      }
    }
    if (shelf.warnings.length > 0) {
      lines.push(`  Shelf warnings: ${shelf.warnings.length}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
