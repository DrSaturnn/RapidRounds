import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { allSchemaNodes } from "@/lib/subject-seeds";
import type {
  CaseVariantTemplate,
  QuestionBreadth,
  RapidRoundsSubject,
  SchemaDiscriminatorPairSeed,
  SchemaNode,
  SchemaNodeKind,
  SchemaSemanticLinkSeed
} from "@/lib/subject-seeds/seed-types";
import { DEFAULT_CASE_VARIANT_TEMPLATES } from "@/lib/subject-seeds/seed-types";
import type { NbmeArchetype } from "@/lib/local-reasoning-engine";

export type CurriculumSourceType =
  | "pdf"
  | "text"
  | "cms_style_questions"
  | "review_packet"
  | "guideline_summary"
  | "faculty_question_set"
  | "unknown";

export type CurriculumAcquisitionSubject =
  | RapidRoundsSubject
  | "Preventive Medicine"
  | "Future Specialty";

export type ManagementStage =
  | "recognition"
  | "diagnosis"
  | "initial_stabilization"
  | "first_intervention"
  | "failure"
  | "escalation"
  | "definitive_management"
  | "disposition"
  | "follow_up"
  | "not_applicable";

export type CurriculumQuestionSegment = {
  sourceId: string;
  segmentId: string;
  sourceType: CurriculumSourceType;
  rawText: string;
  sourceHash: string;
};

export type KnowledgeObject = {
  id: string;
  sourceType: CurriculumSourceType;
  sourceMetadata: {
    sourceId: string;
    segmentId: string;
    sourceHash: string;
    sourcePath?: string;
    proprietaryExpressionRetained: false;
  };
  subject: CurriculumAcquisitionSubject;
  system: string;
  topic: string;
  blueprintCategory: string;
  estimatedYield: number;
  testedConcept: string;
  competency: SchemaNodeKind;
  questionArchetype: NbmeArchetype;
  managementStage: ManagementStage;
  illnessScript: string[];
  epidemiology: string[];
  context: string[];
  pivot: string;
  supportingClues: string[];
  pertinentNegatives: string[];
  discriminatorPair: {
    conceptA: string;
    conceptB: string;
    pivot: string;
    whyPivotSupportsA: string;
    whatWouldSupportB: string;
    boardRule: string;
  };
  semanticLinks: SchemaSemanticLinkSeed[];
  commonTrap: string;
  nextTimeRule: string;
  clinicalPearl: string;
  complications: string[];
  contraindications: string[];
  transferConcepts: string[];
  confidence: number;
  noveltyScore: number;
  duplicateScore: number;
  missingFields: string[];
  lowConfidenceWarnings: string[];
  validationSources: string[];
};

export type AcquiredShelfSchemaNode = SchemaNode & {
  acquiredFromKnowledgeObjectId: string;
  acquisitionNoveltyScore: number;
  acquisitionConfidence: number;
};

export type CurriculumAcquisitionReport = {
  generatedAt: string;
  sourceCount: number;
  segmentCount: number;
  knowledgeObjects: KnowledgeObject[];
  schemaNodes: AcquiredShelfSchemaNode[];
  duplicateReport: Array<{
    knowledgeObjectId: string;
    matchedSchemaNodeId?: string;
    duplicateScore: number;
    noveltyScore: number;
    action: "update_existing_node" | "create_new_node";
  }>;
  noveltyReport: Array<{
    knowledgeObjectId: string;
    noveltyScore: number;
    interpretation: "already_represented" | "improves_existing_node" | "new_reasoning_node";
  }>;
  blueprintCoverage: Array<{
    subject: string;
    blueprintCategory: string;
    schemaNodeCount: number;
    knowledgeObjectCount: number;
  }>;
  warnings: string[];
};

const existingSubjects: RapidRoundsSubject[] = [
  "Internal Medicine",
  "Surgery",
  "OB/GYN",
  "Pediatrics",
  "Psychiatry",
  "Family Medicine",
  "Emergency Medicine",
  "Neurology",
  "Ethics",
  "Biostatistics"
];

