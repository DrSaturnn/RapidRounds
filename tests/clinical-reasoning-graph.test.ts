import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildClinicalReasoningGraph,
  buildClinicalReasoningTrace,
  evaluateLearnerBranch,
} from "@/lib/clinical-reasoning-graph";
import type { ClinicalReasoningOntologyEntry } from "@/lib/clinical-reasoning-ontology";

function placentaPreviaEntry(): ClinicalReasoningOntologyEntry {
  return {
    object_type: "schema",
    source_kind: "manual_curated",
    schema_id: "placenta_previa",
    clinical_pattern: "third-trimester bleeding",
    system: "reproductive",
    activation: {
      anchor_clue: "third-trimester bleeding",
      pivot_clues: ["painless bright red bleeding"],
      supporting_clues: ["soft nontender uterus", "stable vital signs"],
      noise_clues: ["multiparity"],
    },
    schema_activation: {
      diagnosis_or_concept: "placenta previa",
      canonical_schema_id: "placenta_previa",
      canonical_name: "Placenta previa",
      nbme_surface_terms: ["painless bleeding", "bright red bleeding", "soft nontender uterus"],
      answer_choice_aliases: ["placenta previa"],
      concept_type: "diagnosis",
      tested_decision: "identify the diagnosis causing third-trimester bleeding",
    },
    competing_schemas: [
      {
        schema_id: "placental_abruption",
        canonical_schema_id: "placental_abruption",
        canonical_name: "Placental abruption",
        nbme_surface_terms: ["painful bleeding", "uterine tenderness", "contractions", "fetal distress"],
        answer_choice_aliases: ["placental abruption", "abruption"],
        why_confused: "Both schemas present with third-trimester bleeding.",
        discriminator: "Abruption should have pain, uterine tenderness, contractions, or fetal distress rather than painless bleeding.",
      },
    ],
    common_misactivations: [
      {
        learner_branch: "third-trimester bleeding -> placental abruption",
        divergence_type: "Missed pivot clue",
        error_type: "promoted shared presentation above discriminator",
        repair: "Use pain and uterine tenderness to separate abruption from previa.",
      },
    ],
    repair_operations: [
      {
        operation_id: "repair-previa-vs-abruption",
        trigger: "learner selects placental abruption",
        repair_statement: "Painless bleeding with a soft uterus should prune abruption and commit to previa.",
      },
    ],
    commit_rule: "Third-trimester painless bleeding should commit to placenta previa until proven otherwise.",
    retrieval_prompts: ["What clue separates placenta previa from placental abruption?"],
    source_card_references: [],
    source_knowledge_object_ids: ["ko-placenta-previa"],
    ontology_objects: [
      "clinical_pattern",
      "schema",
      "pivot_clue",
      "discriminator",
      "competing_schema",
      "common_misactivation",
      "repair_operation",
      "commit_rule",
      "retrieval_prompt",
    ],
    confidence: 0.94,
    validation_warnings: [],
  };
}

describe("clinical reasoning graph", () => {
  it("derives pivot-weighted transitions from ontology entries", () => {
    const trace = buildClinicalReasoningTrace(placentaPreviaEntry());

    assert.equal(trace.clinicalPattern, "third-trimester bleeding");
    assert.equal(trace.expertBranch.schemaId, "placenta_previa");
    assert.equal(trace.competingBranches[0].schemaId, "placental_abruption");
    assert.equal(trace.dominantTransition?.pivotClue, "painless bright red bleeding");
    assert.equal(trace.dominantTransition?.evidenceWeight, "pivot");
    assert.equal(trace.dominantTransition?.sourceOntologySchemaId, "placenta_previa");
  });

  it("models learner divergence as a branch away from the expert transition", () => {
    const trace = buildClinicalReasoningTrace(placentaPreviaEntry());
    const divergence = evaluateLearnerBranch(trace, "placental abruption");

    assert.equal(divergence?.learnerSchemaId, "placental_abruption");
    assert.equal(divergence?.divergenceType, "Missed pivot clue");
    assert.match(divergence?.learnerBranch ?? "", /abruption/i);
    assert.match(divergence?.expertBranch ?? "", /painless bright red bleeding/i);
    assert.match(divergence?.repairOperation ?? "", /prune abruption/i);
  });

  it("builds a graph without mutating ontology entries", () => {
    const entry = placentaPreviaEntry();
    const before = JSON.stringify(entry);
    const graph = buildClinicalReasoningGraph([entry]);

    assert.equal(graph.traceCount, 1);
    assert.equal(graph.transitionCount, 1);
    assert.equal(graph.warnings.length, 0);
    assert.equal(JSON.stringify(entry), before);
  });

  it("preserves source references for future tutor and benchmark use", () => {
    const trace = buildClinicalReasoningTrace(placentaPreviaEntry());

    assert.deepEqual(trace.sourceKnowledgeObjectIds, ["ko-placenta-previa"]);
    assert.deepEqual(trace.retrievalPrompts, ["What clue separates placenta previa from placental abruption?"]);
    assert.equal(trace.commitRule, "Third-trimester painless bleeding should commit to placenta previa until proven otherwise.");
  });
});
