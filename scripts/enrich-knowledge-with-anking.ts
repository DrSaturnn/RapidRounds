import { readFileSync } from "node:fs";
import {
  enrichKnowledgeObjectsWithAnKing,
  importAnKingDirectory,
  importAnKingFile,
  type AnKingImportReport,
  type MedicalFact,
  writeAnKingEnrichmentReports,
  writeAnKingImportReports
} from "@/lib/anking-enrichment";
import type { CurriculumAcquisitionReport, KnowledgeObject } from "@/lib/curriculum-acquisition";

function valueAfter(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readKnowledgeObjects(path: string): KnowledgeObject[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as CurriculumAcquisitionReport | KnowledgeObject[];
  return Array.isArray(parsed) ? parsed : parsed.knowledgeObjects;
}

function readFacts(path: string): MedicalFact[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as AnKingImportReport | MedicalFact[];
  return Array.isArray(parsed) ? parsed : parsed.facts;
}

const knowledgePath = valueAfter("--knowledge");
const ankingFile = valueAfter("--anking-file");
const ankingDirectory = valueAfter("--anking-directory");
const factsPath = valueAfter("--facts");
const outputDirectory = valueAfter("--out") ?? "reports";

if (!knowledgePath || ((!ankingFile && !ankingDirectory && !factsPath) || [ankingFile, ankingDirectory, factsPath].filter(Boolean).length > 1)) {
  console.error("Usage: pnpm enrich:anking --knowledge reports/curriculum-acquisition.json --anking-file anking.txt");
  console.error("   or: pnpm enrich:anking --knowledge reports/curriculum-acquisition.json --anking-directory ./anking-export");
  console.error("   or: pnpm enrich:anking --knowledge reports/curriculum-acquisition.json --facts reports/anking-import-summary.json");
  process.exit(1);
}

const knowledgeObjects = readKnowledgeObjects(knowledgePath);
const importReport = factsPath
  ? undefined
  : ankingFile
    ? importAnKingFile(ankingFile)
    : importAnKingDirectory(ankingDirectory!);
const facts = factsPath ? readFacts(factsPath) : importReport!.facts;
const visualMemories = factsPath ? undefined : importReport!.visualMemories;

if (importReport) {
  writeAnKingImportReports(importReport, outputDirectory);
}

const report = enrichKnowledgeObjectsWithAnKing(knowledgeObjects, facts, visualMemories);
writeAnKingEnrichmentReports(report, outputDirectory);

console.log([
  "AnKing enrichment complete",
  `knowledge objects: ${report.knowledgeObjectCount}`,
  `facts: ${report.factCount}`,
  `enriched objects: ${report.enrichedKnowledgeObjectCount}`,
  `matches: ${report.matches.length}`,
  `unmatched facts: ${report.unmatchedFacts.length}`,
  `visual memories: ${report.visualMemories.length}`,
  `primary images selected: ${report.imageRankings.filter((ranking) => ranking.selectedRole === "primary").length}`,
  `related images selected: ${report.imageRankings.filter((ranking) => ranking.selectedRole === "related").length}`,
  `unmatched images: ${report.unmatchedImages.length}`
].join("\n"));