const subjectKeywordMap: Array<{ subject: CurriculumAcquisitionSubject; keywords: RegExp[] }> = [
  { subject: "Internal Medicine", keywords: [/heart failure|acs|pneumonia|copd|asthma|cirrhosis|aki|ckd|sepsis|endocarditis|dka|thyroid|adrenal/i] },
  { subject: "Surgery", keywords: [/appendicitis|cholecystitis|cholangitis|pancreatitis|bowel obstruction|trauma|hernia|compartment|postoperative/i] },
  { subject: "Pediatrics", keywords: [/child|infant|newborn|neonate|bronchiolitis|croup|kawasaki|vaccine|developmental|pyloric/i] },
  { subject: "Psychiatry", keywords: [/depression|mania|psychosis|schizophrenia|panic|ptsd|ocd|withdrawal|serotonin|neuroleptic/i] },
  { subject: "OB/GYN", keywords: [/pregnan|postpartum|vaginal bleeding|preeclampsia|ectopic|placenta|labor|uterine|cervix|ovarian|contraception/i] },
  { subject: "Family Medicine", keywords: [/screening|vaccination|hypertension|diabetes|smoking cessation|osteoporosis|preventive|counseling/i] },
  { subject: "Emergency Medicine", keywords: [/ed |emergency|resuscitation|shock|overdose|anaphylaxis|stroke window|toxicity|heat stroke/i] },
  { subject: "Neurology", keywords: [/stroke|seizure|multiple sclerosis|guillain|myasthenia|parkinson|dementia|migraine|headache|spinal cord/i] },
  { subject: "Preventive Medicine", keywords: [/uspstf|prevention|risk reduction|screening interval|population health/i] },
  { subject: "Ethics", keywords: [/capacity|consent|confidentiality|refusal|mandatory reporting|end-of-life|organ donation|impaired physician/i] },
  { subject: "Biostatistics", keywords: [/sensitivity|specificity|ppv|npv|relative risk|odds ratio|confidence interval|p value|bias|confounding/i] }
];

const systemKeywordMap: Array<{ system: string; keywords: RegExp[] }> = [
  { system: "Cardiovascular", keywords: [/heart|acs|mi|angina|arrhythm|hypertension|shock|endocarditis/i] },
  { system: "Respiratory", keywords: [/pneumonia|copd|asthma|pulmonary|embolism|hypox|wheeze/i] },
  { system: "Renal/Urinary", keywords: [/aki|ckd|nephritic|nephrotic|urinary|kidney|renal/i] },
  { system: "Endocrine/Metabolic", keywords: [/diabetes|dka|hhs|thyroid|adrenal|metabolic/i] },
  { system: "Gastrointestinal", keywords: [/gi bleed|cirrhosis|pancreatitis|cholangitis|bowel|abdomen|liver/i] },
  { system: "Female Reproductive", keywords: [/pregnan|postpartum|uterine|cervix|ovarian|vaginal|placenta|contraception/i] },
  { system: "Infectious Disease", keywords: [/fever|sepsis|pneumonia|endocarditis|meningitis|cellulitis|infection|antibiotic/i] },
  { system: "Neurology", keywords: [/stroke|seizure|headache|weakness|dementia|cord|neurologic/i] },
  { system: "Psychiatry", keywords: [/mood|psychosis|anxiety|substance|eating disorder|somatic/i] },
  { system: "General Principles", keywords: [/ethics|biostat|screening|prevention|mechanism|risk/i] }
];

const topicKeywordMap: Array<{ topic: string; keywords: RegExp[] }> = [
  { topic: "Heart failure", keywords: [/heart failure|reduced ejection|hfref|pulmonary edema/i] },
  { topic: "Acute coronary syndrome", keywords: [/acs|st elevation|troponin|chest pain|myocardial/i] },
  { topic: "Pneumonia", keywords: [/pneumonia|productive cough|lobar|infiltrate/i] },
  { topic: "Pulmonary embolism", keywords: [/pulmonary embol|pleuritic|tachycardia|hypoxemia/i] },
  { topic: "Sepsis", keywords: [/sepsis|septic|lactate|broad-spectrum/i] },
  { topic: "Ectopic pregnancy", keywords: [/ectopic|adnexal|empty uterus|beta-hcg/i] },
  { topic: "Preeclampsia/eclampsia", keywords: [/preeclampsia|eclampsia|severe hypertension|seizure.*pregnan/i] },
  { topic: "Placenta previa", keywords: [/placenta previa|painless bleeding|third-trimester bleeding/i] },
  { topic: "Major depressive disorder", keywords: [/depression|anhedonia|sleep|suicidal/i] },
  { topic: "Appendicitis", keywords: [/appendicitis|right lower quadrant|mcburney/i] },
  { topic: "Decision-making capacity", keywords: [/capacity|understand.*appreciate|refusal/i] }
];

