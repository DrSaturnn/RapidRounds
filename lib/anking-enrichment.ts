import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { KnowledgeObject } from "@/lib/curriculum-acquisition";
import { normalizeAnswer } from "@/lib/answer-check";

export type MedicalFactSource = "anking";

export type MedicalFactType =
  | "drug"
  | "disease"
  | "lab"
  | "imaging"
  | "procedure"
  | "mechanism"
  | "contraindication"
  | "complication"
  | "association"
  | "management"
  | "screening"
  | "other";

export type MedicalFact = {
  id: string;
  source: MedicalFactSource;
  sourceCardId: string;
  deck: string;
  tags: string[];
  title: string;
  canonicalConcept: string;
  aliases: string[];
  factType: MedicalFactType;
  facts: string[];
  contraindications: string[];
  mechanisms: string[];
  managementPearls: string[];
  shelfTags: string[];
  stepTags: string[];
  confidence: number;
  sourceHash: string;
  mediaReferences?: AnKingMediaReference[];
};

export type AnKingMediaReference = {
  filename: string;
  archiveEntry?: string;
  sourceHash: string;
};

export type VisualMemoryImageType =
  | "management_algorithm"
  | "discriminator_diagram"
  | "radiology_ultrasound_ecg"
  | "physical_exam_finding"
  | "gross_pathology"
  | "anatomy_support"
  | "table"
  | "histology"
  | "molecular_mechanism"
  | "other";

export type VisualMemoryEducationalRole =
  | "management_flow"
  | "decision_boundary"
  | "clinical_pattern"
  | "recall_association"
  | "supporting_reference";

export type VisualMemory = {
  canonicalImageId: string;
  source: "anking";
  sourceCardIds: string[];
  filename: string;
  title: string;
  associatedConcepts: string[];
  aliases: string[];
  tags: string[];
  subjectTags: string[];
  shelfTags: string[];
  imageType: VisualMemoryImageType;
  educationalRole: VisualMemoryEducationalRole;
  relevanceScore: number;
  caption: string;
  referencedByKnowledgeObjectIds: string[];
  sourceHash: string;
};

export type AnKingImportReport = {
  generatedAt: string;
  sourceCount: number;
  cardCount: number;
  totalCardsInspected?: number;
  excludedCards?: number;
  factCount: number;
  warnings: string[];
  facts: MedicalFact[];
  filteredOutSummary?: AnKingFilteredOutSummary;
  visualMemories?: VisualMemory[];
  mediaReferenceCount?: number;
  uniqueImageCount?: number;
};

export type AnKingFilteredOutSummary = {
  generatedAt: string;
  totalNotesInspected: number;
  totalCardsInspected: number;
  includedNotes: number;
  includedCards: number;
  excludedNotes: number;
  excludedCards: number;
  exclusionReasons: Record<string, number>;
  proposedFilter: {
    includeTagPatterns: string[];
    includeDeckPatterns: string[];
    requiredClinicalSignals: string[];
    excludedTagPatterns: string[];
    excludeImageOnlyNotesWithoutClinicalText: boolean;
  };
  reconsiderTags: string[];
};

export type AnKingMatch = {
  knowledgeObjectId: string;
  medicalFactId: string;
  score: number;
  matchedOn: string[];
};

export type KnowledgeObjectWithSupportingFacts = KnowledgeObject & {
  supportingFacts: MedicalFact[];
  durableAliases: string[];
  primaryImage?: VisualMemory;
  relatedImages: VisualMemory[];
  visualMemoryReferences: string[];
};

export type AnKingEnrichmentReport = {
  generatedAt: string;
  knowledgeObjectCount: number;
  factCount: number;
  enrichedKnowledgeObjectCount: number;
  matches: AnKingMatch[];
  enrichedKnowledgeObjects: KnowledgeObjectWithSupportingFacts[];
  unmatchedFacts: MedicalFact[];
  visualMemories: VisualMemory[];
  imageRankings: AnKingImageRanking[];
  unmatchedImages: VisualMemory[];
  warnings: string[];
};

export type AnKingImageRanking = {
  knowledgeObjectId: string;
  canonicalImageId: string;
  score: number;
  reasons: string[];
  selectedRole: "primary" | "related" | "unselected";
};

type ParsedAnKingCard = {
  sourceCardId: string;
  deck: string;
  tags: string[];
  fields: string[];
  rawText: string;
  mediaReferences: AnKingMediaReference[];
};

const DEFAULT_DECK = "AnKing";
const REPORT_DIR = "reports";

const CLINICAL_STEP2_INCLUDE_TAG_PATTERNS = [
  "^#AK_Step2_v12(?:::|$)",
  "^#AK_Step2_v12::!Shelf(?:::|$)",
  "^#AK_Step2_v12::#CMS(?:::|$)",
  "^#AK_Step2_v12::#NBME(?:::|$)",
  "^#AK_Step2_v12::#UWorld(?:::|$)",
  "^#AK_Step2_v12::#Resources_by_rotation(?:::|$)",
  "^#AK_Original_Decks::Step_2(?:::|$)",
  "^#AK_Other::#AK_Original_Decks::Step_2(?:::|$)"
];

const CLINICAL_STEP2_INCLUDE_DECK_PATTERNS = ["^AnKing::Step 2(?:::|$)"];

