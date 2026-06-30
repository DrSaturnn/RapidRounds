import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { allSchemaNodes } from "@/lib/subject-seeds";
import type {
  CaseVariantTemplate,
  QuestionBreadth,
  RapidRoundsSubject,
  SchemaDiscriminatorPairSeed,
  SchemaNode,
  SchemaNodeAnswerType,
  SchemaNodeKind,
  SchemaNodePivotCategory,
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
  itemNumber?: number;
};

export type KnowledgeObject = {
  id: string;
  sourceType: CurriculumSourceType;
  sourceMetadata: {
    sourceId: string;
    segmentId: string;
    sourceHash: string;
    sourcePath?: string;
    itemNumber?: number;
    proprietaryExpressionRetained: false;
  };
  subject: CurriculumAcquisitionSubject;
  system: string;
  topic: string;
  blueprintCategory: string;
  estimatedYield: number;
  literalAnswer?: string;
  abstractConcept: string;
  testedDecision: string;
  managementActionClass?: string;
  discriminatorConcepts: string[];
  avoidLiteralStorage: boolean;
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

const subjectKeywordMap: Array<{ subject: CurriculumAcquisitionSubject; keywords: string[] }> = [
  { subject: "Internal Medicine", keywords: ["heart failure|acs|pneumonia|copd|asthma|cirrhosis|aki|ckd|sepsis|endocarditis|dka|thyroid|adrenal"] },
  { subject: "Surgery", keywords: ["appendicitis|cholecystitis|cholangitis|pancreatitis|bowel obstruction|trauma|hernia|compartment|postoperative"] },
  { subject: "Pediatrics", keywords: ["child|infant|newborn|neonate|bronchiolitis|croup|kawasaki|vaccine|developmental|pyloric"] },
  { subject: "Psychiatry", keywords: ["depression|mania|psychosis|schizophrenia|panic|ptsd|ocd|withdrawal|serotonin|neuroleptic"] },
  { subject: "OB/GYN", keywords: ["pregnan|postpartum|vaginal bleeding|preeclampsia|ectopic|placenta|labor|uterine|cervix|ovarian|contraception"] },
  { subject: "Family Medicine", keywords: ["screening|vaccination|hypertension|diabetes|smoking cessation|osteoporosis|preventive|counseling"] },
  { subject: "Emergency Medicine", keywords: ["ed |emergency|resuscitation|shock|overdose|anaphylaxis|stroke window|toxicity|heat stroke"] },
  { subject: "Neurology", keywords: ["stroke|seizure|multiple sclerosis|guillain|myasthenia|parkinson|dementia|migraine|headache|spinal cord"] },
  { subject: "Preventive Medicine", keywords: ["uspstf|prevention|risk reduction|screening interval|population health"] },
  { subject: "Ethics", keywords: ["capacity|consent|confidentiality|refusal|mandatory reporting|end-of-life|organ donation|impaired physician"] },
  { subject: "Biostatistics", keywords: ["sensitivity|specificity|ppv|npv|relative risk|odds ratio|confidence interval|p value|bias|confounding"] }
];

const defaultSubjectMatch: { subject: CurriculumAcquisitionSubject; keywords: string[] } = {
  subject: "Internal Medicine",
  keywords: []
};

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
  { topic: "Pulmonary embolism", keywords: [/pulmonary embol|pulmonary arteries|pleuritic|tachycardia|hypoxemia/i] },
  { topic: "Sepsis", keywords: [/sepsis|septic|lactate|broad-spectrum/i] },
  { topic: "Ectopic pregnancy", keywords: [/ectopic|adnexal|empty uterus|beta-hcg/i] },
  { topic: "Preeclampsia/eclampsia", keywords: [/preeclampsia|eclampsia|severe hypertension|seizure.*pregnan/i] },
  { topic: "Placenta previa", keywords: [/placenta previa|painless bleeding|third-trimester bleeding/i] },
  { topic: "Chorioamnionitis", keywords: [/chorioamnionitis|intrauterine infection|intra-amniotic infection|prolonged rupture of membranes/i] },
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

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\d{1,3}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextOperators(stream: string) {
  const strings: string[] = [];
  const literal = String.raw`\\.|[^\\()]`;
  const textOperatorPattern = new RegExp(String.raw`\(((?:${literal})*)\)\s*Tj`, "g");
  const arrayOperatorPattern = new RegExp(String.raw`\[((?:.|\n|\r)*?)\]\s*TJ`, "g");

  for (const match of stream.matchAll(textOperatorPattern)) {
    const text = decodePdfLiteral(match[1]);
    if (text) strings.push(text);
  }

  for (const arrayMatch of stream.matchAll(arrayOperatorPattern)) {
    for (const literalMatch of arrayMatch[1].matchAll(new RegExp(String.raw`\(((?:${literal})*)\)`, "g"))) {
      const text = decodePdfLiteral(literalMatch[1]);
      if (text) strings.push(text);
    }
  }

  return strings.join(" ");
}

function extractPdfLikeText(buffer: Buffer) {
  const asLatin = buffer.toString("latin1");
  const streamText: string[] = [];
  const streamPattern = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;

  for (const match of asLatin.matchAll(streamPattern)) {
    if (!/FlateDecode/.test(match[1])) continue;
    try {
      const inflated = inflateSync(Buffer.from(match[2], "latin1")).toString("latin1");
      const text = extractTextOperators(inflated);
      if (text) streamText.push(text);
    } catch {
      // Some PDF streams are images or malformed for text extraction; ignore them.
    }
  }

  const inflatedText = streamText.join("\n");
  if (/Exam Section\s*:\s*Item|Correct\s*Answer|Educational Objective/i.test(inflatedText)) {
    return inflatedText;
  }

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
    const externalText = extractPdfWithPython(filePath);
    if (externalText && externalText.length > 500) return externalText;
    return extractPdfLikeText(buffer);
  }
  return buffer.toString("utf8");
}

