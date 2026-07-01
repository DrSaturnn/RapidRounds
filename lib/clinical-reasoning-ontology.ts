import type { MedicalFact } from "@/lib/anking-enrichment";
import { enrichKnowledgeObjectsWithAnKing, type KnowledgeObjectWithSupportingFacts } from "@/lib/anking-enrichment";
import type { KnowledgeObject } from "@/lib/curriculum-acquisition";

export type OntologyObjectType =
  | "clinical_pattern"
  | "schema"
  | "pivot_clue"
  | "supporting_clue"
  | "noise_clue"
  | "discriminator"
  | "competing_schema"
  | "common_misactivation"
  | "repair_operation"
  | "commit_rule"
  | "retrieval_prompt"
  | "source_card_reference";

export type OntologySourceKind = "anking_derived" | "cae_derived" | "manual_curated" | "hybrid";

export type SourceCardReference = {
  source: "anking";
  sourceCardId: string;
  medicalFactId: string;
  title: string;
  canonicalConcept: string;
  factType: MedicalFact["factType"];
  sourceHash: string;
};

export type OntologyActivation = {
  anchor_clue: string;
  pivot_clues: string[];
  supporting_clues: string[];
  noise_clues: string[];
};

export type OntologyCompetingSchema = {
  schema_id: string;
  why_confused: string;
  discriminator: string;
};

export type OntologyMisactivation = {
  learner_branch: string;
  error_type: string;
  repair: string;
};

export type OntologyRepairOperation = {
  operation_id: string;
  trigger: string;
  repair_statement: string;
};

export type ClinicalReasoningOntologyEntry = {
  object_type: "schema";
  source_kind: OntologySourceKind;
  schema_id: string;
  clinical_pattern: string;
  system: string;
  activation: OntologyActivation;
  schema_activation: {
    diagnosis_or_concept: string;
    concept_type: string;
    tested_decision: string;
  };
  competing_schemas: OntologyCompetingSchema[];
  common_misactivations: OntologyMisactivation[];
  repair_operations: OntologyRepairOperation[];
  commit_rule: string;
  retrieval_prompts: string[];
  source_card_references: SourceCardReference[];
  source_knowledge_object_ids: string[];
  ontology_objects: OntologyObjectType[];
  confidence: number;
  validation_warnings: string[];
};

export type ClinicalReasoningOntologyReport = {
  generatedAt: string;
  sourceKnowledgeObjectCount: number;
  sourceFactCount: number;
  ontologyEntryCount: number;
  entries: ClinicalReasoningOntologyEntry[];
  validation: OntologyValidationResult[];
  warnings: string[];
};

export type OntologyValidationResult = {
  schema_id: string;
  valid: boolean;
  missingFields: string[];
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
  return normalize(value).replace(/\s+/g, "_") || "unknown_schema";
}

