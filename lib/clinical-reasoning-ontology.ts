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
  canonical_schema_id: string;
  canonical_name: string;
  nbme_surface_terms: string[];
  answer_choice_aliases: string[];
  why_confused: string;
  discriminator: string;
};

type CanonicalCompetitorSchema = {
  schema_id: string;
  label: string;
  group: string;
  sharedPattern: string;
  aliases: string[];
  nbmeSurfaceTerms: string[];
  answerChoiceAliases: string[];
  discriminator: string;
};

export type OntologyMisactivation = {
  learner_branch: string;
  divergence_type: OntologyDivergenceType;
  error_type: string;
  repair: string;
};

export type OntologyDivergenceType =
  | "Missed pivot clue"
  | "Promoted low-information clue"
  | "Premature schema activation"
  | "Failure to prune competing diagnosis"
  | "Incorrect illness script activation"
  | "Failure to recognize clinical pattern"
  | "Misweighted discriminator"
  | "Over-expanded differential"
  | "Pattern recognized but commitment delayed";

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
    canonical_schema_id: string;
    canonical_name: string;
    nbme_surface_terms: string[];
    answer_choice_aliases: string[];
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

function dedupe(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const cleaned = value.replace(/\s+/g, " ").trim();
    const key = normalize(cleaned);
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
  }
  return output;
}

function asStringArray(values: string[] | string | undefined | null) {
  if (Array.isArray(values)) return values;
  if (typeof values === "string") return [values];
  return [];
}