const CLINICAL_SIGNAL_PATTERNS = [
  "!Shelf",
  "#CMS",
  "#NBME",
  "#UWorld",
  "#Resources_by_rotation",
  "Original_decks",
  "Cheesy_Dorian",
  "MedicalArk",
  "Zanki_Step_2",
  "Clinical",
  "Internal|Medicine|IM",
  "Surgery|surg",
  "ObGyn|OBGYN|OB/GYN",
  "Peds|Pediatrics",
  "Psych",
  "FM|Family",
  "EM|Emergency",
  "Neuro|Neurology",
  "Derm",
  "Ethics",
  "Biostats|Biostatistics",
  "Preventive|USPSTF|screening"
];

const CLINICAL_STEP2_EXCLUDE_PATTERNS = [
  "^#AK_Step1_v12(?:::|$)",
  "^#AK_Original_Decks::Step_1(?:::|$)",
  "^#AK_Other::#AK_Original_Decks::Step_1(?:::|$)",
  "^AnKing::Step 1(?:::|$)",
  "^#AK_Step3_v12(?:::|$)",
  "^#PANCE(?:::|$)",
  "PreClinical",
  "Histology",
  "Embryo|Embryology",
  "Molecular|Cellular|Cell_Biology",
  "Biochem|Biochemistry",
  "Anatomy",
  "Neuroanatomy",
  "Physiology"
];

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalized(value: string | undefined | null) {
  return normalizeAnswer(value ?? "");
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCloze(value: string) {
  return value.replace(/\{\{c\d+::([^}:]+)(?:::[^}]+)?\}\}/gi, "$1");
}

function cleanField(value: string) {
  return stripHtml(normalizeCloze(value)).replace(/\s+/g, " ").trim();
}

function extractMediaReferencesFromRaw(rawText: string): AnKingMediaReference[] {
  const filenames = new Set<string>();
  const add = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    if (!/\.(?:png|jpe?g|gif|webp|svg|bmp|tiff?)$/i.test(cleaned)) return;
    filenames.add(cleaned);
  };

  for (const match of rawText.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) add(match[1] ?? "");
  for (const match of rawText.matchAll(/\[sound:([^\]]+)\]/gi)) add(match[1] ?? "");
  for (const match of rawText.matchAll(/([\w@.()\- +%]+?\.(?:png|jpe?g|gif|webp|svg|bmp|tiff?))/gi)) add(match[1] ?? "");

  return [...filenames].map((filename) => ({
    filename,
    sourceHash: hash(filename)
  }));
}

function textLengthWithoutMedia(rawText: string) {
  return cleanField(rawText.replace(/\[sound:[^\]]+\]/gi, " ")).length;
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseTextExport(text: string, sourceId: string, defaultDeck = DEFAULT_DECK): ParsedAnKingCard[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const delimiter = line.includes("\t") ? "\t" : ",";
      const fields = delimiter === "\t" ? line.split("\t") : splitCsvLine(line);
      const cleaned = fields.map(cleanField).filter(Boolean);
      const tagField = cleaned.find((field) => /(^|::)(step|shelf|anking|obgyn|medicine|surgery|peds|psych)/i.test(field)) ?? "";
      const tags = tagField.split(/\s+/).filter((tag) => tag.includes("::") || /^#/.test(tag));

      return {
        sourceCardId: `${sourceId}-${index + 1}`,
        deck: defaultDeck,
        tags,
        fields: cleaned,
        rawText: cleaned.join(" "),
        mediaReferences: extractMediaReferencesFromRaw(line)
      };
    });
}