function sentenceCase(value: string) {
  const clean = value.trim();
  if (!clean) return clean;
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`;
}

function dedupe(values: string[]) {
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

function sourceReferences(facts: MedicalFact[]): SourceCardReference[] {
  return facts.map((fact) => ({
    source: "anking",
    sourceCardId: fact.sourceCardId,
    medicalFactId: fact.id,
    title: fact.title,
    canonicalConcept: fact.canonicalConcept,
    factType: fact.factType,
    sourceHash: fact.sourceHash
  }));
}

function compactPattern(knowledge: KnowledgeObjectWithSupportingFacts) {
  return (
    knowledge.context[0] ||
    knowledge.illnessScript[0] ||
    knowledge.discriminatorPair?.conceptA ||
    knowledge.abstractConcept ||
    knowledge.topic
  );
}

function supportingCluesFrom(knowledge: KnowledgeObjectWithSupportingFacts) {
  const factClues = knowledge.supportingFacts.flatMap((fact) => [
    ...fact.managementPearls,
    ...fact.mechanisms,
    ...fact.contraindications,
    ...fact.facts
  ]);
  return dedupe([
    ...knowledge.supportingClues,
    ...knowledge.context,
    ...knowledge.illnessScript,
    ...factClues
  ])
    .filter((clue) => normalize(clue) !== normalize(knowledge.pivot))
    .slice(0, 8);
}

function competingSchemasFrom(knowledge: KnowledgeObjectWithSupportingFacts): OntologyCompetingSchema[] {
  const pair = knowledge.discriminatorPair;
  if (!pair?.conceptB || normalize(pair.conceptB) === normalize(pair.conceptA)) return [];
  return [
    {
      schema_id: slugify(pair.conceptB),
      why_confused: pair.conceptB === knowledge.commonTrap
        ? `${pair.conceptB} shares the broad presentation but fails at the pivot.`
        : `Shares overlap with ${pair.conceptA}.`,
      discriminator: pair.whatWouldSupportB
        ? `${pair.pivot} separates it; the alternative would need ${pair.whatWouldSupportB}.`
        : pair.pivot
    }
  ];
}

function commonMisactivationsFrom(knowledge: KnowledgeObjectWithSupportingFacts): OntologyMisactivation[] {
  const competing = knowledge.discriminatorPair?.conceptB || knowledge.commonTrap;
  if (!competing) return [];
  return [
    {
      learner_branch: `${knowledge.context[0] ?? knowledge.system} → ${competing}`,
      error_type: "activating a nearby schema before checking the pivot clue",
      repair: `${knowledge.pivot} carries more decision weight here and should move the learner toward ${knowledge.abstractConcept}.`
    }
  ];
}

function repairOperationsFrom(knowledge: KnowledgeObjectWithSupportingFacts): OntologyRepairOperation[] {
  const competing = knowledge.discriminatorPair?.conceptB || knowledge.commonTrap || "nearby schema";
  return [
    {
      operation_id: `${slugify(knowledge.abstractConcept)}_pivot_repair`,
      trigger: `Learner selects ${competing} or another nearby schema.`,
      repair_statement: `${knowledge.pivot} supports ${knowledge.abstractConcept}; ${knowledge.discriminatorPair?.whatWouldSupportB ?? "the alternative would need its own discriminator"}.`
    }
  ];
}

function retrievalPromptsFrom(knowledge: KnowledgeObjectWithSupportingFacts) {
  const prompts = [
    `${knowledge.pivot} should activate what diagnosis or concept?`,
    `What clue separates ${knowledge.abstractConcept} from ${knowledge.discriminatorPair?.conceptB || "the nearby schema"}?`
  ];
  if (knowledge.testedDecision && normalize(knowledge.testedDecision) !== normalize(knowledge.abstractConcept)) {
    prompts.push(`What decision is tested by ${knowledge.abstractConcept}?`);
  }
  return prompts;
}

export function ontologyEntryFromKnowledgeObject(knowledge: KnowledgeObjectWithSupportingFacts): ClinicalReasoningOntologyEntry {
  const sourceRefs = sourceReferences(knowledge.supportingFacts);
  const clinicalPattern = compactPattern(knowledge);
  const pivotClues = dedupe([
    knowledge.pivot,
    ...knowledge.semanticLinks.map((link) => link.sourceText),
    ...knowledge.supportingFacts.flatMap((fact) => fact.aliases.filter((alias) => normalize(alias) === normalize(knowledge.pivot)))
  ]).slice(0, 4);
  const supportingClues = supportingCluesFrom(knowledge);
  const competingSchemas = competingSchemasFrom(knowledge);
  const entry: ClinicalReasoningOntologyEntry = {
    object_type: "schema",
    source_kind: sourceRefs.length ? "hybrid" : "cae_derived",
    schema_id: slugify(knowledge.abstractConcept || knowledge.topic),
    clinical_pattern: clinicalPattern,
    system: knowledge.system,
    activation: {
      anchor_clue: knowledge.pivot,
      pivot_clues: pivotClues,
      supporting_clues: supportingClues,
      noise_clues: dedupe([
        knowledge.commonTrap,
        ...knowledge.unacceptableNearMisses,
        ...knowledge.discriminatorConcepts.filter((concept) => normalize(concept) !== normalize(knowledge.abstractConcept))
      ]).slice(0, 6)
    },
    schema_activation: {
      diagnosis_or_concept: knowledge.abstractConcept,
      concept_type: knowledge.conceptType,
      tested_decision: knowledge.testedDecision
    },
    competing_schemas: competingSchemas,
    common_misactivations: commonMisactivationsFrom(knowledge),
    repair_operations: repairOperationsFrom(knowledge),
    commit_rule: knowledge.nextTimeRule || `Use ${knowledge.pivot} before committing to ${knowledge.abstractConcept}.`,
    retrieval_prompts: retrievalPromptsFrom(knowledge),
    source_card_references: sourceRefs,
    source_knowledge_object_ids: [knowledge.id],
    ontology_objects: [
      "clinical_pattern",
      "schema",
      "pivot_clue",
      "supporting_clue",
      "noise_clue",
      "discriminator",
      "competing_schema",
      "common_misactivation",
      "repair_operation",
      "commit_rule",
      "retrieval_prompt",
      "source_card_reference"
    ],
    confidence: Number(Math.min(0.99, knowledge.confidence + (sourceRefs.length ? 0.04 : 0)).toFixed(2)),
    validation_warnings: []
  };
  const validation = validateOntologyEntry(entry);
  return {
    ...entry,
    validation_warnings: validation.warnings
  };
}

export function ontologyEntryFromMedicalFact(fact: MedicalFact): ClinicalReasoningOntologyEntry {
  const anchor = fact.managementPearls[0] || fact.contraindications[0] || fact.mechanisms[0] || fact.facts[0] || fact.canonicalConcept;
  const pattern = fact.facts.find((item) => /patient|symptom|present|finding|diagnos|treat/i.test(item)) || fact.title;
  const concept = fact.canonicalConcept;
  const supporting = dedupe([...fact.facts, ...fact.managementPearls, ...fact.mechanisms, ...fact.contraindications]).slice(0, 8);
  const entry: ClinicalReasoningOntologyEntry = {
    object_type: "schema",
    source_kind: "anking_derived",
    schema_id: slugify(concept),
    clinical_pattern: pattern,
    system: fact.shelfTags[0] || "unclassified",
    activation: {
      anchor_clue: anchor,
      pivot_clues: [anchor],
      supporting_clues: supporting.filter((item) => normalize(item) !== normalize(anchor)),
      noise_clues: []
    },
    schema_activation: {
      diagnosis_or_concept: concept,
      concept_type: fact.factType,
      tested_decision: fact.managementPearls[0] || concept
    },
    competing_schemas: [],
    common_misactivations: [],
    repair_operations: [
      {
        operation_id: `${slugify(concept)}_retrieval_repair`,
        trigger: `Learner fails to retrieve ${concept}.`,
        repair_statement: `${sentenceCase(anchor)} should bring ${concept} to mind.`
      }
    ],
    commit_rule: `Do not treat ${concept} as mastered until the learner can retrieve it from the clinical cue: ${anchor}.`,
    retrieval_prompts: [
      `${anchor} should activate what concept?`,
      `What high-yield fact is linked to ${concept}?`
    ],
    source_card_references: sourceReferences([fact]),
    source_knowledge_object_ids: [],
    ontology_objects: [
      "clinical_pattern",
      "schema",
      "pivot_clue",
      "supporting_clue",
      "repair_operation",
      "commit_rule",
      "retrieval_prompt",
      "source_card_reference"
    ],
    confidence: Math.max(0.35, Math.min(0.82, fact.confidence - 0.08)),
    validation_warnings: []
  };
  const validation = validateOntologyEntry(entry);
  return {
    ...entry,
    validation_warnings: validation.warnings
  };
}

export function mergeCuratedOntologyEntries(
  generatedEntries: ClinicalReasoningOntologyEntry[],
  curatedEntries: ClinicalReasoningOntologyEntry[] = []
) {
  const bySchema = new Map<string, ClinicalReasoningOntologyEntry>();
  for (const entry of generatedEntries) {
    bySchema.set(entry.schema_id, entry);
  }
  for (const curated of curatedEntries) {
    const existing = bySchema.get(curated.schema_id);
    bySchema.set(curated.schema_id, existing ? {
      ...existing,
      ...curated,
      source_kind: "manual_curated",
      source_card_references: dedupeSourceReferences([
        ...existing.source_card_references,
        ...curated.source_card_references
      ]),
      source_knowledge_object_ids: dedupe([...existing.source_knowledge_object_ids, ...curated.source_knowledge_object_ids]),
      ontology_objects: [...new Set([...existing.ontology_objects, ...curated.ontology_objects])],
      validation_warnings: validateOntologyEntry(curated).warnings
    } : curated);
  }
  return [...bySchema.values()];
}

function dedupeSourceReferences(references: SourceCardReference[]) {
  const seen = new Set<string>();
  const output: SourceCardReference[] = [];
  for (const reference of references) {
    const key = `${reference.source}:${reference.sourceCardId}:${reference.medicalFactId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(reference);
  }
  return output;
}