const canonicalCompetitorSchemas: CanonicalCompetitorSchema[] = [
  {
    schema_id: "bacterial_vaginosis",
    label: "bacterial vaginosis",
    group: "vaginal_discharge",
    sharedPattern: "vaginal discharge",
    aliases: ["bacterial vaginosis", "gardnerella", "clue cells", "bv"],
    nbmeSurfaceTerms: ["thin fishy discharge", "clue cells", "positive whiff test", "vaginal pH >4.5", "little inflammation"],
    answerChoiceAliases: ["bacterial vaginosis", "Gardnerella vaginalis", "clue cells"],
    discriminator: "Bacterial vaginosis is suggested by thin fishy discharge, elevated vaginal pH, clue cells, and little inflammation."
  },
  {
    schema_id: "vulvovaginal_candidiasis",
    label: "vulvovaginal candidiasis",
    group: "vaginal_discharge",
    sharedPattern: "vaginal discharge",
    aliases: ["candida", "candidiasis", "vulvovaginal candidiasis", "culture for candida albicans", "hyphae", "thick discharge"],
    nbmeSurfaceTerms: ["vulvar pruritus", "thick cottage-cheese discharge", "normal vaginal pH", "budding yeast", "pseudohyphae"],
    answerChoiceAliases: ["Candida albicans", "vulvovaginal candidiasis", "yeast infection"],
    discriminator: "Candidiasis is usually pruritic with thick cottage-cheese discharge, normal pH, and budding yeast or pseudohyphae."
  },
  {
    schema_id: "trichomoniasis",
    label: "trichomoniasis",
    group: "vaginal_discharge",
    sharedPattern: "vaginal discharge",
    aliases: ["trichomonas", "trichomoniasis", "motile organisms", "strawberry cervix", "frothy discharge"],
    nbmeSurfaceTerms: ["frothy discharge", "motile organisms", "strawberry cervix", "elevated vaginal pH", "treat partners"],
    answerChoiceAliases: ["Trichomonas vaginalis", "trichomoniasis", "metronidazole for patient and partners"],
    discriminator: "Trichomoniasis is suggested by frothy discharge, motile organisms, strawberry cervix, and treatment of patient plus partners."
  },
  {
    schema_id: "cervicitis",
    label: "cervicitis",
    group: "vaginal_discharge",
    sharedPattern: "vaginal discharge or STI symptoms",
    aliases: ["cervicitis", "chlamydia trachomatis", "dna probe for chlamydia", "gonorrhea", "mucopurulent", "friable cervix"],
    nbmeSurfaceTerms: ["mucopurulent cervical discharge", "friable cervix", "cervical motion tenderness absent", "NAAT for gonorrhea and chlamydia"],
    answerChoiceAliases: ["cervicitis", "Chlamydia trachomatis", "Neisseria gonorrhoeae", "DNA probe for Chlamydia trachomatis"],
    discriminator: "Cervicitis is suggested by mucopurulent endocervical discharge, cervical friability, or STI nucleic acid testing rather than isolated vaginitis clues."
  },
  {
    schema_id: "chancroid",
    label: "chancroid",
    group: "genital_ulcer",
    sharedPattern: "genital ulcer",
    aliases: ["chancroid", "haemophilus ducreyi", "haemophilus ducreyi infection", "tender nonindurated ulcer", "ragged ulcer"],
    nbmeSurfaceTerms: ["painful genital ulcer", "tender nonindurated ulcer", "ragged ulcer", "bleeds easily when touched", "painful inguinal lymphadenopathy", "Haemophilus ducreyi"],
    answerChoiceAliases: ["Haemophilus ducreyi", "chancroid organism", "chancroid"],
    discriminator: "Chancroid causes a painful deep ragged nonindurated ulcer that can bleed, often with painful suppurative inguinal lymphadenopathy."
  },
  {
    schema_id: "herpes_simplex_virus_genital_ulcer",
    label: "genital herpes",
    group: "genital_ulcer",
    sharedPattern: "painful genital ulcer",
    aliases: ["hsv", "herpes", "herpes simplex", "herpes simplex virus", "genital herpes", "grouped vesicles", "shallow ulcers"],
    nbmeSurfaceTerms: ["multiple grouped vesicles", "shallow painful ulcers", "recurrent painful genital lesions", "Tzanck smear multinucleated giant cells", "HSV PCR"],
    answerChoiceAliases: ["Herpes simplex virus", "HSV", "genital herpes"],
    discriminator: "HSV usually causes multiple grouped vesicles or shallow painful ulcers, often recurrent, rather than a single deep ragged nonindurated ulcer."
  },
  {
    schema_id: "primary_syphilis",
    label: "primary syphilis",
    group: "genital_ulcer",
    sharedPattern: "genital ulcer",
    aliases: ["syphilis", "treponema pallidum", "primary syphilis", "painless chancre", "serologic testing for syphilis"],
    nbmeSurfaceTerms: ["painless chancre", "indurated ulcer", "nontender lymphadenopathy", "positive RPR", "Treponema pallidum"],
    answerChoiceAliases: ["Treponema pallidum", "primary syphilis", "serologic testing for syphilis"],
    discriminator: "Primary syphilis is classically painless and indurated, with nontender lymphadenopathy."
  },
  {
    schema_id: "lymphogranuloma_venereum",
    label: "lymphogranuloma venereum",
    group: "genital_ulcer",
    sharedPattern: "genital ulcer or STI answer choice",
    aliases: ["lymphogranuloma venereum", "lgv", "chlamydia trachomatis", "chlamydia trachomatis l1", "chlamydia trachomatis l2", "chlamydia trachomatis l3"],
    nbmeSurfaceTerms: ["transient painless genital ulcer", "painful inguinal lymphadenopathy", "groove sign", "Chlamydia trachomatis L1-L3"],
    answerChoiceAliases: ["Chlamydia trachomatis", "lymphogranuloma venereum", "LGV"],
    discriminator: "LGV causes a transient painless ulcer followed by painful inguinal lymphadenopathy."
  },
  {
    schema_id: "granuloma_inguinale",
    label: "granuloma inguinale",
    group: "genital_ulcer",
    sharedPattern: "genital ulcer",
    aliases: ["granuloma inguinale", "donovanosis", "calymmatobacterium granulomatis", "klebsiella granulomatis", "beefy red ulcer"],
    nbmeSurfaceTerms: ["painless beefy-red ulcer", "friable ulcer", "bleeds easily", "Donovan bodies", "Klebsiella granulomatis"],
    answerChoiceAliases: ["Calymmatobacterium granulomatis", "Klebsiella granulomatis", "granuloma inguinale"],
    discriminator: "Granuloma inguinale causes painless beefy-red friable ulcers that bleed easily and usually lacks prominent painful lymphadenopathy."
  },
  {
    schema_id: "mayer_rokitansky_kuster_hauser_syndrome",
    label: "MRKH syndrome",
    group: "primary_amenorrhea",
    sharedPattern: "primary amenorrhea with absent uterus",
    aliases: ["mrkh", "mayer rokitansky", "mullerian agenesis", "absent uterus", "vaginal agenesis"],
    nbmeSurfaceTerms: ["primary amenorrhea", "normal breast development", "absent uterus", "short vagina", "46,XX"],
    answerChoiceAliases: ["MRKH", "Müllerian agenesis", "Mayer-Rokitansky-Küster-Hauser syndrome"],
    discriminator: "MRKH has a 46,XX karyotype with normal secondary sexual development and absent uterus or upper vagina."
  },
  {
    schema_id: "androgen_insensitivity_syndrome",
    label: "androgen insensitivity syndrome",
    group: "primary_amenorrhea",
    sharedPattern: "primary amenorrhea with absent uterus",
    aliases: ["androgen insensitivity", "testicular feminization", "46 xy", "absent pubic hair", "intraabdominal testes"],
    nbmeSurfaceTerms: ["primary amenorrhea", "normal breast development", "scant pubic hair", "absent uterus", "46,XY", "intraabdominal testes"],
    answerChoiceAliases: ["androgen insensitivity syndrome", "testicular feminization"],
    discriminator: "Androgen insensitivity has a 46,XY karyotype, testes, scant pubic or axillary hair, and absent uterus."
  },
  {
    schema_id: "chlamydial_urethritis",
    label: "chlamydial urethritis",
    group: "sterile_pyuria_dysuria",
    sharedPattern: "dysuria with pyuria",
    aliases: ["chlamydial urethritis", "chlamydia", "sterile pyuria", "nongonococcal urethritis", "urethral tenderness"],
    nbmeSurfaceTerms: ["dysuria with pyuria but no bacteriuria", "sterile pyuria", "urethral tenderness", "failure of UTI therapy", "Chlamydia trachomatis"],
    answerChoiceAliases: ["Chlamydia trachomatis", "chlamydial urethritis", "nongonococcal urethritis"],
    discriminator: "Chlamydial urethritis is suggested by dysuria with pyuria but no bacteriuria or failed routine cystitis therapy."
  },
  {
    schema_id: "acute_bacterial_cystitis",
    label: "acute bacterial cystitis",
    group: "sterile_pyuria_dysuria",
    sharedPattern: "dysuria with frequency",
    aliases: ["acute bacterial cystitis", "bacterial cystitis", "uncomplicated cystitis", "uti", "bacteriuria"],
    nbmeSurfaceTerms: ["dysuria", "frequency", "urgency", "bacteriuria", "positive nitrites", "responds to UTI antibiotics"],
    answerChoiceAliases: ["acute bacterial cystitis", "uncomplicated UTI", "bacterial cystitis"],
    discriminator: "Bacterial cystitis is supported by bacteriuria, nitrites or leukocyte esterase, and response to UTI-directed antibiotics."
  },
  {
    schema_id: "urothelial_malignancy",
    label: "urothelial malignancy",
    group: "sterile_pyuria_dysuria",
    sharedPattern: "urinary symptoms or hematuria",
    aliases: ["urothelial carcinoma", "urothelial malignancy", "bladder cancer", "urine cytology", "gross hematuria", "persistent unexplained hematuria"],
    nbmeSurfaceTerms: ["gross hematuria", "painless hematuria", "older smoker", "persistent unexplained hematuria", "urine cytology"],
    answerChoiceAliases: ["urothelial carcinoma", "bladder cancer", "urine cytology"],
    discriminator: "Urothelial malignancy needs older age, smoking risk, gross or persistent unexplained hematuria, or absence of an inflammatory urinary explanation."
  }
];