function parseApkgExport(filePath: string): {
  cards: ParsedAnKingCard[];
  warnings: string[];
  filteredOutSummary?: AnKingFilteredOutSummary;
} {
  const script = `
import json, os, re, sqlite3, subprocess, tempfile, zipfile, sys
path = sys.argv[1]
include_tag_patterns = ${JSON.stringify(CLINICAL_STEP2_INCLUDE_TAG_PATTERNS)}
include_deck_patterns = ${JSON.stringify(CLINICAL_STEP2_INCLUDE_DECK_PATTERNS)}
clinical_signal_patterns = ${JSON.stringify(CLINICAL_SIGNAL_PATTERNS)}
exclude_patterns = ${JSON.stringify(CLINICAL_STEP2_EXCLUDE_PATTERNS)}
image_ext = re.compile(r"\\.(?:png|jpe?g|gif|webp|svg|bmp|tiff?)$", re.I)

def matches_any(text, patterns):
    return any(re.search(pattern, text, re.I) for pattern in patterns)

def clean_deck(name):
    return name.replace("\\x1f", "::")

def extract_media(raw):
    found = []
    for match in re.finditer(r"(?:src|href)=[\\"']([^\\"']+)[\\"']|\\[sound:([^\\]]+)\\]", raw, re.I):
        value = (match.group(1) or match.group(2) or "").strip()
        if value and image_ext.search(value) and value not in found:
            found.append(value)
    for match in re.finditer(r'([\\w@.() +%-]+?\\.(?:png|jpe?g|gif|webp|svg|bmp|tiff?))', raw, re.I):
        value = match.group(1).strip()
        if value and image_ext.search(value) and value not in found:
            found.append(value)
    return found

def clean_text_len(raw):
    text = re.sub(r"<[^>]+>", " ", raw)
    text = re.sub(r"\\\\[sound:[^\\\\]]+\\\\]", " ", text)
    text = re.sub(r"\\{\\{c\\d+::([^}:]+)(?:::[^}]+)?\\}\\}", r"\\1", text)
    text = re.sub(r"&nbsp;|&amp;|&lt;|&gt;", " ", text)
    return len(re.sub(r"\\s+", " ", text).strip())

def classify(deck, tags, raw):
    tag_text = " ".join(tags)
    all_text = deck + " " + tag_text
    has_step2 = matches_any(tag_text, include_tag_patterns) or matches_any(deck, include_deck_patterns)
    has_clinical = matches_any(all_text, clinical_signal_patterns)
    excluded = []
    if matches_any(all_text, [r"^#PANCE(?:::|$)"]):
        excluded.append("pance_excluded")
    if matches_any(all_text, [r"^#AK_Step3_v12(?:::|$)"]):
        excluded.append("step3_excluded")
    if matches_any(all_text, [r"^#AK_Step1_v12(?:::|$)", r"^#AK_Original_Decks::Step_1(?:::|$)", r"^#AK_Other::#AK_Original_Decks::Step_1(?:::|$)", r"^AnKing::Step 1(?:::|$)"]) and not has_step2:
        excluded.append("step1_only")
    if matches_any(all_text, [r"PreClinical", r"Histology", r"Embryo|Embryology", r"Molecular|Cellular|Cell_Biology", r"Biochem|Biochemistry", r"Anatomy", r"Neuroanatomy", r"Physiology"]) and not has_step2:
        excluded.append("basic_science_only")
    media = extract_media(raw)
    if media and clean_text_len(raw) < 35:
        excluded.append("image_only_without_clinical_text")
    if not has_step2:
        excluded.append("no_step2_signal")
    if not has_clinical:
        excluded.append("no_clinical_signal")
    include = has_step2 and has_clinical and not excluded
    return include, excluded, media

with tempfile.TemporaryDirectory() as tmp:
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        dbname = 'collection.anki21b' if 'collection.anki21b' in names else 'collection.anki21' if 'collection.anki21' in names else 'collection.anki2'
        z.extract(dbname, tmp)
    dbpath = os.path.join(tmp, dbname)
    if dbname.endswith("b"):
        outpath = os.path.join(tmp, "collection.anki21")
        result = subprocess.run(["unzstd", "-q", "-f", "-o", outpath, dbpath], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "could not decompress zstd Anki collection")
        dbpath = outpath
    con = sqlite3.connect(dbpath)
    decks = {row[0]: clean_deck(row[1]) for row in con.execute("select id, name from decks").fetchall()}
    note_decks = {}
    note_card_counts = {}
    for nid, did in con.execute("select nid, did from cards").fetchall():
        note_decks.setdefault(nid, set()).add(decks.get(did, str(did)))
        note_card_counts[nid] = note_card_counts.get(nid, 0) + 1
    rows = con.execute("select id, flds, tags from notes").fetchall()
    cards = []
    excluded_cards = 0
    excluded_notes = 0
    included_cards = 0
    reason_counts = {}
    for note_id, flds, tags in rows:
        tag_list = tags.split()
        deck = " | ".join(sorted(note_decks.get(note_id, {"AnKing"})))
        include, reasons, media = classify(deck, tag_list, flds)
        card_count = note_card_counts.get(note_id, 1)
        if include:
            included_cards += card_count
            cards.append({
                "id": str(note_id),
                "fields": flds.split("\\x1f"),
                "tags": tag_list,
                "deck": deck,
                "media": media
            })
        else:
            excluded_notes += 1
            excluded_cards += card_count
            for reason in reasons or ["filtered_out"]:
                reason_counts[reason] = reason_counts.get(reason, 0) + 1
    print(json.dumps({
        "cards": cards,
        "summary": {
            "generatedAt": "",
            "totalNotesInspected": len(rows),
            "totalCardsInspected": sum(note_card_counts.values()),
            "includedNotes": len(cards),
            "includedCards": included_cards,
            "excludedNotes": excluded_notes,
            "excludedCards": excluded_cards,
            "exclusionReasons": reason_counts,
            "proposedFilter": {
                "includeTagPatterns": include_tag_patterns,
                "includeDeckPatterns": include_deck_patterns,
                "requiredClinicalSignals": clinical_signal_patterns,
                "excludedTagPatterns": exclude_patterns,
                "excludeImageOnlyNotesWithoutClinicalText": True
            },
            "reconsiderTags": [
                "#PANCE may be worth a future optional clinical recall import, but is excluded from this Step 2 pass.",
                "#AK_Step1_v12::#OME::Clinical contains clinical material but remains excluded unless also Step 2 tagged.",
                "Broad #Subjects tags are intentionally insufficient without Step 2/shelf/CMS/NBME/UWorld/rotation signals."
            ]
        }
    }))
`;
  const result = spawnSync("python3", ["-c", script, filePath], { encoding: "utf8", maxBuffer: 250 * 1024 * 1024 });

  if (result.status !== 0 || !result.stdout.trim()) {
    return {
      cards: [],
      warnings: [`Could not read AnKing package ${filePath}: ${result.stderr.trim() || "python3 extraction failed"}`]
    };
  }

  try {
    const parsed = JSON.parse(result.stdout) as {
      cards: Array<{ id: string; fields: string[]; tags: string[]; deck?: string; media?: string[] }>;
      summary: AnKingFilteredOutSummary;
    };
    return {
      cards: parsed.cards.map((card) => {
        const fields = card.fields.map(cleanField).filter(Boolean);
        return {
          sourceCardId: card.id,
          deck: card.deck ?? DEFAULT_DECK,
          tags: card.tags,
          fields,
          rawText: fields.join(" "),
          mediaReferences: (card.media ?? []).map((filename) => ({ filename, sourceHash: hash(filename) }))
        };
      }),
      warnings: [],
      filteredOutSummary: {
        ...parsed.summary,
        generatedAt: new Date().toISOString()
      }
    };
  } catch {
    return { cards: [], warnings: [`Could not parse AnKing package output for ${filePath}.`] };
  }
}

