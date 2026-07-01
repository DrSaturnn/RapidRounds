import {
  buildOntologyBenchmarkReport,
  formatOntologyBenchmarkSummary,
  writeOntologyBenchmarkReport
} from "@/lib/ontology-benchmark";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg?.replace(/^--output=/, "") || "reports/ontology-benchmark.json";
const strict = process.argv.includes("--strict");
const minOverallArg = process.argv.find((arg) => arg.startsWith("--min-overall="));
const minOverall = minOverallArg ? Number(minOverallArg.replace(/^--min-overall=/, "")) : 80;

const report = buildOntologyBenchmarkReport();
writeOntologyBenchmarkReport(report, outputPath);

console.log(formatOntologyBenchmarkSummary(report));
console.log(`JSON report written to ${outputPath}`);

if (strict && report.summary.overall < minOverall) {
  console.error(`Ontology benchmark failed strict mode: ${report.summary.overall}% < ${minOverall}%.`);
  process.exit(1);
}