function splitRawCompetitorText(value: string | undefined | null) {
  if (!value) return [];
  return dedupe(
    value
      .split(/\s*(?:\/|;|\||\n|\r|,|\bor\b)\s*/i)
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

function findCanonicalSchemas(rawValue: string | undefined | null, context = "") {
  const combined = normalize(`${rawValue ?? ""} ${context}`);
  if (!combined) return [];
  return canonicalCompetitorSchemas.filter((schema) =>
    schema.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);
      return combined === normalizedAlias || combined.includes(normalizedAlias);
    })
  );
}

function canonicalSchemasFromRawCandidates(rawCandidates: string[], context: string) {
  const matches: CanonicalCompetitorSchema[] = [];
  for (const raw of rawCandidates) {
    matches.push(...findCanonicalSchemas(raw, context));
    for (const split of splitRawCompetitorText(raw)) {
      matches.push(...findCanonicalSchemas(split, context));
    }
  }
  const byId = new Map<string, CanonicalCompetitorSchema>();
  for (const match of matches) byId.set(match.schema_id, match);
  return [...byId.values()];
}

function isBundledAnswerChoiceArtifact(value: string | undefined | null) {
  if (!value) return false;
  return /\/|;|\||\bor\b/i.test(value);
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (/^[A-Z]{2,}$/.test(part)) return part;
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}