const archetypeKeywordMap: Array<{ archetype: NbmeArchetype; competency: SchemaNodeKind; stage: ManagementStage; keywords: RegExp[] }> = [
  { archetype: "Diagnosis", competency: "diagnosis", stage: "diagnosis", keywords: [/most likely diagnosis|diagnosis|what condition/i] },
  { archetype: "Next best step", competency: "next_best_step", stage: "first_intervention", keywords: [/next best step|next step|appropriate management|what should be done/i] },
  { archetype: "Initial management", competency: "management", stage: "initial_stabilization", keywords: [/initial management|initial treatment|first intervention|stabilize/i] },
  { archetype: "Definitive management", competency: "management", stage: "definitive_management", keywords: [/definitive|most appropriate treatment|long-term management/i] },
  { archetype: "Mechanism/pathophysiology", competency: "mechanism", stage: "not_applicable", keywords: [/mechanism|pathophysiology|why/i] },
  { archetype: "Risk factor", competency: "risk_factor_interpretation", stage: "not_applicable", keywords: [/risk factor|predisposes|most likely cause/i] },
  { archetype: "Screening/prevention", competency: "screening", stage: "follow_up", keywords: [/screening|prevention|vaccination|counsel/i] },
  { archetype: "Complication", competency: "complication_recognition", stage: "failure", keywords: [/complication|worsens|fails to improve|nonresponse/i] },
  { archetype: "Ethics/capacity", competency: "recognition", stage: "not_applicable", keywords: [/ethic|capacity|consent|refusal|confidential/i] },
  { archetype: "Biostatistics", competency: "recognition", stage: "not_applicable", keywords: [/sensitivity|specificity|odds ratio|relative risk|p value|confidence interval/i] },
  { archetype: "Prognosis/counseling", competency: "prognosis", stage: "follow_up", keywords: [/prognosis|counsel|reassure|follow-up/i] },
  { archetype: "Drug adverse effect", competency: "contraindication", stage: "first_intervention", keywords: [/contraindicat|adverse effect|avoid|toxicity/i] }
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

function extractPdfLikeText(buffer: Buffer) {
  const asLatin = buffer.toString("latin1");
  const literalStrings = [...asLatin.matchAll(/\(([^()]{4,260})\)/g)]
    .map((match) => match[1].replace(/\\[nrt]/g, " ").replace(/\\([()\\])/g, "$1"))
    .join("\n");
  const printable = asLatin.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ");
  return literalStrings.trim().length > printable.trim().length * 0.05 ? literalStrings : printable;
}

export function extractEducationalSourceText(filePath: string) {
  const buffer = readFileSync(filePath);
  const extension = extname(filePath).toLowerCase();
  if (extension === ".pdf" || buffer.subarray(0, 4).toString("utf8") === "%PDF") {
    return extractPdfLikeText(buffer);
  }
  return buffer.toString("utf8");
}

export function detectSourceType(filePath: string, text: string): CurriculumSourceType {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".pdf" && /educational objective|answer:|explanation|question\s+\d+/i.test(text)) {
    return "cms_style_questions";
  }
  if (extension === ".pdf") return "pdf";
  if (/guideline|recommendation|society|task force/i.test(text)) return "guideline_summary";
  if (/faculty|quiz|answer key/i.test(text)) return "faculty_question_set";
  if (/review packet|shelf review/i.test(text)) return "review_packet";
  return "text";
}

export function segmentQuestions(text: string, sourceId = "source", sourceType: CurriculumSourceType = "text"): CurriculumQuestionSegment[] {
  const normalized = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const matches = [...normalized.matchAll(/(?:^|\n)\s*(?:Question\s*)?\d{1,3}[\).:-]\s+/gi)];
  const chunks: string[] = [];

  if (matches.length > 0) {
    matches.forEach((match, index) => {
      const start = match.index ?? 0;
      const end = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
      chunks.push(normalized.slice(start, end).trim());
    });
  } else {
    chunks.push(
      ...normalized
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => /answer|diagnosis|management|next best|explanation|objective/i.test(chunk))
    );
  }

  return chunks
    .filter((chunk) => chunk.length >= 40)
    .map((rawText, index) => ({
      sourceId,
      segmentId: `${sourceId}#${index + 1}`,
      sourceType,
      rawText,
      sourceHash: hash(rawText)
    }));
}

export function identifyCorrectAnswer(segmentText: string) {
  const answerLine = segmentText.match(/(?:correct\s+answer|answer)\s*[:\-]\s*([A-J]\.?\s*)?([^\n.;]+)/i);
  if (answerLine?.[2]) {
    return answerLine[2].trim();
  }
  const markedChoice = segmentText.match(/\b([A-J])[\).]\s*([^.\n]+?)\s*(?:\*|<-|✓|correct)/i);
  return markedChoice?.[2]?.trim();
}

function firstMatch<T>(text: string, items: Array<T & { keywords: RegExp[] }>, fallback: T) {
  return items.find((item) => item.keywords.some((keyword) => keyword.test(text))) ?? fallback;
}

export function inferSubject(text: string): CurriculumAcquisitionSubject {
  return firstMatch(text, subjectKeywordMap, { subject: "Internal Medicine", keywords: [] }).subject;
}

export function inferSystem(text: string) {
  return firstMatch(text, systemKeywordMap, { system: "General Principles", keywords: [] }).system;
}

export function inferTopic(text: string, correctAnswer?: string) {
  const matched = topicKeywordMap.find((item) => item.keywords.some((keyword) => keyword.test(text)));
  return matched?.topic ?? sentenceCase(correctAnswer ?? extractConceptPhrase(text));
}

function extractConceptPhrase(text: string) {
  const objective = text.match(/educational objective\s*[:\-]\s*([^.\n]+)/i)?.[1];
  if (objective) return objective.trim();
  const diagnosis = text.match(/(?:diagnosis|condition|concept)\s*(?:is|:)\s*([^.\n]+)/i)?.[1];
  if (diagnosis) return diagnosis.trim();
  return "clinical reasoning schema";
}

