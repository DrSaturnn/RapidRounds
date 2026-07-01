import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildOntologyBenchmarkReport,
  formatOntologyBenchmarkSummary,
  ontologyBenchmarkCases,
  writeOntologyBenchmarkReport
} from "@/lib/ontology-benchmark";

const benchmarkMetrics = [
  "clinicalPattern",
  "schemaActivation",
  "competingSchemaNormalization",
  "pivotClue",
  "discriminator",
  "divergenceClassification",
  "repairOperation",
  "commitRule"
] as const;

describe("ontology benchmark suite", () => {
  it("defines a durable manually curated benchmark set across core NBME patterns", () => {
    assert.ok(ontologyBenchmarkCases.length >= 25);
    assert.ok(ontologyBenchmarkCases.length <= 50);
    assert.ok(ontologyBenchmarkCases.some((item) => item.shelf === "OB/GYN"));
    assert.ok(ontologyBenchmarkCases.some((item) => item.shelf === "Internal Medicine"));
    assert.ok(ontologyBenchmarkCases.some((item) => item.shelf === "Surgery"));

    for (const benchmark of ontologyBenchmarkCases) {
      assert.ok(benchmark.clinical_pattern);
      assert.ok(benchmark.correct_schema);
      assert.ok(benchmark.plausible_wrong_schema);
      assert.ok(benchmark.nbme_surface_terms.length > 0);
      assert.ok(benchmark.pivot_clue);
      assert.ok(benchmark.discriminator);
      assert.ok(benchmark.repair_operation);
      assert.ok(benchmark.commit_rule);
      assert.ok(benchmark.expected_reasoning_sequence.length >= 3);
      assert.equal(benchmark.plausible_wrong_schema.includes("/"), false);
    }
  });

  it("scores ontology reasoning quality instead of answer-choice text matching", () => {
    const report = buildOntologyBenchmarkReport();

    assert.equal(report.benchmarkCaseCount, ontologyBenchmarkCases.length);
    for (const metric of benchmarkMetrics) {
      assert.ok(report.summary[metric] >= 70, `${metric} should not regress below the reasoning-quality floor`);
    }
    assert.ok(report.summary.overall >= 80);

    for (const result of report.results) {
      assert.equal(result.generated.competing_schema_ids.some((id) => id.includes("/")), false);
      assert.ok(result.generated.pivot_clues.length > 0);
      assert.ok(result.generated.divergence_type);
      assert.ok(result.attending_evaluation.includes("reasoning") || result.attending_evaluation.includes("Needs review"));
    }
  });

  it("emits a report with failures explaining the earliest reasoning breakdown", () => {
    const report = buildOntologyBenchmarkReport();
    const tempRoot = mkdtempSync(join(tmpdir(), "rr-ontology-benchmark-"));
    const outputPath = join(tempRoot, "ontology-benchmark.json");

    try {
      writeOntologyBenchmarkReport(report, outputPath);
      const summary = formatOntologyBenchmarkSummary(report);
      const written = JSON.parse(readFileSync(outputPath, "utf8"));

      assert.ok(existsSync(outputPath));
      assert.equal(written.benchmarkCaseCount, ontologyBenchmarkCases.length);
      assert.ok(summary.includes("RapidRounds Ontology Benchmark"));
      assert.ok(summary.includes("Clinical pattern"));
      for (const result of report.results.filter((item) => item.failures.length > 0)) {
        for (const failure of result.failures) {
          assert.ok(failure.why.length > 20);
          assert.ok(failure.expected);
        }
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