function extractPdfWithPython(filePath: string) {
  const candidates = [
    process.env.RAPIDROUNDS_PYTHON,
    join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"),
    "python3"
  ].filter(Boolean) as string[];
  const script = [
    "import sys",
    "try:",
    "    import pdfplumber",
    "except Exception:",
    "    sys.exit(42)",
    "parts=[]",
    "with pdfplumber.open(sys.argv[1]) as pdf:",
    "    for page in pdf.pages:",
    "        parts.append(page.extract_text() or '')",
    "print('\\n\\n'.join(parts))"
  ].join("\n");

  for (const python of candidates) {
    const result = spawnSync(python, ["-c", script, filePath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20
    });
    if (result.status === 0 && result.stdout.trim().length > 0) {
      return result.stdout;
    }
  }

  return undefined;
}

export function detectSourceType(filePath: string, text: string): CurriculumSourceType {
  const extension = extname(filePath).toLowerCase();
  if (/Exam Section\s*:\s*Item\s+\d+\s+of\s+\d+|Correct\s*Answer\s*:/i.test(text)) {
    return "cms_style_questions";
  }
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
  const cmsSegments = segmentCmsItems(normalized, sourceId, sourceType);
  if (cmsSegments.length > 0) {
    return cmsSegments;
  }
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

function segmentCmsItems(text: string, sourceId: string, sourceType: CurriculumSourceType): CurriculumQuestionSegment[] {
  const headerPattern = /Exam Section\s*:\s*Item\s+(\d{1,3})\s+of\s+\d{1,3}/gi;
  const headers = [...text.matchAll(headerPattern)];
  if (headers.length === 0) return [];

  const itemBlocks = new Map<number, string[]>();
  headers.forEach((header, index) => {
    const itemNumber = Number(header[1]);
    const start = header.index ?? 0;
    const end = index + 1 < headers.length ? headers[index + 1].index ?? text.length : text.length;
    const block = text.slice(start, end).trim();
    if (!/Correct\s*Answer\s*:/i.test(block) && !/Educational Objective\s*:/i.test(block)) return;
    const blocks = itemBlocks.get(itemNumber) ?? [];
    blocks.push(block);
    itemBlocks.set(itemNumber, blocks);
  });

  return [...itemBlocks.entries()]
    .sort(([left], [right]) => left - right)
    .map(([itemNumber, blocks]) => {
      const merged = dedupeSentences(blocks.join(" "));
      return {
        sourceId,
        segmentId: `${sourceId}#item-${itemNumber}`,
        sourceType,
        rawText: merged,
        sourceHash: hash(merged),
        itemNumber
      };
    });
}

function dedupeSentences(text: string) {
  const seen = new Set<string>();
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const normalized = sentence.toLowerCase().replace(/\s+/g, " ").trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function identifyCorrectAnswer(segmentText: string) {
  const labelLine = segmentText.match(/Correct\s*Answer\s*:\s*([A-J])(?:[).]|\s)/i);
  if (labelLine?.[1]) {
    const choices = parseAnswerChoices(segmentText);
    const choiceText = choices[labelLine[1].toUpperCase()];
    if (choiceText) return normalizeMedicalTerm(choiceText);
  }
  const textAnswerLine = segmentText.match(/(?:correct\s*answer|answer)\s*[:\-]\s*([^\n.;]+)/i);
  if (textAnswerLine?.[1]) {
    return normalizeMedicalTerm(textAnswerLine[1].replace(/^[A-J](?:[).]|\s+)/i, "").trim());
  }
  const markedChoice = segmentText.match(/\b([A-J])[\).]\s*([^.\n]+?)\s*(?:\*|<-|✓|correct)/i);
  return markedChoice?.[2] ? normalizeMedicalTerm(markedChoice[2].trim()) : undefined;
}