export function classifyCompetency(text: string) {
  const matched = archetypeKeywordMap.find((item) => item.keywords.some((keyword) => keyword.test(text)));
  return matched ?? {
    archetype: "Diagnosis" as NbmeArchetype,
    competency: "diagnosis" as SchemaNodeKind,
    stage: "diagnosis" as ManagementStage,
    keywords: []
  };
}

function extractClinicalPhrases(text: string) {
  const cleaned = text
    .replace(/\b[A-J][).]\s+/g, "")
    .replace(/(?:correct\s+answer|answer|explanation|educational objective)\s*[:\-]/gi, ".")
    .split(/[.;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 5 && item.length <= 120);
  return Array.from(new Set(cleaned));
}

export function extractPivot(text: string, correctAnswer?: string) {
  const phrases = extractClinicalPhrases(text);
  const pivotMarkers = [
    /because\s+([^.;\n]+)/i,
    /key (?:finding|clue|pivot)\s*(?:is|:)\s*([^.;\n]+)/i,
    /distinguish(?:es)?\s+.*?\s+by\s+([^.;\n]+)/i,
    /(?:denies|without|no)\s+([^.;\n]+)/i
  ];

  for (const marker of pivotMarkers) {
    const match = text.match(marker)?.[1]?.trim();
    if (match && match.length <= 100) return match;
  }

  const answer = correctAnswer?.toLowerCase();
  return (
    phrases.find((phrase) => answer && !phrase.toLowerCase().includes(answer) && /pain|fever|bleeding|pressure|mass|labs?|imaging|unstable|stable|severe|without|after|acute/i.test(phrase)) ??
    phrases[0] ??
    correctAnswer ??
    "dominant clinical pivot"
  );
}

export function extractDiscriminator(text: string, topic: string, pivot: string, correctAnswer?: string) {
  const versus = text.match(/(?:vs\.?|versus|distinguish(?:es)? from|rather than)\s+([^.;\n]+)/i)?.[1]?.trim();
  const trap =
    versus ??
    text.match(/(?:not|rules out|instead of)\s+([A-Za-z][A-Za-z /\-]{3,60})/i)?.[1]?.trim() ??
    text.match(/incorrect\s+answers?.*?([A-Za-z][A-Za-z /\-]{3,60})/i)?.[1]?.trim() ??
    "nearby competing schema";
  const conceptA = sentenceCase(correctAnswer ?? topic);
  const conceptB = sentenceCase(trap.replace(/^(the|a|an)\s+/i, ""));

  return {
    conceptA,
    conceptB,
    pivot,
    whyPivotSupportsA: `${pivot} supports the ${conceptA} branch.`,
    whatWouldSupportB: `A finding specific to ${conceptB} would move the learner to that schema.`,
    boardRule: `${pivot} is the discriminator for ${conceptA}.`
  };
}

function blueprintCategoryFor(subject: CurriculumAcquisitionSubject, system: string) {
  if (subject === "Internal Medicine") {
    if (system === "Cardiovascular") return "Cardiovascular Disorders";
    if (system === "Respiratory") return "Diseases of the Respiratory System";
    if (system === "Gastrointestinal") return "Nutritional and Digestive Disorders";
    if (system === "Renal/Urinary") return "Renal, Urinary, Male Reproductive Systems";
    if (system === "Endocrine/Metabolic") return "Endocrine and Metabolic Disorders";
    if (system === "Female Reproductive") return "Female Reproductive System";
    if (system === "Psychiatry") return "Mental Disorders";
    if (system === "Neurology") return "Diseases of the Nervous System";
  }
  if (subject === "Preventive Medicine") return "Preventive Care and Population Health";
  return system;
}

function estimatedYieldFor(subject: CurriculumAcquisitionSubject, system: string, competency: SchemaNodeKind) {
  let base = 45;
  if (subject === "Internal Medicine" && /Cardiovascular|Respiratory|Gastrointestinal|Endocrine/i.test(system)) base = 78;
  if (/management|next_best_step|diagnosis|recognition/.test(competency)) base += 10;
  if (/General Principles|Ethics|Biostatistics/.test(system)) base -= 8;
  return Math.max(15, Math.min(95, base));
}

function confidenceFor(knowledge: Pick<KnowledgeObject, "pivot" | "topic" | "discriminatorPair" | "semanticLinks">, correctAnswer?: string) {
  let confidence = 0.45;
  if (correctAnswer) confidence += 0.15;
  if (knowledge.pivot && knowledge.pivot !== "dominant clinical pivot") confidence += 0.16;
  if (knowledge.topic && knowledge.topic !== "Clinical reasoning schema") confidence += 0.1;
  if (knowledge.discriminatorPair.conceptB !== "Nearby competing schema") confidence += 0.07;
  if (knowledge.semanticLinks.length > 0) confidence += 0.07;
  return Math.min(0.95, Number(confidence.toFixed(2)));
}

