import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { describe, it } from "node:test";
import {
  INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS,
  buildNbmeCoverageAuditReport,
  formatNbmeCoverageAuditSummary,
  writeNbmeCoverageAuditReport
} from "@/lib/nbme-coverage-audit";
import type { BlueprintCategoryAudit } from "@/lib/nbme-coverage-audit";
import { SUBJECTS } from "@/lib/subject-seeds";

describe("NBME schema coverage audit", () => {
  it("audits every shelf with schema, Core case, and Comprehensive case counts", () => {
    const report = buildNbmeCoverageAuditReport();

    assert.equal(report.summary.shelfCount, SUBJECTS.length);
    assert.ok(report.summary.schemaNodeCount > 0);
    assert.ok(report.summary.coreCaseCount > 0);
    assert.ok(report.summary.comprehensiveCaseCount > report.summary.coreCaseCount);

    for (const subject of SUBJECTS) {
      const shelf = report.shelves.find((item) => item.shelf === subject);
      assert.ok(shelf, `${subject} should be present in the audit`);
      assert.ok(shelf.schemaNodeCount > 0, `${subject} should have SchemaNodes`);
      assert.ok(shelf.coreCaseCount > 0, `${subject} should have Core cases`);
      assert.ok(shelf.comprehensiveCaseCount > 0, `${subject} should have Comprehensive cases`);
      assert.ok(shelf.categories.length > 0, `${subject} should have blueprint categories`);
    }
  });

  it("explicitly compares Internal Medicine categories against the requested blueprint ranges", () => {
    const report = buildNbmeCoverageAuditReport();
    const internalMedicine = report.shelves.find((shelf) => shelf.shelf === "Internal Medicine");
    if (!internalMedicine) {
      assert.fail("Internal Medicine should be included in the audit");
    }

    for (const expectation of INTERNAL_MEDICINE_BLUEPRINT_EXPECTATIONS) {
      const categoryAudit: BlueprintCategoryAudit | undefined = internalMedicine.categories.find((item) => item.category === expectation.category);
      assert.ok(categoryAudit, `${expectation.category} should be included`);
      assert.equal(categoryAudit.expectedPercentageRange, `${expectation.minPercent}-${expectation.maxPercent}%`);
      assert.ok(categoryAudit.schemaNodeCount > 0, `${expectation.category} should currently have SchemaNodes`);
      assert.ok(categoryAudit.comprehensiveCaseCount > 0, `${expectation.category} should appear in Comprehensive packaging`);
    }
  });

  it("reports required semantic fields for every schema node", () => {
    const report = buildNbmeCoverageAuditReport();
    const requirements = report.shelves.flatMap((shelf) =>
      shelf.categories.flatMap((category) => category.schemaRequirements)
    );

    assert.ok(requirements.length > 0);
    assert.ok(requirements.every((requirement) => requirement.hasPivotClue));
    assert.ok(requirements.every((requirement) => requirement.hasDiscriminatorPair));
    assert.ok(requirements.every((requirement) => requirement.hasSemanticLink));
    assert.ok(requirements.every((requirement) => requirement.hasValidationSource));
    assert.ok(requirements.every((requirement) => requirement.coreEligible || requirement.comprehensiveEligible));
  });

  it("surfaces warnings for thin categories, repetition, or case-quality risks without changing generation", () => {
    const report = buildNbmeCoverageAuditReport();

    assert.ok(report.summary.warningCount > 0);
    assert.ok(
      report.shelves.some((shelf) =>
        shelf.warnings.some((warning) =>
          /underrepresented|repeats the same schema|Comprehensive case may not add downstream|Core case is long/i.test(warning)
        )
      )
    );
  });

  it("formats console output and writes the JSON report", () => {
    const outputPath = "/private/tmp/rapidrounds-nbme-schema-coverage-test.json";
    rmSync(outputPath, { force: true });

    const report = buildNbmeCoverageAuditReport();
    const summary = formatNbmeCoverageAuditSummary(report);
    writeNbmeCoverageAuditReport(report, outputPath);

    assert.match(summary, /NBME Schema Coverage Audit/);
    assert.match(summary, /Internal Medicine/);
    assert.ok(existsSync(outputPath));

    const written = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(written.summary.schemaNodeCount, report.summary.schemaNodeCount);
    assert.equal(written.shelves.length, SUBJECTS.length);
  });
});