function normalizeMedicalTerm(value: string) {
  return value
    .replace(/Ectoi:>ic/gi, "Ectopic")
    .replace(/i:>lace/gi, "place")
    .replace(/ti:>al/i, "tipal")
    .replace(/medroxy~?rogesterone/gi, "medroxyprogesterone")
    .replace(/vagina\/is/gi, "vaginalis")
    .replace(/Haemophi\/us/gi, "Haemophilus")
    .replace(/stiocl</gi, "shock")
    .replace(/vu Ivar/gi, "vulvar")
    .replace(/~-?human/gi, "beta-human")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAnswerChoices(segmentText: string) {
  const choices: Record<string, string> = {};
  const region = extractAnswerChoiceRegion(segmentText);
  const choicePattern = /(?:^|\s)([A-J])(?:\)|\.)?\s+([\s\S]*?)(?=\s+[A-J](?:\)|\.)?\s+|\s*$)/gi;
  for (const match of region.matchAll(choicePattern)) {
    const label = match[1].toUpperCase();
    const text = normalizeMedicalTerm(normalizeExtractedConcept(match[2]))
      .replace(/\s+Correct\s*Answer.*$/i, "")
      .trim();
    if (isDurableConceptPhrase(text)) choices[label] = sentenceCase(text);
  }
  return choices;
}

function extractAnswerChoiceRegion(segmentText: string) {
  const beforeAnswer = segmentText.split(/Correct\s*Answer\s*:/i)[0] ?? segmentText;
  const firstChoiceIndex = beforeAnswer.search(/\bA(?:\)|\.)?\s+/);
  if (firstChoiceIndex < 0) return "";
  return beforeAnswer.slice(firstChoiceIndex);
}

function extractEducationalObjective(text: string) {
  return text.match(/Educational Objective\s*:\s*([\s\S]*?)(?=\s+(?:Previous|Next|Score Report|Lab Values|Calculator|Help|Pause|Exam Section\s*:)|$)/i)?.[1]?.trim();
}

function extractCorrectAnswerExplanation(text: string) {
  return text.match(/Correct\s*Answer\s*:\s*[A-J]\.?\s*([\s\S]*?)(?=\s+Incorrect\s+Answers?\s*:|\s+Educational Objective\s*:|$)/i)?.[1]?.trim();
}

function extractIncorrectAnswerExplanation(text: string) {
  return text.match(/Incorrect\s+Answers?\s*:\s*[\s\S]*?(?=\s+Educational Objective\s*:|$)/i)?.[0]?.trim();
}

function extractStemText(text: string) {
  return text.match(/(?:Self-Assessment|National Board of Medical Examiners).*?\b\d{1,3}\.\s*([\s\S]*?)(?=\s+[A-J]\)\s|\s+Correct\s*Answer\s*:)/i)?.[1]?.trim() ??
    text.match(/\b\d{1,3}\.\s*([\s\S]*?)(?=\s+[A-J]\)\s|\s+Correct\s*Answer\s*:)/i)?.[1]?.trim();
}

function extractQuestionPrompt(text: string) {
  const stem = extractStemText(text) ?? text.split(/Correct\s*Answer\s*:/i)[0] ?? text;
  const questions = [...stem.matchAll(/([^?.!]*\?)/g)]
    .map((match) => match[1].trim())
    .filter((question) => question.length >= 8);
  return questions.at(-1) ?? "";
}

function extractionAuthorityText(text: string) {
  const prioritized = [
    extractEducationalObjective(text),
    extractStemText(text),
    extractCorrectAnswerExplanation(text)
  ]
    .filter(Boolean)
    .join(" ");
  return prioritized || text;
}

function pivotAuthorityText(text: string) {
  const prioritized = [
    extractStemText(text),
    extractEducationalObjective(text),
    extractCorrectAnswerExplanation(text)
  ]
    .filter(Boolean)
    .join(" ");
  return prioritized || text;
}

type KeywordPattern = RegExp | string;

function keywordMatches(keyword: KeywordPattern, text: string) {
  return typeof keyword === "string" ? new RegExp(keyword, "i").test(text) : keyword.test(text);
}

function firstMatch<T extends { keywords: KeywordPattern[] }>(text: string, items: T[], fallback: T) {
  return items.find((item) => item.keywords.some((keyword) => keywordMatches(keyword, text))) ?? fallback;
}

export function inferSubject(text: string): CurriculumAcquisitionSubject {
  if (/Obstetrics and Gynecology Self-Assessment|Obstetrics\s+and\s+Gynecology|OB\/GYN/i.test(text)) {
    return "OB/GYN";
  }
  return firstMatch(text, subjectKeywordMap, defaultSubjectMatch).subject;
}

export function inferSystem(text: string, subject?: CurriculumAcquisitionSubject) {
  if (subject === "OB/GYN") return inferObgynSystem(text);
  return firstMatch(text, systemKeywordMap, { system: "General Principles", keywords: [] }).system;
}