function validationWarnings(knowledge: KnowledgeObject) {
  const missingFields = [
    ["subject", knowledge.subject],
    ["system", knowledge.system],
    ["topic", knowledge.topic],
    ["blueprintCategory", knowledge.blueprintCategory],
    ["testedConcept", knowledge.testedConcept],
    ["pivot", knowledge.pivot],
    ["discriminatorPair", knowledge.discriminatorPair.conceptA && knowledge.discriminatorPair.conceptB],
    ["semanticLinks", knowledge.semanticLinks.length > 0]
  ]
    .filter(([, value]) => !value)
    .map(([field]) => String(field));
  const lowConfidenceWarnings = [
    knowledge.confidence < 0.65 ? "Needs Expert Review: low confidence extraction." : "",
    knowledge.discriminatorPair.conceptB === "Nearby competing schema" ? "No specific competing schema identified." : "",
    knowledge.pivot === "dominant clinical pivot" ? "No specific pivot extracted." : ""
  ].filter(Boolean);
  return { missingFields, lowConfidenceWarnings };
}

function existingSubjectFor(subject: CurriculumAcquisitionSubject): RapidRoundsSubject {
  if (existingSubjects.includes(subject as RapidRoundsSubject)) {
    return subject as RapidRoundsSubject;
  }
  return subject === "Preventive Medicine" ? "Family Medicine" : "Internal Medicine";
}

function duplicateScoreFor(knowledge: KnowledgeObject, nodes = allSchemaNodes) {
  const normalizedTopic = slugify(knowledge.topic);
  const normalizedPivot = slugify(knowledge.pivot);
  let best: { node?: SchemaNode; score: number } = { score: 0 };

  for (const node of nodes) {
    let score = 0;
    if (slugify(node.topic) === normalizedTopic) score += 42;
    if (node.nodeKind === knowledge.competency) score += 22;
    if (slugify(node.pivotClue) === normalizedPivot) score += 24;
    if (node.discriminatorPair.conceptB.toLowerCase() === knowledge.discriminatorPair.conceptB.toLowerCase()) score += 12;
    if (score > best.score) best = { node, score };
  }

  return {
    matchedSchemaNodeId: best.node?.id,
    duplicateScore: Math.min(100, best.score),
    noveltyScore: Math.max(0, 100 - Math.min(100, best.score))
  };
}

export function buildKnowledgeObject(segment: CurriculumQuestionSegment, sourcePath?: string): KnowledgeObject {
  const correctAnswer = identifyCorrectAnswer(segment.rawText);
  const subject = inferSubject(segment.rawText);
  const system = inferSystem(segment.rawText);
  const topic = inferTopic(segment.rawText, correctAnswer);
  const classified = classifyCompetency(segment.rawText);
  const pivot = extractPivot(segment.rawText, correctAnswer);
  const discriminatorPair = extractDiscriminator(segment.rawText, topic, pivot, correctAnswer ?? topic);
  const blueprintCategory = blueprintCategoryFor(subject, system);
  const semanticLinks: SchemaSemanticLinkSeed[] = [
    {
      sourceText: pivot,
      relationship: classified.competency === "diagnosis" || classified.competency === "recognition" ? "proves" : "supports",
      targetConcept: blueprintCategory,
      targetDiagnosis: correctAnswer ?? topic
    }
  ];
  const phrases = extractClinicalPhrases(segment.rawText);
  const partial: Omit<KnowledgeObject, "confidence" | "missingFields" | "lowConfidenceWarnings" | "noveltyScore" | "duplicateScore"> = {
    id: `ko-${segment.sourceHash}-${slugify(topic)}-${classified.competency}`,
    sourceType: segment.sourceType,
    sourceMetadata: {
      sourceId: segment.sourceId,
      segmentId: segment.segmentId,
      sourceHash: segment.sourceHash,
      sourcePath,
      proprietaryExpressionRetained: false
    },
    subject,
    system,
    topic,
    blueprintCategory,
    estimatedYield: estimatedYieldFor(subject, system, classified.competency),
    testedConcept: correctAnswer ?? topic,
    competency: classified.competency,
    questionArchetype: classified.archetype,
    managementStage: classified.stage,
    illnessScript: phrases.slice(0, 4),
    epidemiology: phrases.filter((phrase) => /year-old|patient|pregnan|child|infant|adult|postpartum/i.test(phrase)).slice(0, 2),
    context: phrases.filter((phrase) => phrase !== pivot).slice(0, 3),
    pivot,
    supportingClues: phrases.filter((phrase) => phrase !== pivot).slice(0, 4),
    pertinentNegatives: phrases.filter((phrase) => /no |without|denies/i.test(phrase)).slice(0, 3),
    discriminatorPair,
    semanticLinks,
    commonTrap: discriminatorPair.conceptB,
    nextTimeRule: `${pivot} should move you toward ${correctAnswer ?? topic}.`,
    clinicalPearl: `${sentenceCase(correctAnswer ?? topic)} is selected by the pivot: ${pivot}.`,
    complications: phrases.filter((phrase) => /complication|worsen|failure|shock|unstable/i.test(phrase)).slice(0, 3),
    contraindications: phrases.filter((phrase) => /contraindicat|avoid|should not/i.test(phrase)).slice(0, 3),
    transferConcepts: [blueprintCategory, system, discriminatorPair.conceptB].filter(Boolean),
    validationSources: ["User-provided educational source transformed into RapidRounds clinical reasoning schema"]
  };
  const duplicate = duplicateScoreFor(partial as KnowledgeObject);
  const confidence = confidenceFor(partial as KnowledgeObject, correctAnswer);
  const knowledge = {
    ...partial,
    confidence,
    noveltyScore: duplicate.noveltyScore,
    duplicateScore: duplicate.duplicateScore,
    missingFields: [],
    lowConfidenceWarnings: []
  } satisfies KnowledgeObject;
  const validation = validationWarnings(knowledge);
  return {
    ...knowledge,
    ...validation
  };
}

