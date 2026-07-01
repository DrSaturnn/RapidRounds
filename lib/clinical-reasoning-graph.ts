import type {
  ClinicalReasoningOntologyEntry,
  OntologyCompetingSchema,
  OntologyDivergenceType,
} from "@/lib/clinical-reasoning-ontology";

export type ReasoningRelationship = "proves" | "supports" | "rules_out" | "activates" | "explains";

export type EvidenceWeight = "pivot" | "supporting" | "noise";

export type ReasoningBranch = {
  schemaId: string;
  schemaName: string;
  clinicalPattern: string;
  cues: string[];
};

export type ReasoningDivergence = {
  learnerSchemaId?: string;
  learnerBranch: string;
  expertBranch: string;
  divergenceType: OntologyDivergenceType;
  repairOperation: string;
};

export type ClinicalReasoningTransition = {
  id: string;
  fromClinicalPattern: string;
  activatedSchemaId: string;
  activatedSchemaName: string;
  competingSchemaId?: string;
  competingSchemaName?: string;
  pivotClue: string;
  relationship: ReasoningRelationship;
  evidenceWeight: EvidenceWeight;
  whyThisTransition: string;
  divergence?: ReasoningDivergence;
  commitRule: string;
  sourceOntologySchemaId: string;
};

export type ClinicalReasoningTrace = {
  ontologySchemaId: string;
  clinicalPattern: string;
  expertBranch: ReasoningBranch;
  competingBranches: ReasoningBranch[];
  transitions: ClinicalReasoningTransition[];
  dominantTransition?: ClinicalReasoningTransition;
  commitRule: string;
  retrievalPrompts: string[];
  sourceKnowledgeObjectIds: string[];
  sourceCardIds: string[];
  confidence: number;
};

export type ClinicalReasoningGraph = {
  generatedAt: string;
  traceCount: number;
  traces: ClinicalReasoningTrace[];
  transitionCount: number;
  warnings: string[];
};

function normalize(value: string | undefined | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalize(value).replace(/\s+/g, "_") || "unknown";
}

function firstMeaningful(values: Array<string | undefined | null>, fallback: string) {
  return values.find((value) => value && value.trim().length > 0)?.trim() ?? fallback;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const key = normalize(cleaned);
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
  }
  return output;
}

function relationshipForTransition(entry: ClinicalReasoningOntologyEntry, competing?: OntologyCompetingSchema): ReasoningRelationship {
  const pivot = normalize(entry.activation.pivot_clues[0]);
  const discriminator = normalize(competing?.discriminator);
  const commitRule = normalize(entry.commit_rule);

  if (discriminator.includes("rather than") || discriminator.includes("rules out") || commitRule.includes("unless")) {
    return "rules_out";
  }

  if (pivot && (discriminator.includes(pivot) || commitRule.includes(pivot))) {
    return "proves";
  }

  return "supports";
}

function transitionExplanation(entry: ClinicalReasoningOntologyEntry, competing?: OntologyCompetingSchema) {
  const pivot = firstMeaningful(entry.activation.pivot_clues, entry.activation.anchor_clue);
  const target = entry.schema_activation.canonical_name;

  if (competing) {
    return `${pivot} moves the reasoning toward ${target} and separates it from ${competing.canonical_name}.`;
  }

  return `${pivot} moves the reasoning toward ${target}.`;
}

function divergenceFor(entry: ClinicalReasoningOntologyEntry, competing?: OntologyCompetingSchema): ReasoningDivergence | undefined {
  const misactivation = entry.common_misactivations[0];
  const repair = entry.repair_operations[0];

  if (!misactivation && !repair && !competing) return undefined;

  const learnerSchemaName = competing?.canonical_name ?? "a competing schema";
  return {
    learnerSchemaId: competing?.canonical_schema_id ?? competing?.schema_id,
    learnerBranch: misactivation?.learner_branch ?? `${entry.clinical_pattern} -> ${learnerSchemaName}`,
    expertBranch: `${entry.clinical_pattern} -> ${entry.activation.pivot_clues[0] ?? entry.activation.anchor_clue} -> ${entry.schema_activation.canonical_name}`,
    divergenceType: misactivation?.divergence_type ?? "Failure to prune competing diagnosis",
    repairOperation: repair?.repair_statement ?? misactivation?.repair ?? entry.commit_rule,
  };
}