function inferObgynSystem(text: string) {
  if (/postpartum hemorrhage|uterine atony|succenturiate|retained placental/i.test(text)) return "Obstetrics / postpartum hemorrhage";
  if (/ectopic|early pregnancy|positive pregnancy test|first trimester|adnexal/i.test(text)) return "Early pregnancy bleeding / acute pelvic pain";
  if (/mastitis|breastfeeding|lactation|breast abscess/i.test(text)) return "Breast infection / lactation";
  if (/PPROM|preterm|sterile speculum|pooling|nitrazine|ferning/i.test(text)) return "PPROM evaluation";
  if (/chorioamnionitis|rupture of membranes|fetal tachycardia|intra-amniotic/i.test(text)) return "Intrapartum infection / fetal monitoring";
  if (/pulmonary embol|pleuritic|hypoxemia|respiratory alkalosis|postpartum dyspnea|clear lungs/i.test(text)) return "Pregnancy/postpartum cardiopulmonary disease";
  if (/placenta previa|third-trimester bleeding|abruption|uterine rupture/i.test(text)) return "Third-trimester bleeding";
  if (/Rho|Rh-negative|alloimmunization|immune globulin/i.test(text)) return "Rh alloimmunization prevention";
  if (/endometrial cancer|anovulation|postmenopausal|ovarian malignancy/i.test(text)) return "Gynecologic oncology";
  if (/herpes|syphilis|chancroid|trichomon|bacterial vaginosis|vulvovaginal|sti|genital|cervicitis|gonorrhea|chlamydia/i.test(text)) return "Vulvovaginal infections / STI";
  if (/contracept|IUD|depot|estrogen|progestin|sterilization/i.test(text)) return "Contraception";
  return "Female Reproductive";
}

export function inferTopic(text: string, correctAnswer?: string) {
  const answerMatched = correctAnswer ? topicKeywordMap.find((item) => item.keywords.some((keyword) => keyword.test(correctAnswer))) : undefined;
  if (answerMatched) return answerMatched.topic;
  const matched = topicKeywordMap.find((item) => item.keywords.some((keyword) => keyword.test(text)));
  if (matched) return matched.topic;
  if (correctAnswer && isDurableConceptPhrase(correctAnswer)) return sentenceCase(correctAnswer);
  return sentenceCase(correctAnswer ?? extractConceptPhrase(text));
}

function extractConceptPhrase(text: string) {
  const objective = text.match(/educational objective\s*[:\-]\s*([^.\n]+)/i)?.[1];
  if (objective) return objective.trim();
  const diagnosis = text.match(/(?:diagnosis|condition|concept)\s*(?:is|:)\s*([^.\n]+)/i)?.[1];
  if (diagnosis) return diagnosis.trim();
  return "clinical reasoning schema";
}

export type ConceptAbstraction = {
  literalAnswer?: string;
  abstractConcept: string;
  testedDecision: string;
  managementActionClass?: string;
  discriminatorConcepts: string[];
  avoidLiteralStorage: boolean;
};

type ConceptAbstractionRule = {
  answer: RegExp;
  context?: RegExp;
  abstractConcept: string | ((context: string, literalAnswer: string) => string);
  testedDecision: string;
  managementActionClass?: string;
  keepExactDrug?: boolean;
};