function schemaBandFor(knowledge: KnowledgeObject) {
  return knowledge.estimatedYield >= 65 ? "core" : "comprehensive";
}

function answerTypeFor(competency: SchemaNodeKind) {
  if (competency === "contraindication") return "avoid";
  if (competency === "mechanism") return "mechanism";
  if (competency === "risk_factor_interpretation") return "risk_factor";
  if (competency === "screening") return "screening";
  if (competency === "prognosis") return "prognosis";
  if (/management|next_best_step|escalation|disposition|follow_up/.test(competency)) return "management";
  return "diagnosis";
}

function pivotCategoryFor(competency: SchemaNodeKind) {
  if (competency === "contraindication") return "contraindication";
  if (competency === "mechanism") return "mechanism";
  if (competency === "risk_factor_interpretation") return "risk";
  if (competency === "screening") return "screening";
  if (competency === "prognosis") return "prognosis";
  if (/management|next_best_step|escalation|disposition|follow_up/.test(competency)) return "management";
  return "diagnostic";
}

export function knowledgeObjectToShelfSchemaNode(knowledge: KnowledgeObject): AcquiredShelfSchemaNode {
  const subject = existingSubjectFor(knowledge.subject);
  const shelfBand = schemaBandFor(knowledge);
  const variants: CaseVariantTemplate[] = DEFAULT_CASE_VARIANT_TEMPLATES.filter((variant) =>
    shelfBand === "core" ? true : variant.breadth === "comprehensive"
  );
  const pair: SchemaDiscriminatorPairSeed = {
    conceptA: knowledge.discriminatorPair.conceptA,
    conceptB: knowledge.discriminatorPair.conceptB,
    sharedPresentation: knowledge.context[0] ?? knowledge.system,
    pivot: knowledge.discriminatorPair.pivot,
    pivotThatSeparates: knowledge.discriminatorPair.pivot,
    whyPivotSupportsA: knowledge.discriminatorPair.whyPivotSupportsA,
    whatWouldSupportB: knowledge.discriminatorPair.whatWouldSupportB,
    commonWrongSchema: knowledge.commonTrap,
    conceptASchema: [knowledge.system, knowledge.context[0] ?? knowledge.topic, knowledge.pivot, knowledge.testedConcept],
    conceptBSchema: [knowledge.system, knowledge.commonTrap, knowledge.discriminatorPair.whatWouldSupportB],
    alternativeWouldNeed: knowledge.discriminatorPair.whatWouldSupportB,
    boardRule: knowledge.discriminatorPair.boardRule
  };

  return {
    id: `acquired-${knowledge.id}`,
    parentSeedId: knowledge.sourceMetadata.sourceId,
    shelf: subject,
    subject,
    system: knowledge.system,
    topic: knowledge.topic,
    schemaName: `${knowledge.topic}: ${knowledge.competency.replace(/_/g, " ")}`,
    schema: knowledge.illnessScript.join(" → ") || `${knowledge.topic} clinical reasoning schema`,
    nodeKind: knowledge.competency,
    questionArchetype: knowledge.questionArchetype,
    nbmeArchetype: knowledge.questionArchetype,
    nbmeBlueprintCategory: knowledge.blueprintCategory,
    estimatedYield: knowledge.estimatedYield,
    caseTierEligibility: {
      core: shelfBand === "core",
      comprehensive: true
    },
    initialQuestionSchema: {
      classicEpidemiologyFrame: knowledge.epidemiology[0] ?? knowledge.context[0] ?? knowledge.system,
      atypicalEpidemiologyFrame: knowledge.epidemiology[1] ?? `atypical ${knowledge.topic} frame`,
      misleadingContextFrame: knowledge.commonTrap,
      minimalContextFrame: knowledge.topic,
      chiefProblem: knowledge.context[0] ?? knowledge.topic,
      pertinentPositiveSlots: knowledge.supportingClues,
      pertinentNegativeSlots: knowledge.pertinentNegatives,
      pivotSlot: knowledge.pivot,
      task: knowledge.questionArchetype
    },
    shelfFrequencyWeight: Math.max(1, Math.round(knowledge.estimatedYield / 20)),
    shelfBand,
    epidemiologyFrames: knowledge.epidemiology.length ? knowledge.epidemiology : [knowledge.context[0] ?? knowledge.system],
    chiefComplaintVariants: [knowledge.context[0] ?? knowledge.topic, knowledge.pivot],
    chiefProblem: knowledge.context[0] ?? knowledge.topic,
    corePertinentPositives: knowledge.supportingClues.slice(0, 2),
    corePertinentNegatives: knowledge.pertinentNegatives.slice(0, 2),
    pertinentPositives: knowledge.supportingClues,
    pertinentNegatives: knowledge.pertinentNegatives,
    pivotClue: knowledge.pivot,
    pivotCategory: pivotCategoryFor(knowledge.competency),
    pivotClues: [knowledge.pivot],
    supportingClues: knowledge.supportingClues,
    contextualClues: knowledge.context,
    discriminatorPair: pair,
    discriminatorPairs: [pair],
    semanticLinks: knowledge.semanticLinks,
    answerType: answerTypeFor(knowledge.competency),
    managementBranch: {
      branchPoint: knowledge.pivot,
      ifPresent: knowledge.nextTimeRule,
      ifAbsent: knowledge.discriminatorPair.whatWouldSupportB,
      correctAction: knowledge.testedConcept
    },
    managementStage: knowledge.managementStage,
    priorInterventions: knowledge.managementStage === "failure" || knowledge.managementStage === "escalation" ? knowledge.context.slice(0, 1) : [],
    downstreamStateChanges: knowledge.managementStage === "failure" ? [`state changes after ${knowledge.context[0] ?? "initial intervention"}`] : [],
    complicationBranch: knowledge.complications[0]
      ? {
          branchPoint: knowledge.complications[0],
          ifPresent: `move to ${knowledge.topic} complication reasoning`,
          ifAbsent: knowledge.nextTimeRule,
          correctAction: knowledge.testedConcept
        }
      : undefined,
    complicationBranches: knowledge.complications.map((complication) => ({
      branchPoint: complication,
      ifPresent: `move to ${knowledge.topic} complication reasoning`,
      ifAbsent: knowledge.nextTimeRule,
      correctAction: knowledge.testedConcept
    })),
    contraindicationBranches: knowledge.contraindications.map((contraindication) => ({
      branchPoint: contraindication,
      ifPresent: `avoid ${contraindication}`,
      ifAbsent: knowledge.nextTimeRule,
      correctAction: knowledge.testedConcept
    })),
    adaptiveBreadthVariants: variants,
    correctAnswer: knowledge.testedConcept,
    incorrectAnswerSchemas: [knowledge.commonTrap],
    answerPrompt: knowledge.questionArchetype,
    commonTraps: [knowledge.commonTrap],
    nextTimeRule: knowledge.nextTimeRule,
    relatedConcepts: knowledge.transferConcepts,
    guidelineReferences: knowledge.validationSources,
    sourcePolicyMetadata: {
      schemaSourceType: "guideline_validated_medical_truth",
      validationSources: knowledge.validationSources,
      reconstructedFromMedicalTruth: true,
      proprietaryExpressionRetained: false
    },
    acquiredFromKnowledgeObjectId: knowledge.id,
    acquisitionNoveltyScore: knowledge.noveltyScore,
    acquisitionConfidence: knowledge.confidence
  };
}