export function validateOntologyEntry(entry: ClinicalReasoningOntologyEntry): OntologyValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!entry.schema_id) missingFields.push("schema_id");
  if (!entry.clinical_pattern) missingFields.push("clinical_pattern");
  if (!entry.schema_activation.diagnosis_or_concept) missingFields.push("schema_activation.diagnosis_or_concept");
  if (!entry.activation.anchor_clue) missingFields.push("activation.anchor_clue");
  if (!entry.activation.pivot_clues.length) missingFields.push("activation.pivot_clues");
  if (!entry.commit_rule) missingFields.push("commit_rule");
  if (!entry.retrieval_prompts.length) missingFields.push("retrieval_prompts");
  if (!entry.source_card_references.length && !entry.source_knowledge_object_ids.length) {
    missingFields.push("source_card_references_or_source_knowledge_object_ids");
  }
  if (!entry.competing_schemas.length) {
    warnings.push("No competing schema/discriminator available yet.");
  }
  if (!entry.common_misactivations.length) {
    warnings.push("No common misactivation available yet.");
  }
  if (entry.confidence < 0.55) {
    warnings.push("Ontology entry should be reviewed before tutor use.");
  }

  return {
    schema_id: entry.schema_id,
    valid: missingFields.length === 0,
    missingFields,
    warnings
  };
}