const conceptAbstractionRules: ConceptAbstractionRule[] = [
  {
    answer: /dicloxacillin|cephalexin|anti-?staph/i,
    context: /mastitis|breastfeeding|lactation|nipple fissure|breast/i,
    abstractConcept: "lactational mastitis treated with anti-staphylococcal therapy",
    testedDecision: "Select anti-staphylococcal antibiotic therapy for lactational mastitis.",
    managementActionClass: "anti-staphylococcal antibiotic therapy"
  },
  {
    answer: /pap smear|papanicolaou|vaginal cytology|cytologic/i,
    context: /hysterectomy|cin\s*3|cervical intraepithelial neoplasia|vaginal cuff/i,
    abstractConcept: "post-hysterectomy CIN 3 surveillance with annual vaginal cuff cytology",
    testedDecision: "Continue annual vaginal cuff cytology after hysterectomy for high-grade CIN history.",
    managementActionClass: "post-treatment cervical dysplasia surveillance"
  },
  {
    answer: /rho\(d\)|rh\(?d\)?|immune globulin|rhogam/i,
    context: /rh-negative|alloimmunization|unsensitized|pregnancy bleeding|abortion|trauma/i,
    abstractConcept: "Rh-negative pregnancy alloimmunization prophylaxis",
    testedDecision: "Give Rh(D) immune globulin when an unsensitized Rh-negative pregnancy has bleeding or fetomaternal hemorrhage risk.",
    managementActionClass: "alloimmunization prophylaxis"
  },
  {
    answer: /serum.*(?:β|beta|-)?hcg|(?:β|beta|-)?hcg|human chorionic gonadotropin/i,
    context: /amenorrhea|pregnancy test|secondary amenorrhea|rule out pregnancy|exclude pregnancy/i,
    abstractConcept: "pregnancy exclusion before amenorrhea workup",
    testedDecision: "Exclude pregnancy first in amenorrhea evaluation.",
    managementActionClass: "initial diagnostic exclusion"
  },
  {
    answer: /endometrial biopsy|endometrial sampling/i,
    context: /abnormal uterine bleeding|age (?:older than|over|>|≥)\s*45|45 years|postmenopausal bleeding|endometrial cancer|unopposed estrogen/i,
    abstractConcept: "abnormal uterine bleeding age >45 / endometrial cancer rule-out",
    testedDecision: "Perform endometrial sampling when abnormal uterine bleeding raises endometrial cancer risk.",
    managementActionClass: "endometrial cancer exclusion"
  },
  {
    answer: /ergonovine|methylergonovine/i,
    context: /uterine atony|boggy uterus|postpartum hemorrhage|oxytocin|uterine massage/i,
    abstractConcept: "persistent uterine atony after massage and oxytocin requiring second-line uterotonic escalation",
    testedDecision: "Escalate to a second-line uterotonic when atony persists after massage and oxytocin.",
    managementActionClass: "second-line uterotonic escalation"
  },
  {
    answer: /sterile speculum/i,
    context: /preterm|rupture of membranes|leaking fluid|pprom|pooling|ferning|nitrazine/i,
    abstractConcept: "sterile speculum examination for suspected PPROM",
    testedDecision: "Use sterile speculum examination to evaluate suspected preterm rupture of membranes.",
    managementActionClass: "safe membrane-rupture evaluation"
  },
  {
    answer: /thrombus within (?:the )?pulmonary arteries|pulmonary embol/i,
    context: /postpartum|pregnancy|pleuritic|hypoxemia|shortness of breath|clear breath sounds|respiratory alkalosis/i,
    abstractConcept: "pulmonary embolism postpartum",
    testedDecision: "Recognize postpartum pulmonary embolism as thrombus causing pleuritic dyspnea and hypoxemia.",
    managementActionClass: "mechanism/diagnosis"
  },
  {
    answer: /hemorrhagic shock/i,
    context: /placenta previa|painless vaginal bleeding|third trimester|nontender uterus|closed cervix/i,
    abstractConcept: "placenta previa and hemorrhagic shock risk",
    testedDecision: "Recognize hemorrhagic shock as the major risk of placenta previa with heavy painless bleeding.",
    managementActionClass: "complication risk recognition"
  },
  {
    answer: /succenturiate placental lobe/i,
    context: /nontapering vessel|margin of the membranes|retained placental tissue|postpartum hemorrhage/i,
    abstractConcept: "succenturiate placental lobe with retained placental tissue",
    testedDecision: "Diagnose succenturiate placental lobe when postpartum hemorrhage follows abnormal placental vessel/membrane findings.",
    managementActionClass: "diagnostic recognition"
  },
  {
    answer: /herpes simplex virus|hsv/i,
    context: /vesicles|painful ulcers|dysuria|inguinal lymphadenopathy|genital/i,
    abstractConcept: "genital herpes due to HSV",
    testedDecision: "Identify HSV as the cause of painful grouped genital vesicles or shallow ulcers.",
    managementActionClass: "causal organism recognition"
  },
  {
    answer: /dehiscence/i,
    context: /serosanguineous drainage|abdominal incision|postoperative|wound/i,
    abstractConcept: "fascial dehiscence after abdominal incision",
    testedDecision: "Diagnose fascial dehiscence when profuse serosanguineous drainage follows abdominal surgery.",
    managementActionClass: "postoperative complication recognition"
  },
  {
    answer: /chorioamnionitis/i,
    context: /fetal tachycardia|rupture of membranes|maternal fever|uterine tenderness|leukocytosis/i,
    abstractConcept: "chorioamnionitis causing fetal tachycardia",
    testedDecision: "Identify intra-amniotic infection as the cause of fetal tachycardia with prolonged rupture and maternal infection signs.",
    managementActionClass: "cause of fetal tracing abnormality"
  }
];

function extractAnswerChoices(segmentText: string) {
  return Object.values(parseAnswerChoices(segmentText));
}

function shouldKeepLiteralAnswer(literalAnswer: string | undefined, context: string, classified: Pick<ReturnType<typeof classifyCompetency>, "competency">) {
  if (!literalAnswer) return false;
  if (/herpes simplex virus|hsv|ectopic pregnancy|chorioamnionitis|placenta previa|succenturiate|dehiscence/i.test(literalAnswer)) return true;
  if (/specific|exact|causal organism|organism|drug of choice|which antibiotic/i.test(context) && classified.competency !== "management") return true;
  return false;
}

function inferTestedDecision(abstractConcept: string, literalAnswer: string | undefined, classified: Pick<ReturnType<typeof classifyCompetency>, "competency" | "archetype">) {
  if (classified.competency === "diagnosis") return `Diagnose ${abstractConcept}.`;
  if (classified.competency === "mechanism") return `Identify the mechanism or causal explanation for ${abstractConcept}.`;
  if (classified.competency === "complication_recognition") return `Recognize the complication represented by ${abstractConcept}.`;
  if (/management|next_best_step|screening|contraindication/.test(classified.competency)) {
    return `Choose the correct clinical action for ${abstractConcept}.`;
  }
  return `Apply the ${abstractConcept} reasoning schema.`;
}

