import {
  buildNbmeCoverageAuditReport,
  formatNbmeCoverageAuditSummary,
  writeNbmeCoverageAuditReport
} from "@/lib/nbme-coverage-audit";

const strict = process.argv.includes("--strict") || process.env.RAPIDROUNDS_NBME_AUDIT_STRICT === "1";
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg?.replace(/^--output=/, "") || "reports/nbme-schema-coverage.json";
const report = buildNbmeCoverageAuditReport({ strict });

writeNbmeCoverageAuditReport(report, outputPath);
console.log(formatNbmeCoverageAuditSummary(report));
console.log(`JSON report written to ${outputPath}`);

if (strict && report.summary.warningCount > 0) {
  console.error(`NBME coverage audit failed in strict mode with ${report.summary.warningCount} warning(s).`);
  process.exit(1);
}