function conceptAliases(concept: string, text: string) {
  const aliases = [concept];
  if (/doxycycline/i.test(text)) {
    aliases.push(
      "doxycycline",
      "tetracycline antibiotic",
      "tetracycline-class therapy",
      "anti-chlamydial therapy",
      "treatment for chlamydia",
      "treatment for nongonococcal urethritis"
    );
  }
  if (/rho|rhogam|immune globulin/i.test(text)) aliases.push("Rh(D) immune globulin", "RhoGAM", "Rh immune globulin");
  if (/metronidazole/i.test(text)) aliases.push("metronidazole", "nitroimidazole antibiotic");
  if (/ceftriaxone/i.test(text)) aliases.push("ceftriaxone", "third-generation cephalosporin");
  return dedupe(aliases);
}

function dedupe(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    if (!value) return;
    const cleaned = value.trim().replace(/\s+/g, " ");
    if (!cleaned) return;
    const key = normalized(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });
  return result;
}

function inferTitle(fields: string[]) {
  const contentFields = fields.filter((field) => !isTagLikeField(field));
  const shortestUseful = fields
    .filter((field) => contentFields.includes(field))
    .map((field) => field.replace(/\{\{[^}]+\}\}/g, "").trim())
    .filter((field) => field.length >= 3 && field.length <= 90)
    .sort((a, b) => a.length - b.length)[0];
  return shortestUseful ?? contentFields[0]?.slice(0, 90) ?? fields[0]?.slice(0, 90) ?? "AnKing fact";
}

function inferCanonicalConcept(fields: string[]) {
  const contentFields = fields.filter((field) => !isTagLikeField(field));
  const text = contentFields.join(" ") || fields.join(" ");
  if (/doxycycline/i.test(text)) return "doxycycline";
  if (/rhogam|rho\(d\)|rh immune globulin|immune globulin/i.test(text)) return "Rh(D) immune globulin";
  if (/metronidazole/i.test(text)) return "metronidazole";
  if (/ceftriaxone/i.test(text)) return "ceftriaxone";
  const cloze = text.match(/\{\{c\d+::([^}:]+)(?:::[^}]+)?\}\}/i)?.[1];
  if (cloze) return cleanField(cloze);
  return inferTitle(contentFields.length ? contentFields : fields);
}