export function acquireCurriculumFromText(text: string, options: { sourceId?: string; sourcePath?: string; sourceType?: CurriculumSourceType } = {}) {
  const sourceId = options.sourceId ?? `source-${hash(text)}`;
  const sourceType = options.sourceType ?? "text";
  const segments = segmentQuestions(text, sourceId, sourceType);
  return buildAcquisitionReport(
    segments.map((segment) => buildKnowledgeObject(segment, options.sourcePath)),
    segments
  );
}

function collectSourceFiles(input: { file?: string; directory?: string }) {
  if (input.file) return [resolve(input.file)];
  if (!input.directory) return [];
  const root = resolve(input.directory);
  const files: string[] = [];
  const visit = (path: string) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      readdirSync(path).forEach((entry) => visit(join(path, entry)));
      return;
    }
    if (/\.(pdf|txt|md)$/i.test(path)) files.push(path);
  };
  visit(root);
  return files;
}

export function acquireCurriculum(input: { file?: string; directory?: string }) {
  const files = collectSourceFiles(input);
  const allSegments: CurriculumQuestionSegment[] = [];
  const knowledgeObjects: KnowledgeObject[] = [];

  for (const filePath of files) {
    if (!existsSync(filePath)) continue;
    const text = extractEducationalSourceText(filePath);
    const sourceType = detectSourceType(filePath, text);
    const sourceId = slugify(filePath.split(/[\\/]/).pop() ?? `source-${hash(filePath)}`);
    const segments = segmentQuestions(text, sourceId, sourceType);
    allSegments.push(...segments);
    knowledgeObjects.push(...segments.map((segment) => buildKnowledgeObject(segment, filePath)));
  }

  return buildAcquisitionReport(knowledgeObjects, allSegments, files.length);
}