function canonicalSchemaForKnowledge(knowledge: KnowledgeObjectWithSupportingFacts) {
  const pair = knowledge.discriminatorPair;
  return canonicalSchemasFromRawCandidates(
    [
      knowledge.abstractConcept,
      knowledge.topic,
      knowledge.testedConcept,
      pair?.conceptA,
      knowledge.canonicalAnswer,
      knowledge.displayAnswer
    ].filter(Boolean) as string[],
    ""
  )[0];
}

function surfaceTermsForKnowledge(
  knowledge: KnowledgeObjectWithSupportingFacts,
  canonical?: CanonicalCompetitorSchema
) {
  const supportingFacts = knowledge.supportingFacts ?? [];
  return dedupe([
    ...(canonical?.nbmeSurfaceTerms ?? []),
    knowledge.pivot,
    knowledge.discriminatorPair?.pivot,
    ...asStringArray(knowledge.supportingClues),
    ...asStringArray(knowledge.context),
    ...asStringArray(knowledge.illnessScript),
    ...(knowledge.semanticLinks ?? []).map((link) => link.sourceText),
    ...supportingFacts.flatMap((fact) => [...fact.aliases, ...fact.facts, ...fact.managementPearls])
  ]).slice(0, 14);
}

function answerAliasesForKnowledge(
  knowledge: KnowledgeObjectWithSupportingFacts,
  canonical?: CanonicalCompetitorSchema
) {
  const supportingFacts = knowledge.supportingFacts ?? [];
  return dedupe([
    ...(canonical?.answerChoiceAliases ?? []),
    knowledge.canonicalAnswer,
    knowledge.displayAnswer,
    knowledge.literalAnswer,
    knowledge.abstractConcept,
    knowledge.topic,
    ...asStringArray(knowledge.aliases),
    ...asStringArray(knowledge.acceptableAnswerPatterns),
    ...supportingFacts.flatMap((fact) => [fact.canonicalConcept, ...fact.aliases])
  ]).slice(0, 12);
}

function sourceReferences(facts: MedicalFact[] = []): SourceCardReference[] {
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
  const context = asStringArray(knowledge.context);
  const illnessScript = asStringArray(knowledge.illnessScript);
  return (
    context[0] ||
    illnessScript[0] ||
    knowledge.discriminatorPair?.conceptA ||
    knowledge.abstractConcept ||
    knowledge.topic
  );
}

function supportingCluesFrom(knowledge: KnowledgeObjectWithSupportingFacts) {
  const supportingFacts = knowledge.supportingFacts ?? [];
  const factClues = supportingFacts.flatMap((fact) => [
    ...fact.managementPearls,
    ...fact.mechanisms,
    ...fact.contraindications,
    ...fact.facts
  ]);
  return dedupe([
    ...asStringArray(knowledge.supportingClues),
    ...asStringArray(knowledge.context),
    ...asStringArray(knowledge.illnessScript),
    ...factClues
  ])
    .filter((clue) => normalize(clue) !== normalize(knowledge.pivot))
    .slice(0, 8);
}