function isTagLikeField(field: string) {
  return /^(?:#)?(?:step|shelf|anking|obgyn|internal|medicine|surgery|peds|pediatrics|psych|neuro|family|emergency)(?:::|$)/i.test(field);
}

function inferFactType(text: string): MedicalFactType {
  if (/drug|antibiotic|doxycycline|ceftriaxone|azithromycin|metronidazole|side effect|adverse/i.test(text)) return "drug";
  if (/contraindicat|avoid|should not/i.test(text)) return "contraindication";
  if (/mechanism|binds|inhibits|pathophysiology|due to/i.test(text)) return "mechanism";
  if (/complication|risk of|leads to/i.test(text)) return "complication";
  if (/management|treat|therapy|first-line|next step/i.test(text)) return "management";
  if (/screen|surveillance|prevent/i.test(text)) return "screening";
  if (/ct|mri|ultrasound|x-ray|imaging/i.test(text)) return "imaging";
  if (/lab|serum|urine|hcg|troponin|test/i.test(text)) return "lab";
  if (/biopsy|procedure|surgery|laparoscopy/i.test(text)) return "procedure";
  if (/associated|association|buzzword|classic/i.test(text)) return "association";
  if (/syndrome|disease|diagnosis|pneumonia|infection|cancer/i.test(text)) return "disease";
  return "other";
}

function inferShelfTags(tags: string[], text: string) {
  const joined = `${tags.join(" ")} ${text}`;
  const shelves = [
    ["OB/GYN", /obgyn|ob\/gyn|pregnan|gynecology|uterine|cervix|chlamydia|gonorrhea|sti/i],
    ["Internal Medicine", /medicine|cardio|pulm|renal|gi|endo|heme/i],
    ["Surgery", /surgery|trauma|appendicitis|cholecystitis/i],
    ["Pediatrics", /peds|pediatric|child|infant|newborn/i],
    ["Psychiatry", /psych|depression|mania|schizo/i],
    ["Family Medicine", /family|preventive|screening|vaccination/i],
    ["Emergency Medicine", /emergency|ed|resuscitation|overdose/i],
    ["Neurology", /neuro|stroke|seizure/i]
  ] as const;
  return shelves.filter(([, pattern]) => pattern.test(joined)).map(([shelf]) => shelf);
}

function inferStepTags(tags: string[]) {
  return dedupe(tags.filter((tag) => /step|shelf|clinical/i.test(tag)));
}

function extractFacts(fields: string[]) {
  return dedupe(fields.flatMap((field) => field.split(/(?<=[.!?])\s+/)).map(cleanField).filter((field) => field.length >= 4));
}

function factsFromCards(cards: ParsedAnKingCard[]): MedicalFact[] {
  return cards.map((card) => {
    const fields = card.fields.map(cleanField).filter(Boolean);
    const raw = fields.join(" ");
    const canonicalConcept = inferCanonicalConcept(fields);
    const sourceHash = hash(raw);
    const factType = inferFactType(raw);
    const facts = extractFacts(fields).slice(0, 8);

    return {
      id: `anking-${card.sourceCardId}-${sourceHash}`,
      source: "anking",
      sourceCardId: card.sourceCardId,
      deck: card.deck,
      tags: card.tags,
      title: inferTitle(fields),
      canonicalConcept,
      aliases: conceptAliases(canonicalConcept, raw),
      factType,
      facts,
      contraindications: facts.filter((fact) => /contraindicat|avoid|should not/i.test(fact)).slice(0, 4),
      mechanisms: facts.filter((fact) => /mechanism|binds|inhibits|pathophysiology|due to/i.test(fact)).slice(0, 4),
      managementPearls: facts.filter((fact) => /treat|therapy|management|first-line|drug of choice/i.test(fact)).slice(0, 4),
      shelfTags: inferShelfTags(card.tags, raw),
      stepTags: inferStepTags(card.tags),
      confidence: Math.min(0.95, Number((0.55 + Math.min(facts.length, 4) * 0.08 + (card.tags.length ? 0.08 : 0)).toFixed(2))),
      sourceHash,
      mediaReferences: card.mediaReferences
    };
  });
}

function subjectTagsFrom(tags: string[], text: string) {
  return inferShelfTags(tags, text);
}

function inferImageType(filename: string, text: string): VisualMemoryImageType {
  const combined = `${filename} ${text}`;
  if (/algorithm|flow|management|treatment|therapy|approach|workup/i.test(combined)) return "management_algorithm";
  if (/differential|discriminator|compare|versus| vs |ddx|distinguish/i.test(combined)) return "discriminator_diagram";
  if (/xray|x-ray|ct|mri|ultrasound|us_|echo|ecg|ekg|radiograph|imaging/i.test(combined)) return "radiology_ultrasound_ecg";
  if (/rash|skin|lesion|exam|physical|finding|photo/i.test(combined)) return "physical_exam_finding";
  if (/gross|pathology|specimen|autopsy/i.test(combined)) return "gross_pathology";
  if (/anatomy|nerve|artery|vein|muscle|bone/i.test(combined)) return "anatomy_support";
  if (/table|chart|summary|grid/i.test(combined)) return "table";
  if (/histology|histo|microscope|biopsy|slide/i.test(combined)) return "histology";
  if (/mechanism|molecular|pathway|receptor|enzyme/i.test(combined)) return "molecular_mechanism";
  return "other";
}

function educationalRoleFor(imageType: VisualMemoryImageType): VisualMemoryEducationalRole {
  if (imageType === "management_algorithm") return "management_flow";
  if (imageType === "discriminator_diagram") return "decision_boundary";
  if (["radiology_ultrasound_ecg", "physical_exam_finding", "gross_pathology"].includes(imageType)) return "clinical_pattern";
  if (["anatomy_support", "table", "histology", "molecular_mechanism"].includes(imageType)) return "supporting_reference";
  return "recall_association";
}

function baseImageScore(imageType: VisualMemoryImageType) {
  const priority: Record<VisualMemoryImageType, number> = {
    management_algorithm: 95,
    discriminator_diagram: 90,
    radiology_ultrasound_ecg: 84,
    physical_exam_finding: 78,
    gross_pathology: 70,
    anatomy_support: 48,
    table: 46,
    histology: 28,
    molecular_mechanism: 24,
    other: 36
  };
  return priority[imageType];
}

function buildVisualMemoriesFromFacts(facts: MedicalFact[]): VisualMemory[] {
  const byFilename = new Map<string, { facts: MedicalFact[]; references: AnKingMediaReference[] }>();
  for (const fact of facts) {
    for (const reference of fact.mediaReferences ?? []) {
      const key = normalized(reference.filename);
      if (!key) continue;
      const entry = byFilename.get(key) ?? { facts: [], references: [] };
      entry.facts.push(fact);
      entry.references.push(reference);
      byFilename.set(key, entry);
    }
  }

  return [...byFilename.entries()].map(([key, entry]) => {
    const first = entry.references[0];
    const filename = first.filename;
    const tags = dedupe(entry.facts.flatMap((fact) => fact.tags));
    const concepts = dedupe(entry.facts.flatMap((fact) => [fact.canonicalConcept, ...fact.aliases]));
    const text = `${filename} ${concepts.join(" ")} ${tags.join(" ")}`;
    const imageType = inferImageType(filename, text);
    const sourceHash = hash(`${key}:${entry.references.map((reference) => reference.sourceHash).join("|")}`);
    return {
      canonicalImageId: `anking-image-${sourceHash}`,
      source: "anking",
      sourceCardIds: dedupe(entry.facts.map((fact) => fact.sourceCardId)),
      filename,
      title: concepts[0] ? `${concepts[0]} visual memory` : filename.replace(/\.[^.]+$/, ""),
      associatedConcepts: concepts,
      aliases: dedupe(concepts.flatMap((concept) => conceptAliases(concept, text))),
      tags,
      subjectTags: dedupe(entry.facts.flatMap((fact) => subjectTagsFrom(fact.tags, text))),
      shelfTags: dedupe(entry.facts.flatMap((fact) => fact.shelfTags)),
      imageType,
      educationalRole: educationalRoleFor(imageType),
      relevanceScore: baseImageScore(imageType),
      caption: concepts[0] ? `${concepts[0]} supporting visual from AnKing.` : "Supporting visual from AnKing.",
      referencedByKnowledgeObjectIds: [],
      sourceHash
    } satisfies VisualMemory;
  });
}

export function importAnKingText(text: string, options: { sourceId?: string; deck?: string } = {}): AnKingImportReport {
  const sourceId = options.sourceId ?? `anking-text-${hash(text)}`;
  const cards = parseTextExport(text, sourceId, options.deck ?? DEFAULT_DECK);
  const facts = factsFromCards(cards);
  const visualMemories = buildVisualMemoriesFromFacts(facts);
  return {
    generatedAt: new Date().toISOString(),
    sourceCount: 1,
    cardCount: cards.length,
    totalCardsInspected: cards.length,
    excludedCards: 0,
    factCount: facts.length,
    warnings: [],
    facts,
    visualMemories,
    mediaReferenceCount: facts.reduce((sum, fact) => sum + (fact.mediaReferences?.length ?? 0), 0),
    uniqueImageCount: visualMemories.length
  };
}

export function importAnKingFile(filePath: string): AnKingImportReport {
  const absolutePath = resolve(filePath);
  const extension = extname(absolutePath).toLowerCase();
  const warnings: string[] = [];
  let cards: ParsedAnKingCard[] = [];
  let filteredOutSummary: AnKingFilteredOutSummary | undefined;

  if (extension === ".txt" || extension === ".csv" || extension === ".tsv") {
    const text = readFileSync(absolutePath, "utf8");
    cards = parseTextExport(text, absolutePath, DEFAULT_DECK);
  } else if (extension === ".apkg" || extension === ".colpkg") {
    const result = parseApkgExport(absolutePath);
    cards = result.cards;
    warnings.push(...result.warnings);
    filteredOutSummary = result.filteredOutSummary;
  } else {
    warnings.push(`Unsupported AnKing export type: ${extension || "unknown"}`);
  }

  const facts = factsFromCards(cards);
  const visualMemories = buildVisualMemoriesFromFacts(facts);
  return {
    generatedAt: new Date().toISOString(),
    sourceCount: 1,
    cardCount: filteredOutSummary?.includedCards ?? cards.length,
    totalCardsInspected: filteredOutSummary?.totalCardsInspected ?? cards.length,
    excludedCards: filteredOutSummary?.excludedCards ?? 0,
    factCount: facts.length,
    warnings,
    facts,
    filteredOutSummary,
    visualMemories,
    mediaReferenceCount: facts.reduce((sum, fact) => sum + (fact.mediaReferences?.length ?? 0), 0),
    uniqueImageCount: visualMemories.length
  };
}

export function importAnKingDirectory(directory: string): AnKingImportReport {
  const absoluteDirectory = resolve(directory);
  const files = readdirSync(absoluteDirectory)
    .map((entry) => join(absoluteDirectory, entry))
    .filter((entry) => statSync(entry).isFile())
    .filter((entry) => [".txt", ".csv", ".tsv", ".apkg", ".colpkg"].includes(extname(entry).toLowerCase()));
  const reports = files.map(importAnKingFile);
  const facts = reports.flatMap((report) => report.facts);
  const warnings = reports.flatMap((report) => report.warnings);
  const visualMemories = buildVisualMemoriesFromFacts(facts);

  return {
    generatedAt: new Date().toISOString(),
    sourceCount: files.length,
    cardCount: reports.reduce((sum, report) => sum + report.cardCount, 0),
    totalCardsInspected: reports.reduce((sum, report) => sum + (report.totalCardsInspected ?? report.cardCount), 0),
    excludedCards: reports.reduce((sum, report) => sum + (report.excludedCards ?? 0), 0),
    factCount: facts.length,
    warnings,
    facts,
    visualMemories,
    mediaReferenceCount: facts.reduce((sum, fact) => sum + (fact.mediaReferences?.length ?? 0), 0),
    uniqueImageCount: visualMemories.length
  };
}

function knowledgeMatchTerms(knowledge: KnowledgeObject) {
  return dedupe([
    knowledge.canonicalAnswer,
    knowledge.displayAnswer,
    knowledge.literalAnswer ?? "",
    knowledge.abstractConcept,
    knowledge.testedDecision,
    ...(knowledge.aliases ?? []),
    ...(knowledge.semanticLinks ?? []).flatMap((link) => [link.sourceText, link.targetConcept, link.targetDiagnosis ?? ""])
  ]);
}

function isNearMissForKnowledge(fact: MedicalFact, knowledge: KnowledgeObject) {
  const factTerms = [fact.canonicalConcept, ...fact.aliases].map(normalizeAnswer);
  return (knowledge.unacceptableNearMisses ?? []).some((nearMiss) => factTerms.includes(normalized(nearMiss)));
}

function scoreFactMatch(knowledge: KnowledgeObject, fact: MedicalFact): AnKingMatch | undefined {
  if (isNearMissForKnowledge(fact, knowledge)) return undefined;

  const knowledgeTerms = knowledgeMatchTerms(knowledge);
  const factTerms = dedupe([fact.canonicalConcept, fact.title, ...fact.aliases, ...fact.facts]);
  const matchedOn: string[] = [];
  let score = 0;

  for (const knowledgeTerm of knowledgeTerms) {
    const normalizedKnowledge = normalized(knowledgeTerm);
    if (!normalizedKnowledge) continue;
    for (const factTerm of factTerms) {
      const normalizedFact = normalized(factTerm);
      if (!normalizedFact) continue;
      if (normalizedFact === normalizedKnowledge) {
        score += 45;
        matchedOn.push(knowledgeTerm);
      } else if (normalizedFact.includes(normalizedKnowledge) || normalizedKnowledge.includes(normalizedFact)) {
        score += 20;
        matchedOn.push(knowledgeTerm);
      }
    }
  }

  if (fact.shelfTags.includes(knowledge.subject)) score += 8;
  if (normalized(fact.canonicalConcept) === normalized(knowledge.canonicalAnswer)) score += 20;
  if (score < 35) return undefined;

  return {
    knowledgeObjectId: knowledge.id,
    medicalFactId: fact.id,
    score: Math.min(100, score),
    matchedOn: dedupe(matchedOn)
  };
}

function imageMatchTerms(image: VisualMemory) {
  return dedupe([
    image.title,
    image.filename.replace(/\.[^.]+$/, ""),
    ...image.associatedConcepts,
    ...image.aliases,
    ...image.tags
  ]);
}

function scoreImageMatch(knowledge: KnowledgeObject, image: VisualMemory, matchedFactIds: Set<string>): Omit<AnKingImageRanking, "selectedRole"> | undefined {
  const knowledgeTerms = knowledgeMatchTerms(knowledge);
  const imageTerms = imageMatchTerms(image);
  const reasons: string[] = [];
  let score = 0;

  for (const knowledgeTerm of knowledgeTerms) {
    const normalizedKnowledge = normalized(knowledgeTerm);
    if (!normalizedKnowledge) continue;
    for (const imageTerm of imageTerms) {
      const normalizedImage = normalized(imageTerm);
      if (!normalizedImage) continue;
      if (normalizedImage === normalizedKnowledge) {
        score += 45;
        reasons.push(`exact concept match: ${knowledgeTerm}`);
      } else if (normalizedImage.includes(normalizedKnowledge) || normalizedKnowledge.includes(normalizedImage)) {
        score += 18;
        reasons.push(`partial concept match: ${knowledgeTerm}`);
      }
    }
  }

  const discriminatorTerms = [
    knowledge.discriminatorPair?.conceptA,
    knowledge.discriminatorPair?.conceptB,
    knowledge.discriminatorPair?.pivot,
    ...(knowledge.discriminatorConcepts ?? [])
  ].filter(Boolean) as string[];
  for (const term of discriminatorTerms) {
    const normalizedDiscriminator = normalized(term);
    if (normalizedDiscriminator && imageTerms.some((imageTerm) => normalized(imageTerm).includes(normalizedDiscriminator))) {
      score += 20;
      reasons.push(`decision-boundary match: ${term}`);
    }
  }

  if (image.shelfTags.includes(knowledge.subject) || image.subjectTags.includes(knowledge.subject)) {
    score += 10;
    reasons.push("Step 2 / shelf tag match");
  }
  if (knowledge.managementStage !== "not_applicable" && /management|algorithm|flow|treatment/i.test(`${image.title} ${image.filename} ${image.tags.join(" ")}`)) {
    score += 8;
    reasons.push("management-stage visual match");
  }
  score += Math.round(image.relevanceScore / 10);
  if (image.sourceCardIds.some((id) => matchedFactIds.has(id))) {
    score += 12;
    reasons.push("linked through matched MedicalFact");
  }

  if (score < 35) return undefined;
  return {
    knowledgeObjectId: knowledge.id,
    canonicalImageId: image.canonicalImageId,
    score: Math.min(100, score),
    reasons: dedupe(reasons)
  };
}

export function enrichKnowledgeObjectsWithAnKing(
  knowledgeObjects: KnowledgeObject[],
  facts: MedicalFact[],
  visualMemories: VisualMemory[] = buildVisualMemoriesFromFacts(facts)
): AnKingEnrichmentReport {
  const matches: AnKingMatch[] = [];
  const imageRankings: AnKingImageRanking[] = [];
  const enrichedKnowledgeObjects = knowledgeObjects.map((knowledge) => {
    const matchedFacts = facts
      .map((fact) => ({ fact, match: scoreFactMatch(knowledge, fact) }))
      .filter((entry): entry is { fact: MedicalFact; match: AnKingMatch } => Boolean(entry.match))
      .sort((left, right) => right.match.score - left.match.score)
      .slice(0, 8);

    matches.push(...matchedFacts.map((entry) => entry.match));
    const matchedSourceCardIds = new Set(matchedFacts.map((entry) => entry.fact.sourceCardId));
    const rankedImages = visualMemories
      .map((image) => scoreImageMatch(knowledge, image, matchedSourceCardIds))
      .filter((ranking): ranking is Omit<AnKingImageRanking, "selectedRole"> => Boolean(ranking))
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((ranking, index) => ({
        ...ranking,
        selectedRole: index === 0 ? "primary" : "related"
      }) satisfies AnKingImageRanking);
    imageRankings.push(...rankedImages);
    const selectedImageIds = new Set(rankedImages.map((ranking) => ranking.canonicalImageId));
    const selectedImages = visualMemories.filter((image) => selectedImageIds.has(image.canonicalImageId));
    const primaryImageId = rankedImages.find((ranking) => ranking.selectedRole === "primary")?.canonicalImageId;
    const primaryImage = primaryImageId ? selectedImages.find((image) => image.canonicalImageId === primaryImageId) : undefined;
    const relatedImages = rankedImages
      .filter((ranking) => ranking.selectedRole === "related")
      .map((ranking) => selectedImages.find((image) => image.canonicalImageId === ranking.canonicalImageId))
      .filter((image): image is VisualMemory => Boolean(image));

    return {
      ...knowledge,
      supportingFacts: matchedFacts.map((entry) => entry.fact),
      durableAliases: dedupe([
        ...(knowledge.aliases ?? []),
        ...matchedFacts.flatMap((entry) => entry.fact.aliases)
      ]),
      primaryImage,
      relatedImages,
      visualMemoryReferences: rankedImages.map((ranking) => ranking.canonicalImageId)
    };
  });
  const matchedFactIds = new Set(matches.map((match) => match.medicalFactId));
  const referencedImageIds = new Set(imageRankings.map((ranking) => ranking.canonicalImageId));
  const visualMemoriesWithReferences = visualMemories.map((image) => ({
    ...image,
    referencedByKnowledgeObjectIds: dedupe(
      imageRankings
        .filter((ranking) => ranking.canonicalImageId === image.canonicalImageId)
        .map((ranking) => ranking.knowledgeObjectId)
    )
  }));

  return {
    generatedAt: new Date().toISOString(),
    knowledgeObjectCount: knowledgeObjects.length,
    factCount: facts.length,
    enrichedKnowledgeObjectCount: enrichedKnowledgeObjects.filter((knowledge) => knowledge.supportingFacts.length > 0).length,
    matches,
    enrichedKnowledgeObjects,
    unmatchedFacts: facts.filter((fact) => !matchedFactIds.has(fact.id)),
    visualMemories: visualMemoriesWithReferences,
    imageRankings,
    unmatchedImages: visualMemoriesWithReferences.filter((image) => !referencedImageIds.has(image.canonicalImageId)),
    warnings: []
  };
}

export function searchKnowledgeObjectsWithAnKingAliases(
  knowledgeObjects: KnowledgeObjectWithSupportingFacts[],
  query: string
) {
  const normalizedQuery = normalized(query);
  return knowledgeObjects.filter((knowledge) =>
    [
      knowledge.canonicalAnswer,
      knowledge.displayAnswer,
      knowledge.abstractConcept,
      ...knowledge.durableAliases
    ].some((term) => normalized(term).includes(normalizedQuery))
  );
}

export function writeAnKingImportReports(report: AnKingImportReport, outputDirectory = REPORT_DIR) {
  if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "anking-import-summary.json"), JSON.stringify(report, null, 2));
  if (report.filteredOutSummary) {
    writeFileSync(join(outputDirectory, "anking-filtered-out-summary.json"), JSON.stringify(report.filteredOutSummary, null, 2));
  }
  if (report.visualMemories) {
    writeFileSync(
      join(outputDirectory, "visual-memory-summary.json"),
      JSON.stringify(
        {
          generatedAt: report.generatedAt,
          visualMemoryCount: report.visualMemories.length,
          mediaReferenceCount: report.mediaReferenceCount ?? 0,
          uniqueImageCount: report.uniqueImageCount ?? report.visualMemories.length,
          imageTypes: report.visualMemories.reduce<Record<string, number>>((counts, image) => {
            counts[image.imageType] = (counts[image.imageType] ?? 0) + 1;
            return counts;
          }, {}),
          visualMemories: report.visualMemories
        },
        null,
        2
      )
    );
  }
}