function buildAcquisitionReport(knowledgeObjects: KnowledgeObject[], segments: CurriculumQuestionSegment[], sourceCount = 1): CurriculumAcquisitionReport {
  const schemaNodes = knowledgeObjects.map(knowledgeObjectToShelfSchemaNode);
  const duplicateReport = knowledgeObjects.map((knowledgeObject) => {
    const duplicate = duplicateScoreFor(knowledgeObject);
    return {
      knowledgeObjectId: knowledgeObject.id,
      matchedSchemaNodeId: duplicate.matchedSchemaNodeId,
      duplicateScore: duplicate.duplicateScore,
      noveltyScore: duplicate.noveltyScore,
      action: duplicate.noveltyScore >= 50 ? "create_new_node" as const : "update_existing_node" as const
    };
  });
  const noveltyReport = duplicateReport.map((item) => ({
    knowledgeObjectId: item.knowledgeObjectId,
    noveltyScore: item.noveltyScore,
    interpretation:
      item.noveltyScore < 20
        ? "already_represented" as const
        : item.noveltyScore < 70
          ? "improves_existing_node" as const
          : "new_reasoning_node" as const
  }));
  const coverageMap = new Map<string, { subject: string; blueprintCategory: string; schemaNodeCount: number; knowledgeObjectCount: number }>();

  for (const knowledgeObject of knowledgeObjects) {
    const key = `${knowledgeObject.subject}::${knowledgeObject.blueprintCategory}`;
    const current = coverageMap.get(key) ?? {
      subject: knowledgeObject.subject,
      blueprintCategory: knowledgeObject.blueprintCategory,
      schemaNodeCount: 0,
      knowledgeObjectCount: 0
    };
    current.knowledgeObjectCount += 1;
    coverageMap.set(key, current);
  }
  for (const schemaNode of schemaNodes) {
    const knowledgeObject = knowledgeObjects.find((item) => item.id === schemaNode.acquiredFromKnowledgeObjectId);
    const subject = knowledgeObject?.subject ?? schemaNode.subject;
    const key = `${subject}::${schemaNode.nbmeBlueprintCategory}`;
    const current = coverageMap.get(key) ?? {
      subject,
      blueprintCategory: schemaNode.nbmeBlueprintCategory,
      schemaNodeCount: 0,
      knowledgeObjectCount: 0
    };
    current.schemaNodeCount += 1;
    coverageMap.set(key, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceCount,
    segmentCount: segments.length,
    knowledgeObjects,
    schemaNodes,
    duplicateReport,
    noveltyReport,
    blueprintCoverage: [...coverageMap.values()].sort((left, right) =>
      left.subject.localeCompare(right.subject) || left.blueprintCategory.localeCompare(right.blueprintCategory)
    ),
    warnings: knowledgeObjects.flatMap((knowledgeObject) =>
      knowledgeObject.lowConfidenceWarnings.map((warning) => `${knowledgeObject.id}: ${warning}`)
    )
  };
}

export function writeCurriculumAcquisitionReports(report: CurriculumAcquisitionReport, outputDirectory = "reports") {
  const writeJson = (name: string, value: unknown) => {
    writeFileSync(join(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`);
  };

  writeJson("curriculum-acquisition.json", {
    generatedAt: report.generatedAt,
    sourceCount: report.sourceCount,
    segmentCount: report.segmentCount,
    knowledgeObjects: report.knowledgeObjects
  });
  writeJson("schema-summary.json", {
    generatedAt: report.generatedAt,
    schemaNodes: report.schemaNodes.map((node) => ({
      id: node.id,
      subject: node.subject,
      system: node.system,
      topic: node.topic,
      competency: node.nodeKind,
      blueprintCategory: node.nbmeBlueprintCategory,
      pivot: node.pivotClue,
      discriminatorPair: node.discriminatorPair,
      semanticLinks: node.semanticLinks,
      confidence: node.acquisitionConfidence,
      noveltyScore: node.acquisitionNoveltyScore
    }))
  });
  writeJson("duplicate-report.json", report.duplicateReport);
  writeJson("novelty-report.json", report.noveltyReport);
  writeJson("blueprint-coverage.json", report.blueprintCoverage);
}

export function formatCurriculumAcquisitionSummary(report: CurriculumAcquisitionReport) {
  return [
    "RapidRounds Curriculum Acquisition Engine",
    `Sources: ${report.sourceCount}`,
    `Segments: ${report.segmentCount}`,
    `Knowledge Objects: ${report.knowledgeObjects.length}`,
    `ShelfSchemaNodes: ${report.schemaNodes.length}`,
    `Warnings: ${report.warnings.length}`,
    ...report.blueprintCoverage.map(
      (item) => `${item.subject} / ${item.blueprintCategory}: ${item.schemaNodeCount} schema nodes`
    )
  ].join("\n");
}