function inferManagementActionClass(literalAnswer: string | undefined, context: string, classified: Pick<ReturnType<typeof classifyCompetency>, "competency">) {
  if (!literalAnswer) return undefined;
  if (/antibiotic|dicloxacillin|cephalexin|ampicillin|erythromycin|metronidazole|ceftriaxone/i.test(`${literalAnswer} ${context}`)) return "antimicrobial therapy";
  if (/biopsy|sampling/i.test(literalAnswer)) return "diagnostic tissue sampling";
  if (/speculum|examination|ultrasound|measurement|serum|test/i.test(literalAnswer)) return "diagnostic evaluation";
  if (/immune globulin|vaccin|prophylaxis/i.test(`${literalAnswer} ${context}`)) return "prophylaxis";
  if (/ergonovine|oxytocin|uterotonic/i.test(`${literalAnswer} ${context}`)) return "uterotonic therapy";
  if (/management|next_best_step/.test(classified.competency)) return "clinical management";
  return undefined;
}

function abstractChoiceConcept(choice: string, context: string) {
  const rule = conceptAbstractionRules.find((item) => item.answer.test(choice) && (!item.context || item.context.test(context)));
  return rule ? (typeof rule.abstractConcept === "function" ? rule.abstractConcept(context, choice) : rule.abstractConcept) : sentenceCase(choice);
}

export function abstractExtractedConcept(
  literalAnswer: string | undefined,
  options: {
    authorityText: string;
    pivotText: string;
    questionPrompt: string;
    choices: string[];
    classified: Pick<ReturnType<typeof classifyCompetency>, "competency" | "archetype">;
    fallbackTopic: string;
  }
): ConceptAbstraction {
  const context = `${options.questionPrompt} ${options.authorityText} ${options.pivotText}`;
  const rule = literalAnswer
    ? conceptAbstractionRules.find((item) => item.answer.test(literalAnswer) && (!item.context || item.context.test(context)))
    : undefined;
  const keepLiteral = rule?.keepExactDrug || shouldKeepLiteralAnswer(literalAnswer, context, options.classified);
  const abstractConcept = rule
    ? typeof rule.abstractConcept === "function"
      ? rule.abstractConcept(context, literalAnswer ?? options.fallbackTopic)
      : rule.abstractConcept
    : keepLiteral && literalAnswer
      ? sentenceCase(literalAnswer)
      : inferTopic(options.authorityText, literalAnswer ?? options.fallbackTopic);
  const testedDecision = rule?.testedDecision ?? inferTestedDecision(abstractConcept, literalAnswer, options.classified);
  const managementActionClass = rule?.managementActionClass ?? inferManagementActionClass(literalAnswer, context, options.classified);
  const discriminatorConcepts = Array.from(
    new Set(
      options.choices
        .filter((choice) => choice.toLowerCase() !== (literalAnswer ?? "").toLowerCase())
        .map((choice) => abstractChoiceConcept(choice, context))
        .filter(isDurableConceptPhrase)
    )
  );

  return {
    literalAnswer,
    abstractConcept,
    testedDecision,
    managementActionClass,
    discriminatorConcepts,
    avoidLiteralStorage: Boolean(literalAnswer && abstractConcept.toLowerCase() !== literalAnswer.toLowerCase())
  };
}

export function classifyCompetency(text: string) {
  if (/causal organism|causative organism|etiologic agent/i.test(text)) {
    return {
      archetype: "Mechanism/pathophysiology" as NbmeArchetype,
      competency: "mechanism" as SchemaNodeKind,
      stage: "not_applicable" as ManagementStage,
      keywords: []
    };
  }
  if (/most likely cause of (?:this|the) .*(?:pattern|tracing|finding|symptom|presentation)/i.test(text)) {
    return {
      archetype: "Diagnosis" as NbmeArchetype,
      competency: "diagnosis" as SchemaNodeKind,
      stage: "diagnosis" as ManagementStage,
      keywords: []
    };
  }
  if (/which (?:antibiotic|medication|drug|therapy)|pharmacotherapy|treated with|treat(?:ment)?\?|appropriate (?:antibiotic|medication|therapy|treatment)/i.test(text)) {
    return {
      archetype: "Initial management" as NbmeArchetype,
      competency: "management" as SchemaNodeKind,
      stage: "first_intervention" as ManagementStage,
      keywords: []
    };
  }
  if (/contracept|IUD|sterilization|depot|oral contraceptive|vaginal ring/i.test(text) && /most appropriate|recommend|management|next|prescribe|method/i.test(text)) {
    return {
      archetype: "Next best step" as NbmeArchetype,
      competency: "management" as SchemaNodeKind,
      stage: "first_intervention" as ManagementStage,
      keywords: []
    };
  }
  if (/evaluation|examination|test|diagnostic step|confirmed by|confirm (?:the )?diagnosis/i.test(text) && /next|initial|most appropriate|should be performed|confirm/i.test(text)) {
    return {
      archetype: "Next best step" as NbmeArchetype,
      competency: "next_best_step" as SchemaNodeKind,
      stage: "first_intervention" as ManagementStage,
      keywords: []
    };
  }
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
        .filter((item) => item.length >= 5 && item.length <= 180);
  return Array.from(new Set(cleaned));
}