export function normalizeCompetingSchemas(knowledge: KnowledgeObjectWithSupportingFacts): OntologyCompetingSchema[] {
  const pair = knowledge.discriminatorPair;
  const context = [
    compactPattern(knowledge),
    knowledge.system,
    knowledge.topic,
    knowledge.abstractConcept,
    knowledge.pivot,
    pair?.conceptA,
    pair?.conceptB
  ].join(" ");
  const activatedCandidates = canonicalSchemasFromRawCandidates(
    [
      knowledge.abstractConcept,
      knowledge.topic,
      knowledge.testedConcept,
      pair?.conceptA,
      knowledge.canonicalAnswer,
      knowledge.displayAnswer
    ].filter(Boolean) as string[],
    ""
  );
  const activatedSchema = activatedCandidates[0];
  const rawCandidates = dedupe([
    pair?.conceptB,
    knowledge.commonTrap,
    ...asStringArray(knowledge.discriminatorConcepts),
    ...asStringArray(knowledge.unacceptableNearMisses)
  ]);
  const canonicalCompetitors = canonicalSchemasFromRawCandidates(rawCandidates, context)
    .filter((schema) => schema.schema_id !== activatedSchema?.schema_id)
    .filter((schema) => !activatedSchema || schema.group === activatedSchema.group);

  if (canonicalCompetitors.length) {
    return canonicalCompetitors.map((schema) => ({
      schema_id: schema.schema_id,
      canonical_schema_id: schema.schema_id,
      canonical_name: schema.label,
      nbme_surface_terms: schema.nbmeSurfaceTerms,
      answer_choice_aliases: schema.answerChoiceAliases,
      why_confused: schema.sharedPattern,
      discriminator: pair?.whyPivotSupportsA
        ? `${pair.pivot} supports ${pair.conceptA}. ${schema.discriminator}`
        : schema.discriminator
    }));
  }

  if (!pair?.conceptB || normalize(pair.conceptB) === normalize(pair.conceptA)) return [];
  if (isBundledAnswerChoiceArtifact(pair.conceptB)) return [];
  return [
    {
      schema_id: slugify(pair.conceptB),
      canonical_schema_id: slugify(pair.conceptB),
      canonical_name: sentenceCase(pair.conceptB),
      nbme_surface_terms: dedupe([pair.conceptB, pair.whatWouldSupportB, knowledge.commonTrap]),
      answer_choice_aliases: dedupe([pair.conceptB]),
      why_confused: pair.conceptB === knowledge.commonTrap
        ? `${pair.conceptB} shares the broad presentation but fails at the pivot.`
        : `Shares overlap with ${pair.conceptA}.`,
      discriminator: pair.whatWouldSupportB
        ? `${pair.pivot} separates it; the alternative would need ${pair.whatWouldSupportB}.`
        : pair.pivot
    }
  ];
}

function commonMisactivationsFrom(knowledge: KnowledgeObjectWithSupportingFacts, competingSchemas: OntologyCompetingSchema[]): OntologyMisactivation[] {
  const competing = competingSchemas[0]?.schema_id.replace(/_/g, " ") || knowledge.discriminatorPair?.conceptB || knowledge.commonTrap;
  if (!competing) return [];
  const context = asStringArray(knowledge.context);
  const divergenceType = classifyDivergenceType(knowledge, competingSchemas);
  return [
    {
      learner_branch: `${context[0] ?? knowledge.system} → ${competing}`,
      divergence_type: divergenceType,
      error_type: divergenceType,
      repair: `${knowledge.pivot} carries more decision weight here and should move the learner toward ${knowledge.abstractConcept}.`
    }
  ];
}

function classifyDivergenceType(
  knowledge: KnowledgeObjectWithSupportingFacts,
  competingSchemas: OntologyCompetingSchema[]
): OntologyDivergenceType {
  const trap = normalize(knowledge.commonTrap);
  const pivot = normalize(knowledge.pivot);
  const pair = knowledge.discriminatorPair;
  const wrongSchema = normalize(competingSchemas[0]?.schema_id || pair?.conceptB);
  const nearMisses = asStringArray(knowledge.unacceptableNearMisses).map(normalize);
  const noiseClues = nearMisses.filter((miss) => miss && !wrongSchema.includes(miss));
  const exactDivergenceTypes: OntologyDivergenceType[] = [
    "Missed pivot clue",
    "Promoted low-information clue",
    "Premature schema activation",
    "Failure to prune competing diagnosis",
    "Incorrect illness script activation",
    "Failure to recognize clinical pattern",
    "Misweighted discriminator",
    "Over-expanded differential",
    "Pattern recognized but commitment delayed"
  ];
  const exact = exactDivergenceTypes.find((type) => normalize(type) === trap);
  if (exact) return exact;

  if (/low information|noise|red herring|incidental|background/.test(trap)) {
    return "Promoted low-information clue";
  }
  if (/too early|premature|anchor|jump/.test(trap)) {
    return "Premature schema activation";
  }
  if (/broad|shotgun|too many|over expand|overexpanded|generic differential/.test(trap)) {
    return "Over-expanded differential";
  }
  if (/delay|watch|wait|defer|commit/.test(trap)) {
    return "Pattern recognized but commitment delayed";
  }
  if (/wrong script|incorrect script|misactivate|misactivation|different illness script/.test(trap)) {
    return "Incorrect illness script activation";
  }
  if (/missed pattern|did not recognize|failed to recognize/.test(trap)) {
    return "Failure to recognize clinical pattern";
  }
  if (/misweight|weight|weigh/.test(trap) || noiseClues.length > 0) {
    return "Misweighted discriminator";
  }
  if (wrongSchema && pivot && pair?.whatWouldSupportB) {
    return "Failure to prune competing diagnosis";
  }
  return "Missed pivot clue";
}