function branchFromCompeting(entry: ClinicalReasoningOntologyEntry, schema: OntologyCompetingSchema): ReasoningBranch {
  return {
    schemaId: schema.canonical_schema_id || schema.schema_id,
    schemaName: schema.canonical_name,
    clinicalPattern: entry.clinical_pattern,
    cues: unique([schema.why_confused, schema.discriminator, ...schema.nbme_surface_terms]),
  };
}

export function buildClinicalReasoningTrace(entry: ClinicalReasoningOntologyEntry): ClinicalReasoningTrace {
  const pivotClue = firstMeaningful(entry.activation.pivot_clues, entry.activation.anchor_clue);
  const expertBranch: ReasoningBranch = {
    schemaId: entry.schema_activation.canonical_schema_id,
    schemaName: entry.schema_activation.canonical_name,
    clinicalPattern: entry.clinical_pattern,
    cues: unique([
      entry.activation.anchor_clue,
      ...entry.activation.pivot_clues,
      ...entry.activation.supporting_clues,
      ...entry.schema_activation.nbme_surface_terms,
    ]),
  };

  const competingBranches = entry.competing_schemas.map((schema) => branchFromCompeting(entry, schema));
  const transitionTargets = entry.competing_schemas.length > 0 ? entry.competing_schemas : [undefined];
  const transitions: ClinicalReasoningTransition[] = transitionTargets.map((competing, index) => ({
    id: `${entry.schema_id}:${slugify(pivotClue)}:${competing?.canonical_schema_id ?? "commit"}:${index}`,
    fromClinicalPattern: entry.clinical_pattern,
    activatedSchemaId: entry.schema_activation.canonical_schema_id,
    activatedSchemaName: entry.schema_activation.canonical_name,
    competingSchemaId: competing?.canonical_schema_id ?? competing?.schema_id,
    competingSchemaName: competing?.canonical_name,
    pivotClue,
    relationship: relationshipForTransition(entry, competing),
    evidenceWeight: "pivot",
    whyThisTransition: transitionExplanation(entry, competing),
    divergence: divergenceFor(entry, competing),
    commitRule: entry.commit_rule,
    sourceOntologySchemaId: entry.schema_id,
  }));

  return {
    ontologySchemaId: entry.schema_id,
    clinicalPattern: entry.clinical_pattern,
    expertBranch,
    competingBranches,
    transitions,
    dominantTransition: transitions[0],
    commitRule: entry.commit_rule,
    retrievalPrompts: entry.retrieval_prompts,
    sourceKnowledgeObjectIds: entry.source_knowledge_object_ids,
    sourceCardIds: entry.source_card_references.map((reference) => reference.sourceCardId),
    confidence: entry.confidence,
  };
}

export function evaluateLearnerBranch(trace: ClinicalReasoningTrace, learnerSchemaIdOrName: string): ReasoningDivergence | undefined {
  const learnerKey = normalize(learnerSchemaIdOrName);
  const transition = trace.transitions.find((candidate) => {
    return (
      normalize(candidate.competingSchemaId) === learnerKey ||
      normalize(candidate.competingSchemaName) === learnerKey ||
      normalize(candidate.divergence?.learnerSchemaId) === learnerKey
    );
  });

  return transition?.divergence;
}

export function buildClinicalReasoningGraph(entries: ClinicalReasoningOntologyEntry[]): ClinicalReasoningGraph {
  const traces = entries.map((entry) => buildClinicalReasoningTrace(entry));
  const warnings = traces.flatMap((trace) => {
    const traceWarnings: string[] = [];
    if (trace.transitions.length === 0) {
      traceWarnings.push(`${trace.ontologySchemaId}: no reasoning transitions generated.`);
    }
    if (!trace.dominantTransition?.pivotClue) {
      traceWarnings.push(`${trace.ontologySchemaId}: no pivot clue available for graph transition.`);
    }
    if (trace.competingBranches.length === 0) {
      traceWarnings.push(`${trace.ontologySchemaId}: no competing schemas available for pruning.`);
    }
    return traceWarnings;
  });

  return {
    generatedAt: new Date().toISOString(),
    traceCount: traces.length,
    traces,
    transitionCount: traces.reduce((sum, trace) => sum + trace.transitions.length, 0),
    warnings,
  };
}