function normalizeExtractedConcept(value: string) {
  return value
    .replace(/\b(?:a|an|the)\s+\d{1,2}[- ]year[- ]old\b/gi, "patient")
    .replace(/\b\d{1,2}[- ]year[- ]old\b/gi, "patient")
    .replace(/\b(?:man|woman|male|female)\b/gi, "patient")
    .replace(/\b(?:comes|presents|is brought|is seen|is evaluated)\s+(?:to|for|with)\b.*$/gi, "")
    .replace(/\b(?:question|answer|explanation|educational objective)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.–-]+|[\s:;,.–-]+$/g, "")
    .trim();
}

function isDurableConceptPhrase(phrase: string) {
  return (
    phrase.length >= 4 &&
    phrase.length <= 180 &&
    !/^patient$/i.test(phrase) &&
    !/^(?:of|with|and|or|to|for)\b/i.test(phrase) &&
    !/\b(?:question|answer|explanation|educational objective)\b/i.test(phrase) &&
    !/\?$/.test(phrase) &&
    !/which of the following|most likely diagnosis|most appropriate/i.test(phrase) &&
    !/\b(?:comes|presents|is brought|is seen|is evaluated)\b/i.test(phrase) &&
    !/^(?:other symptoms include|risk factors include|treatment for|this patient|it is|they are|there are|if,? however|in contrast)\b/i.test(phrase) &&
    !/USMLENBME|Previous Next|Score Report|Lab Values|Calculator|Help|Pause/i.test(phrase) &&
    !/https?:|www\.|telegram|t\.me|subscribe|download/i.test(phrase) &&
    !/\b(?:year-old|history of|previously healthy|otherwise healthy|primigravid|gravida|gestation comes)\b/i.test(phrase) &&
    !/^a\d/i.test(phrase)
  );
}

function transformedClinicalPhrases(text: string) {
  return Array.from(
    new Set(
      extractClinicalPhrases(text)
        .map(normalizeExtractedConcept)
        .filter(isDurableConceptPhrase)
    )
  );
}