export function writeAnKingEnrichmentReports(report: AnKingEnrichmentReport, outputDirectory = REPORT_DIR) {
  if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "anking-match-report.json"), JSON.stringify(report.matches, null, 2));
  writeFileSync(join(outputDirectory, "anking-unmatched-facts.json"), JSON.stringify(report.unmatchedFacts, null, 2));
  writeFileSync(join(outputDirectory, "anking-image-ranking-report.json"), JSON.stringify(report.imageRankings, null, 2));
  writeFileSync(join(outputDirectory, "visual-memory-unmatched-images.json"), JSON.stringify(report.unmatchedImages, null, 2));
  writeFileSync(
    join(outputDirectory, "visual-memory-summary.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        visualMemoryCount: report.visualMemories.length,
        referencedVisualMemoryCount: report.visualMemories.filter((image) => image.referencedByKnowledgeObjectIds.length > 0).length,
        primaryImagesSelected: report.imageRankings.filter((ranking) => ranking.selectedRole === "primary").length,
        relatedImagesSelected: report.imageRankings.filter((ranking) => ranking.selectedRole === "related").length,
        imageTypes: report.visualMemories.reduce<Record<string, number>>((counts, image) => {
          counts[image.imageType] = (counts[image.imageType] ?? 0) + 1;
          return counts;
        }, {}),
        visualMemories: report.visualMemories
      },
      null,
      2
    )
  );
  writeFileSync(
    join(outputDirectory, "knowledgeobject-enrichment-summary.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        knowledgeObjectCount: report.knowledgeObjectCount,
        factCount: report.factCount,
        enrichedKnowledgeObjectCount: report.enrichedKnowledgeObjectCount,
        matches: report.matches.length,
        unmatchedFacts: report.unmatchedFacts.length,
        visualMemoryCount: report.visualMemories.length,
        primaryImagesSelected: report.imageRankings.filter((ranking) => ranking.selectedRole === "primary").length,
        relatedImagesSelected: report.imageRankings.filter((ranking) => ranking.selectedRole === "related").length,
        unmatchedImages: report.unmatchedImages.length
      },
      null,
      2
    )
  );
}