function repairOperationsFrom(knowledge: KnowledgeObjectWithSupportingFacts, competingSchemas: OntologyCompetingSchema[]): OntologyRepairOperation[] {
  const competing = competingSchemas.length
    ? competingSchemas.map((schema) => schema.schema_id.replace(/_/g, " ")).join(", ")
    : knowledge.discriminatorPair?.conceptB || knowledge.commonTrap || "nearby schema";
  return [
    {
      operation_id: `${slugify(knowledge.abstractConcept)}_pivot_repair`,
      trigger: `Learner selects ${competing} or another nearby schema.`,
      repair_statement: competingSchemas.length
        ? `First normalize the syndrome to ${competingSchemas[0].why_confused}, then compare ${[knowledge.abstractConcept, ...competingSchemas.map((schema) => schema.schema_id.replace(/_/g, " "))].join(", ")} using the pivot: ${knowledge.pivot}.`
        : `${knowledge.pivot} supports ${knowledge.abstractConcept}; ${knowledge.discriminatorPair?.whatWouldSupportB ?? "the alternative would need its own discriminator"}.`
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
  const supportingFacts = knowledge.supportingFacts ?? [];
  const sourceRefs = sourceReferences(supportingFacts);
  const clinicalPattern = compactPattern(knowledge);
  const canonicalSchema = canonicalSchemaForKnowledge(knowledge);
  const canonicalSchemaId = canonicalSchema?.schema_id ?? slugify(knowledge.abstractConcept || knowledge.topic);
  const canonicalName = canonicalSchema?.label ?? sentenceCase(knowledge.abstractConcept || knowledge.topic);
  const pivotClues = dedupe([
    knowledge.pivot,
    ...(knowledge.semanticLinks ?? []).map((link) => link.sourceText),
    ...supportingFacts.flatMap((fact) => fact.aliases.filter((alias) => normalize(alias) === normalize(knowledge.pivot)))
  ]).slice(0, 4);
  const supportingClues = supportingCluesFrom(knowledge);
  const competingSchemas = normalizeCompetingSchemas(knowledge);
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
        ...asStringArray(knowledge.unacceptableNearMisses),
        ...asStringArray(knowledge.discriminatorConcepts).filter((concept) => normalize(concept) !== normalize(knowledge.abstractConcept))
      ]).slice(0, 6)
    },
    schema_activation: {
      diagnosis_or_concept: knowledge.abstractConcept,
      canonical_schema_id: canonicalSchemaId,
      canonical_name: canonicalName,
      nbme_surface_terms: surfaceTermsForKnowledge(knowledge, canonicalSchema),
      answer_choice_aliases: answerAliasesForKnowledge(knowledge, canonicalSchema),
      concept_type: knowledge.conceptType,
      tested_decision: knowledge.testedDecision
    },
    competing_schemas: competingSchemas,
    common_misactivations: commonMisactivationsFrom(knowledge, competingSchemas),
    repair_operations: repairOperationsFrom(knowledge, competingSchemas),
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
  const canonical = findCanonicalSchemas(concept, [...fact.aliases, ...fact.facts, ...fact.managementPearls].join(" "))[0];
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
      canonical_schema_id: canonical?.schema_id ?? slugify(concept),
      canonical_name: canonical?.label ?? sentenceCase(concept),
      nbme_surface_terms: dedupe([...(canonical?.nbmeSurfaceTerms ?? []), anchor, ...fact.aliases, ...fact.facts]).slice(0, 14),
      answer_choice_aliases: dedupe([...(canonical?.answerChoiceAliases ?? []), concept, ...fact.aliases]).slice(0, 12),
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