export function extractPivot(text: string, correctAnswer?: string) {
  const phrases = transformedClinicalPhrases(text);
  const pivotMarkers = [
    /because\s+([^.;\n]+)/i,
    /key (?:finding|clue|pivot)\s*(?:is|:)\s*([^.;\n]+)/i,
    /distinguish(?:es)?\s+.*?\s+by\s+([^.;\n]+)/i
  ];

  for (const marker of pivotMarkers) {
    const match = normalizeExtractedConcept(text.match(marker)?.[1] ?? "");
    if (match && isDurableConceptPhrase(match)) return match;
  }

  const answer = correctAnswer?.toLowerCase();
  const scored = phrases
    .filter((phrase) => !answer || !phrase.toLowerCase().includes(answer))
    .map((phrase) => ({ phrase, score: pivotPhraseScore(phrase) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.phrase ?? phrases[0] ?? correctAnswer ?? "dominant clinical pivot";
}

function pivotPhraseScore(phrase: string) {
  let score = 0;
  if (/pain|fever|bleeding|pressure|mass|labs?|imaging|unstable|stable|severe|without|after|acute|vesicle|erosion|lymph|postpartum|pregnan|rupture|tender|fissure|hypox|alkalosis|closed|boggy|uterine|membrane|fetal|vessel|cervical|adnexal|dysuria|flank|pyuria|painless|nontender|tachycardia/i.test(phrase)) score += 4;
  if (/vessel|membrane|vesicle|erosion|positive pregnancy|closed cervical|boggy uterus|despite|rupture of membranes|fetal tachycardia|serosanguineous|painless/i.test(phrase)) score += 4;
  if (/nontapering vessel|extending to the margin|margin of the membranes|fetal vessels|accessory lobe/i.test(phrase)) score += 8;
  if (/pleuritic chest pain|shortness of breath|oxygen saturation|clear breath sounds|respiratory alkalosis/i.test(phrase)) score += 6;
  if (/(with|plus|because|after|despite|without|rather than)/i.test(phrase)) score += 2;
  if (phrase.length >= 18 && phrase.length <= 110) score += 2;
  if (/pulse|blood pressure|respirations|temperature|vital signs/i.test(phrase) && !/fever|severe|hypox|unstable|stable/i.test(phrase)) score -= 5;
  if (/lacerations|operative management|digital cervical|medical imaging|laboratory findings/i.test(phrase)) score -= 3;
  if (/uncomplicated|risk factors include|common source|advanced maternal age|previous uterine surgery|can be diagnosed|commonly managed/i.test(phrase)) score -= 8;
  if (/^(Other symptoms|Risk factors|Treatment|In contrast|It can|It is|They are|It does not|It would be|If mild)/i.test(phrase)) score -= 8;
  return score;
}

export function extractDiscriminator(text: string, topic: string, pivot: string, correctAnswer?: string, discriminatorConcepts?: string[]) {
  const choices = Object.values(parseAnswerChoices(text)).filter((choice) => choice.toLowerCase() !== (correctAnswer ?? "").toLowerCase());
  const versus =
    text.match(/distinguish(?:es)?\s+.+?\s+from\s+([^.;\n]+)/i)?.[1]?.trim() ??
    text.match(/(?:vs\.?|versus|distinguish(?:es)? from|rather than)\s+([^.;\n]+)/i)?.[1]?.trim();
  const extractedTrap = versus;
  const normalizedTrap = normalizeExtractedConcept(extractedTrap ?? "");
  const trap = isDurableConceptPhrase(normalizedTrap)
    ? normalizedTrap
    : discriminatorConcepts && discriminatorConcepts.length > 0
      ? discriminatorConcepts.slice(0, 3).join("/")
      : choices.length > 0
      ? choices.slice(0, 3).join("/")
      : "nearby competing schema";
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
  const authorityText = extractionAuthorityText(segment.rawText);
  const pivotText = pivotAuthorityText(segment.rawText);
  const questionPrompt = extractQuestionPrompt(segment.rawText);
  const subject = inferSubject(segment.rawText);
  const system = inferSystem(authorityText, subject);
  const classified = classifyCompetency(questionPrompt || authorityText || segment.rawText);
  const initialTopic = inferTopic(authorityText, correctAnswer);
  const conceptAbstraction = abstractExtractedConcept(correctAnswer, {
    authorityText,
    pivotText,
    questionPrompt,
    choices: extractAnswerChoices(segment.rawText),
    classified,
    fallbackTopic: initialTopic
  });
  const topic = conceptAbstraction.abstractConcept;
  const pivot = extractPivot(pivotText, correctAnswer);
  const discriminatorPair = extractDiscriminator(
    segment.rawText,
    topic,
    pivot,
    conceptAbstraction.abstractConcept,
    conceptAbstraction.discriminatorConcepts
  );
  const blueprintCategory = blueprintCategoryFor(subject, system);
  const semanticLinks: SchemaSemanticLinkSeed[] = [
    {
      sourceText: pivot,
      relationship: classified.competency === "diagnosis" || classified.competency === "recognition" ? "proves" : "supports",
      targetConcept: blueprintCategory,
      targetDiagnosis: conceptAbstraction.abstractConcept
    }
  ];
  const phrases = transformedClinicalPhrases(authorityText);
  const partial: Omit<KnowledgeObject, "confidence" | "missingFields" | "lowConfidenceWarnings" | "noveltyScore" | "duplicateScore"> = {
    id: `ko-${segment.sourceHash}-${slugify(topic)}-${classified.competency}`,
    sourceType: segment.sourceType,
    sourceMetadata: {
      sourceId: segment.sourceId,
      segmentId: segment.segmentId,
      sourceHash: segment.sourceHash,
      sourcePath,
      itemNumber: segment.itemNumber,
      proprietaryExpressionRetained: false
    },
    subject,
    system,
    topic,
    blueprintCategory,
    estimatedYield: estimatedYieldFor(subject, system, classified.competency),
    literalAnswer: conceptAbstraction.literalAnswer,
    abstractConcept: conceptAbstraction.abstractConcept,
    testedDecision: conceptAbstraction.testedDecision,
    managementActionClass: conceptAbstraction.managementActionClass,
    discriminatorConcepts: conceptAbstraction.discriminatorConcepts,
    avoidLiteralStorage: conceptAbstraction.avoidLiteralStorage,
    testedConcept: conceptAbstraction.abstractConcept,
    competency: classified.competency,
    questionArchetype: classified.archetype,
    managementStage: classified.stage,
    illnessScript: transformedClinicalPhrases(authorityText).slice(0, 4),
    epidemiology: phrases.filter((phrase) => /year-old|patient|pregnan|child|infant|adult|postpartum/i.test(phrase)).slice(0, 2),
    context: phrases.filter((phrase) => phrase !== pivot).slice(0, 3),
    pivot,
    supportingClues: phrases.filter((phrase) => phrase !== pivot).slice(0, 4),
    pertinentNegatives: phrases.filter((phrase) => /no |without|denies/i.test(phrase)).slice(0, 3),
    discriminatorPair,
    semanticLinks,
    commonTrap: discriminatorPair.conceptB,
    nextTimeRule: `${pivot} should move you toward ${conceptAbstraction.abstractConcept}.`,
    clinicalPearl: `${sentenceCase(conceptAbstraction.abstractConcept)} is selected by the pivot: ${pivot}.`,
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

function answerTypeFor(competency: SchemaNodeKind): SchemaNodeAnswerType {
  if (competency === "contraindication") return "avoid";
  if (competency === "mechanism") return "mechanism";
  if (competency === "risk_factor_interpretation") return "risk_factor";
  if (competency === "screening") return "screening";
  if (competency === "prognosis") return "prognosis";
  if (/management|next_best_step|escalation|disposition|follow_up/.test(competency)) return "management";
  return "diagnosis";
}

function pivotCategoryFor(competency: SchemaNodeKind): SchemaNodePivotCategory {
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
  mkdirSync(outputDirectory, { recursive: true });
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