export function buildClinicalReasoningOntology(
  knowledgeObjects: KnowledgeObject[],
  facts: MedicalFact[],
  options: {
    curatedEntries?: ClinicalReasoningOntologyEntry[];
    includeFactOnlyEntries?: boolean;
  } = {}
): ClinicalReasoningOntologyReport {
  const enrichment = enrichKnowledgeObjectsWithAnKing(knowledgeObjects, facts);
  const knowledgeEntries = enrichment.enrichedKnowledgeObjects.map(ontologyEntryFromKnowledgeObject);
  const matchedFactIds = new Set(enrichment.matches.map((match) => match.medicalFactId));
  const factOnlyEntries = options.includeFactOnlyEntries
    ? facts
        .filter((fact) => !matchedFactIds.has(fact.id))
        .map(ontologyEntryFromMedicalFact)
    : [];
  const entries = mergeCuratedOntologyEntries(
    [...knowledgeEntries, ...factOnlyEntries],
    options.curatedEntries
  );
  const validation = entries.map(validateOntologyEntry);

  return {
    generatedAt: new Date().toISOString(),
    sourceKnowledgeObjectCount: knowledgeObjects.length,
    sourceFactCount: facts.length,
    ontologyEntryCount: entries.length,
    entries,
    validation,
    warnings: validation.flatMap((result) => result.warnings.map((warning) => `${result.schema_id}: ${warning}`))
  };
}
