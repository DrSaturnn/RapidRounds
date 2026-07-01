import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildClinicalReasoningOntology,
  type ClinicalReasoningOntologyEntry,
  type OntologyDivergenceType
} from "@/lib/clinical-reasoning-ontology";
import type { KnowledgeObject } from "@/lib/curriculum-acquisition";

export type OntologyBenchmarkCase = {
  id: string;
  shelf: "OB/GYN" | "Internal Medicine" | "Surgery";
  clinical_pattern: string;
  correct_schema: string;
  plausible_wrong_schema: string;
  nbme_surface_terms: string[];
  pivot_clue: string;
  supporting_clues: string[];
  noise_clues: string[];
  shared_features: string[];
  discriminator: string;
  divergence_type: OntologyDivergenceType;
  repair_operation: string;
  commit_rule: string;
  expected_reasoning_sequence: string[];
};

export type OntologyBenchmarkMetricName =
  | "clinicalPattern"
  | "schemaActivation"
  | "competingSchemaNormalization"
  | "pivotClue"
  | "discriminator"
  | "divergenceClassification"
  | "repairOperation"
  | "commitRule";

export type OntologyBenchmarkCaseResult = {
  id: string;
  shelf: OntologyBenchmarkCase["shelf"];
  clinical_pattern: string;
  correct_schema: string;
  plausible_wrong_schema: string;
  passes: Record<OntologyBenchmarkMetricName, boolean>;
  score: number;
  failures: Array<{
    metric: OntologyBenchmarkMetricName;
    why: string;
    expected: string;
    actual: string;
  }>;
  generated: {
    clinical_pattern: string;
    canonical_schema_id: string;
    competing_schema_ids: string[];
    pivot_clues: string[];
    discriminator: string;
    divergence_type?: string;
    repair_operation?: string;
    commit_rule: string;
  };
  attending_evaluation: string;
};

export type OntologyBenchmarkReport = {
  generatedAt: string;
  benchmarkCaseCount: number;
  summary: Record<OntologyBenchmarkMetricName, number> & {
    overall: number;
    failedCaseCount: number;
  };
  results: OntologyBenchmarkCaseResult[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_|_$/g, "") || "unknown_schema";
}

function normalize(value: string | undefined | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  const stop = new Set(["the", "a", "an", "and", "or", "with", "to", "of", "in", "for", "by", "is", "are", "this", "that"]);
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stop.has(token));
}

function tokenOverlap(expected: string, actual: string) {
  const expectedTokens = new Set(tokens(expected));
  if (expectedTokens.size === 0) return 0;
  const actualTokens = new Set(tokens(actual));
  let shared = 0;
  for (const token of expectedTokens) {
    if (actualTokens.has(token)) shared += 1;
  }
  return shared / expectedTokens.size;
}

function containsMeaning(actual: string, expected: string) {
  const normalizedActual = normalize(actual);
  const normalizedExpected = normalize(expected);
  return (
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual) ||
    tokenOverlap(expected, actual) >= 0.45
  );
}

function canonicalId(value: string) {
  const direct: Record<string, string> = {
    "bv": "bacterial_vaginosis",
    "candida": "vulvovaginal_candidiasis",
    "vulvovaginal candidiasis": "vulvovaginal_candidiasis",
    "trichomonas": "trichomoniasis",
    "genital herpes": "herpes_simplex_virus_genital_ulcer",
    "hsv": "herpes_simplex_virus_genital_ulcer",
    "mullerian agenesis": "mayer_rokitansky_kuster_hauser_syndrome",
    "müllerian agenesis": "mayer_rokitansky_kuster_hauser_syndrome",
    "mrkh": "mayer_rokitansky_kuster_hauser_syndrome",
    "androgen insensitivity": "androgen_insensitivity_syndrome",
    "bacterial cystitis": "acute_bacterial_cystitis",
    "acute cystitis": "acute_bacterial_cystitis",
    "bladder cancer": "urothelial_malignancy"
  };
  return direct[normalize(value)] ?? slugify(value);
}

const cases: OntologyBenchmarkCase[] = [
  {
    id: "obgyn-primary-amenorrhea-mrkh-vs-ais",
    shelf: "OB/GYN",
    clinical_pattern: "primary amenorrhea with absent uterus",
    correct_schema: "mayer_rokitansky_kuster_hauser_syndrome",
    plausible_wrong_schema: "androgen_insensitivity_syndrome",
    nbme_surface_terms: ["primary amenorrhea", "normal breasts", "blind-ending vagina", "absent uterus", "46,XX"],
    pivot_clue: "46,XX with normal pubic hair",
    supporting_clues: ["normal breast development", "absent uterus", "blind-ending vagina"],
    noise_clues: ["primary amenorrhea"],
    shared_features: ["primary amenorrhea", "absent uterus", "normal breasts"],
    discriminator: "46,XX and normal pubic hair support Müllerian agenesis; 46,XY with scant pubic hair supports androgen insensitivity.",
    divergence_type: "Failure to prune competing diagnosis",
    repair_operation: "Use karyotype and pubic hair to separate MRKH from androgen insensitivity after recognizing absent uterus.",
    commit_rule: "Absent uterus plus 46,XX and normal pubic hair should commit to Müllerian agenesis.",
    expected_reasoning_sequence: ["primary amenorrhea", "absent uterus", "check karyotype and pubic hair", "commit to MRKH"]
  },
  {
    id: "obgyn-secondary-amenorrhea-pregnancy-first",
    shelf: "OB/GYN",
    clinical_pattern: "secondary amenorrhea",
    correct_schema: "pregnancy",
    plausible_wrong_schema: "polycystic_ovary_syndrome",
    nbme_surface_terms: ["missed menses", "secondary amenorrhea", "urine pregnancy test", "reproductive age"],
    pivot_clue: "reproductive-age patient with missed menses",
    supporting_clues: ["nausea", "breast tenderness"],
    noise_clues: ["irregular cycles"],
    shared_features: ["amenorrhea", "reproductive age"],
    discriminator: "Pregnancy must be excluded first in secondary amenorrhea before endocrine causes such as PCOS are pursued.",
    divergence_type: "Pattern recognized but commitment delayed",
    repair_operation: "Do not expand the endocrine differential until pregnancy testing has been performed.",
    commit_rule: "Secondary amenorrhea in a reproductive-age patient commits first to pregnancy testing.",
    expected_reasoning_sequence: ["secondary amenorrhea", "reproductive age", "exclude pregnancy", "then pursue endocrine causes"]
  },
  {
    id: "obgyn-acute-pelvic-pain-ectopic",
    shelf: "OB/GYN",
    clinical_pattern: "first-trimester pelvic pain and bleeding",
    correct_schema: "ectopic_pregnancy",
    plausible_wrong_schema: "spontaneous_abortion",
    nbme_surface_terms: ["first-trimester bleeding", "adnexal tenderness", "positive pregnancy test", "empty uterus"],
    pivot_clue: "positive pregnancy test with no intrauterine pregnancy on ultrasound",
    supporting_clues: ["pelvic pain", "vaginal bleeding", "adnexal tenderness"],
    noise_clues: ["mild spotting"],
    shared_features: ["first-trimester bleeding", "pregnancy"],
    discriminator: "No intrauterine pregnancy with pain and bleeding should activate ectopic pregnancy; spontaneous abortion needs intrauterine pregnancy or products of conception.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Anchor on pregnancy location before labeling the bleeding as abortion.",
    commit_rule: "Pregnancy of unknown location plus pain or adnexal findings should commit to ectopic evaluation.",
    expected_reasoning_sequence: ["pregnant", "pain and bleeding", "no intrauterine pregnancy", "ectopic pregnancy"]
  },
  {
    id: "obgyn-chronic-pelvic-pain-endometriosis",
    shelf: "OB/GYN",
    clinical_pattern: "chronic cyclic pelvic pain",
    correct_schema: "endometriosis",
    plausible_wrong_schema: "pelvic_inflammatory_disease",
    nbme_surface_terms: ["cyclic pelvic pain", "dyspareunia", "dysmenorrhea", "infertility"],
    pivot_clue: "pain is cyclic and associated with menses",
    supporting_clues: ["dyspareunia", "infertility"],
    noise_clues: ["pelvic pain"],
    shared_features: ["pelvic pain", "dyspareunia"],
    discriminator: "Cyclic pain tied to menses supports endometriosis; PID needs infectious signs such as fever, discharge, or cervical motion tenderness.",
    divergence_type: "Misweighted discriminator",
    repair_operation: "Weight menstrual cyclicity above the nonspecific fact that the patient has pelvic pain.",
    commit_rule: "Chronic pelvic pain that tracks with menses should commit to endometriosis unless infection clues are present.",
    expected_reasoning_sequence: ["chronic pelvic pain", "cyclic with menses", "dyspareunia or infertility", "endometriosis"]
  },
  {
    id: "obgyn-adnexal-mass-torsion",
    shelf: "OB/GYN",
    clinical_pattern: "acute unilateral pelvic pain with adnexal mass",
    correct_schema: "ovarian_torsion",
    plausible_wrong_schema: "ruptured_ovarian_cyst",
    nbme_surface_terms: ["sudden unilateral pelvic pain", "nausea vomiting", "adnexal mass", "decreased Doppler flow"],
    pivot_clue: "sudden severe unilateral pain with nausea and adnexal mass",
    supporting_clues: ["vomiting", "ovarian enlargement"],
    noise_clues: ["reproductive age"],
    shared_features: ["acute pelvic pain", "adnexal process"],
    discriminator: "Sudden severe pain with nausea and adnexal enlargement supports torsion; cyst rupture is usually transient pain with free fluid.",
    divergence_type: "Failure to prune competing diagnosis",
    repair_operation: "Use severity, nausea, and adnexal enlargement to prune benign cyst rupture.",
    commit_rule: "Acute severe unilateral pain plus adnexal mass should commit to torsion and urgent evaluation.",
    expected_reasoning_sequence: ["acute unilateral pain", "nausea/vomiting", "adnexal mass", "torsion"]
  },
  {
    id: "obgyn-vaginal-discharge-bv",
    shelf: "OB/GYN",
    clinical_pattern: "vaginal discharge",
    correct_schema: "bacterial_vaginosis",
    plausible_wrong_schema: "vulvovaginal_candidiasis",
    nbme_surface_terms: ["thin fishy discharge", "clue cells", "positive whiff test", "vaginal pH >4.5"],
    pivot_clue: "clue cells with fishy odor",
    supporting_clues: ["thin discharge", "elevated pH"],
    noise_clues: ["vaginal discharge"],
    shared_features: ["vaginal discharge"],
    discriminator: "Clue cells and fishy odor support BV; Candida needs pruritus, thick discharge, normal pH, and pseudohyphae.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Normalize to discharge syndrome, then use microscopy and pH to separate BV from Candida.",
    commit_rule: "Fishy discharge plus clue cells should commit to BV.",
    expected_reasoning_sequence: ["vaginal discharge", "clue cells", "fishy odor/elevated pH", "BV"]
  },
  {
    id: "obgyn-postpartum-breast-mastitis",
    shelf: "OB/GYN",
    clinical_pattern: "postpartum breast pain and fever",
    correct_schema: "lactational_mastitis",
    plausible_wrong_schema: "breast_engorgement",
    nbme_surface_terms: ["breastfeeding", "fever", "wedge-shaped erythema", "localized breast tenderness"],
    pivot_clue: "fever with wedge-shaped erythematous tender breast area",
    supporting_clues: ["breastfeeding", "localized pain"],
    noise_clues: ["postpartum"],
    shared_features: ["breastfeeding breast discomfort"],
    discriminator: "Fever and focal erythema support mastitis; engorgement causes bilateral fullness without focal infection.",
    divergence_type: "Misweighted discriminator",
    repair_operation: "Treat fever and focal erythema as infection-defining, not normal breastfeeding discomfort.",
    commit_rule: "Breastfeeding plus fever and focal erythema should commit to mastitis.",
    expected_reasoning_sequence: ["breastfeeding", "focal erythema", "fever", "mastitis"]
  },
  {
    id: "obgyn-third-trimester-bleeding-previa",
    shelf: "OB/GYN",
    clinical_pattern: "third-trimester bleeding",
    correct_schema: "placenta_previa",
    plausible_wrong_schema: "placental_abruption",
    nbme_surface_terms: ["painless bleeding", "bright red bleeding", "soft nontender uterus", "third trimester"],
    pivot_clue: "painless bleeding with no abdominal pain",
    supporting_clues: ["bright red bleeding", "stable vitals"],
    noise_clues: ["third trimester"],
    shared_features: ["third-trimester bleeding"],
    discriminator: "Painless bleeding supports previa; abruption should have pain, uterine tenderness, contractions, or fetal distress.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Use pain/tenderness as the branch point for third-trimester bleeding.",
    commit_rule: "Third-trimester painless bleeding should commit to placenta previa until proven otherwise.",
    expected_reasoning_sequence: ["third-trimester bleeding", "painless", "soft uterus", "placenta previa"]
  },
  {
    id: "obgyn-first-trimester-bleeding-rhogam",
    shelf: "OB/GYN",
    clinical_pattern: "first-trimester bleeding in Rh-negative pregnancy",
    correct_schema: "rh_negative_pregnancy_alloimmunization_prophylaxis",
    plausible_wrong_schema: "observation_only",
    nbme_surface_terms: ["Rh-negative", "pregnancy bleeding", "unsensitized", "Rho(D) immune globulin"],
    pivot_clue: "Rh-negative pregnancy with bleeding",
    supporting_clues: ["viable intrauterine pregnancy", "stable vitals"],
    noise_clues: ["first trimester"],
    shared_features: ["early pregnancy bleeding"],
    discriminator: "Rh-negative bleeding requires Rho(D) immune globulin prophylaxis; observation alone misses alloimmunization prevention.",
    divergence_type: "Pattern recognized but commitment delayed",
    repair_operation: "After confirming Rh-negative bleeding, commit to alloimmunization prophylaxis even if pregnancy is viable.",
    commit_rule: "Any unsensitized Rh-negative pregnancy bleeding should commit to Rho(D) immune globulin.",
    expected_reasoning_sequence: ["pregnancy bleeding", "Rh-negative", "unsensitized", "Rho(D) immune globulin"]
  },
  {
    id: "obgyn-hypertension-pregnancy-eclampsia",
    shelf: "OB/GYN",
    clinical_pattern: "hypertension after 20 weeks with seizure",
    correct_schema: "eclampsia",
    plausible_wrong_schema: "epilepsy",
    nbme_surface_terms: ["pregnancy after 20 weeks", "severe hypertension", "generalized seizure", "magnesium sulfate"],
    pivot_clue: "generalized seizure in a hypertensive pregnant patient",
    supporting_clues: ["headache", "visual symptoms"],
    noise_clues: ["no epilepsy history"],
    shared_features: ["seizure"],
    discriminator: "Seizure with hypertension after 20 weeks activates eclampsia; epilepsy would need a primary seizure disorder context.",
    divergence_type: "Incorrect illness script activation",
    repair_operation: "Attach the seizure to the pregnancy hypertension pathway before activating primary neurologic seizure schemas.",
    commit_rule: "Pregnancy hypertension plus seizure commits to eclampsia and magnesium sulfate.",
    expected_reasoning_sequence: ["pregnant after 20 weeks", "hypertension", "seizure", "eclampsia"]
  },
  {
    id: "obgyn-postpartum-hemorrhage-atony",
    shelf: "OB/GYN",
    clinical_pattern: "postpartum hemorrhage",
    correct_schema: "uterine_atony",
    plausible_wrong_schema: "retained_placenta",
    nbme_surface_terms: ["postpartum hemorrhage", "boggy uterus", "uterine massage", "oxytocin"],
    pivot_clue: "boggy enlarged uterus",
    supporting_clues: ["heavy bleeding after delivery"],
    noise_clues: ["delivery just occurred"],
    shared_features: ["postpartum bleeding"],
    discriminator: "Boggy uterus supports uterine atony; retained placenta requires incomplete placental delivery or tissue retention.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Use uterine tone as the first branch point in postpartum hemorrhage.",
    commit_rule: "Postpartum hemorrhage plus boggy uterus commits to uterine atony management.",
    expected_reasoning_sequence: ["postpartum hemorrhage", "assess tone", "boggy uterus", "uterine atony"]
  },
  {
    id: "im-chest-pain-stemi",
    shelf: "Internal Medicine",
    clinical_pattern: "acute chest pain",
    correct_schema: "st_elevation_myocardial_infarction",
    plausible_wrong_schema: "unstable_angina",
    nbme_surface_terms: ["crushing chest pain", "ST elevations", "troponin", "urgent PCI"],
    pivot_clue: "ST-segment elevations in contiguous leads",
    supporting_clues: ["diaphoresis", "radiation to arm"],
    noise_clues: ["risk factors"],
    shared_features: ["ischemic chest pain"],
    discriminator: "ST elevations activate STEMI and urgent reperfusion; unstable angina lacks biomarker elevation or ST-elevation criteria.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Use ECG territory and ST elevation before treating all ischemic chest pain as the same schema.",
    commit_rule: "Contiguous ST elevations with ischemic symptoms should commit to STEMI reperfusion.",
    expected_reasoning_sequence: ["ischemic chest pain", "ECG", "ST elevations", "STEMI"]
  },
  {
    id: "im-dyspnea-hf-vs-copd",
    shelf: "Internal Medicine",
    clinical_pattern: "acute dyspnea",
    correct_schema: "acute_decompensated_heart_failure",
    plausible_wrong_schema: "copd_exacerbation",
    nbme_surface_terms: ["orthopnea", "JVD", "bibasilar crackles", "pulmonary edema", "S3"],
    pivot_clue: "orthopnea with JVD and pulmonary edema",
    supporting_clues: ["leg edema", "S3"],
    noise_clues: ["smoking history"],
    shared_features: ["dyspnea"],
    discriminator: "Volume overload signs support heart failure; COPD needs wheezing, hyperinflation, and obstructive history without pulmonary edema.",
    divergence_type: "Promoted low-information clue",
    repair_operation: "Do not let smoking history outrank orthopnea, JVD, and pulmonary edema.",
    commit_rule: "Dyspnea plus volume overload signs should commit to acute decompensated heart failure.",
    expected_reasoning_sequence: ["dyspnea", "volume overload", "pulmonary edema", "heart failure"]
  },
  {
    id: "im-syncope-aortic-stenosis",
    shelf: "Internal Medicine",
    clinical_pattern: "exertional syncope",
    correct_schema: "aortic_stenosis",
    plausible_wrong_schema: "vasovagal_syncope",
    nbme_surface_terms: ["exertional syncope", "crescendo-decrescendo systolic murmur", "radiates to carotids", "delayed carotid upstroke"],
    pivot_clue: "exertional syncope with systolic murmur radiating to carotids",
    supporting_clues: ["older adult", "angina"],
    noise_clues: ["brief loss of consciousness"],
    shared_features: ["syncope"],
    discriminator: "Exertional syncope with carotid-radiating systolic murmur supports aortic stenosis; vasovagal syncope needs prodrome and benign triggers.",
    divergence_type: "Failure to prune competing diagnosis",
    repair_operation: "Use exertion and murmur quality to prune benign syncope.",
    commit_rule: "Exertional syncope plus classic systolic murmur should commit to aortic stenosis.",
    expected_reasoning_sequence: ["syncope", "exertional", "carotid-radiating murmur", "aortic stenosis"]
  },
  {
    id: "im-aki-prerenal",
    shelf: "Internal Medicine",
    clinical_pattern: "acute kidney injury",
    correct_schema: "prerenal_azotemia",
    plausible_wrong_schema: "acute_tubular_necrosis",
    nbme_surface_terms: ["high BUN:Cr ratio", "low urine sodium", "hyaline casts", "volume depletion"],
    pivot_clue: "low urine sodium with high BUN-to-creatinine ratio",
    supporting_clues: ["vomiting", "orthostasis"],
    noise_clues: ["creatinine increased"],
    shared_features: ["acute kidney injury"],
    discriminator: "Low urine sodium and high BUN:Cr support prerenal azotemia; ATN has muddy brown casts and higher urine sodium.",
    divergence_type: "Misweighted discriminator",
    repair_operation: "Use urine indices and casts to branch AKI before committing to intrinsic renal injury.",
    commit_rule: "AKI plus low urine sodium and high BUN:Cr should commit to prerenal physiology.",
    expected_reasoning_sequence: ["AKI", "urine sodium low", "BUN:Cr high", "prerenal azotemia"]
  },
  {
    id: "im-electrolyte-hyperkalemia-ecg",
    shelf: "Internal Medicine",
    clinical_pattern: "electrolyte disorder with ECG change",
    correct_schema: "hyperkalemia_cardiac_membrane_stabilization",
    plausible_wrong_schema: "insulin_glucose_shift",
    nbme_surface_terms: ["hyperkalemia", "peaked T waves", "calcium gluconate", "ECG changes"],
    pivot_clue: "hyperkalemia with ECG changes",
    supporting_clues: ["weakness", "renal failure"],
    noise_clues: ["elevated potassium alone"],
    shared_features: ["hyperkalemia treatment"],
    discriminator: "ECG changes require calcium first for membrane stabilization; insulin shifts potassium after stabilization.",
    divergence_type: "Premature schema activation",
    repair_operation: "Do not jump to potassium shifting before stabilizing the myocardium when ECG changes are present.",
    commit_rule: "Hyperkalemia plus ECG changes commits first to IV calcium.",
    expected_reasoning_sequence: ["hyperkalemia", "ECG changes", "stabilize membrane", "calcium"]
  },
  {
    id: "im-thyroid-storm",
    shelf: "Internal Medicine",
    clinical_pattern: "fever and altered mental status with thyrotoxicosis",
    correct_schema: "thyroid_storm",
    plausible_wrong_schema: "sepsis",
    nbme_surface_terms: ["fever", "tachycardia", "altered mental status", "thyrotoxicosis", "beta blocker"],
    pivot_clue: "fever and delirium with signs of thyrotoxicosis",
    supporting_clues: ["tremor", "goiter", "atrial fibrillation"],
    noise_clues: ["fever"],
    shared_features: ["fever", "tachycardia", "altered mental status"],
    discriminator: "Thyrotoxic signs with fever and delirium support thyroid storm; sepsis needs infectious source and lacks hyperthyroid features.",
    divergence_type: "Promoted low-information clue",
    repair_operation: "Do not let fever alone activate sepsis when the endocrine toxidrome explains the presentation.",
    commit_rule: "Fever plus altered mental status plus thyrotoxicosis commits to thyroid storm treatment.",
    expected_reasoning_sequence: ["fever/AMS", "thyrotoxicosis signs", "storm", "treat"]
  },
  {
    id: "im-shock-septic",
    shelf: "Internal Medicine",
    clinical_pattern: "shock",
    correct_schema: "septic_shock",
    plausible_wrong_schema: "cardiogenic_shock",
    nbme_surface_terms: ["fever", "hypotension", "warm extremities", "wide pulse pressure", "suspected infection"],
    pivot_clue: "hypotension with infection and warm vasodilated extremities",
    supporting_clues: ["fever", "leukocytosis", "elevated lactate"],
    noise_clues: ["tachycardia"],
    shared_features: ["hypotension", "poor perfusion"],
    discriminator: "Warm vasodilatory shock with infection supports septic shock; cardiogenic shock has cold clammy extremities and pump failure signs.",
    divergence_type: "Failure to prune competing diagnosis",
    repair_operation: "Branch shock by perfusion phenotype and source before defaulting to cardiac pump failure.",
    commit_rule: "Infection plus warm hypotensive shock should commit to septic shock resuscitation.",
    expected_reasoning_sequence: ["shock", "infection", "warm vasodilated", "septic shock"]
  },
  {
    id: "im-fever-endocarditis",
    shelf: "Internal Medicine",
    clinical_pattern: "persistent fever with murmur",
    correct_schema: "infective_endocarditis",
    plausible_wrong_schema: "rheumatic_fever",
    nbme_surface_terms: ["fever", "new murmur", "positive blood cultures", "IV drug use", "Janeway lesions"],
    pivot_clue: "persistent bacteremia with new murmur",
    supporting_clues: ["IV drug use", "embolic lesions"],
    noise_clues: ["joint pain"],
    shared_features: ["fever", "cardiac murmur"],
    discriminator: "Persistent bacteremia with new murmur supports endocarditis; rheumatic fever follows strep pharyngitis and migratory arthritis.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Use blood cultures and murmur timing to separate infection of valves from post-strep inflammation.",
    commit_rule: "Fever plus persistent bacteremia and new murmur should commit to infective endocarditis.",
    expected_reasoning_sequence: ["fever", "blood cultures", "new murmur", "endocarditis"]
  },
  {
    id: "surgery-acute-abdomen-appendicitis",
    shelf: "Surgery",
    clinical_pattern: "acute abdomen",
    correct_schema: "appendicitis",
    plausible_wrong_schema: "gastroenteritis",
    nbme_surface_terms: ["periumbilical pain migrates to RLQ", "McBurney point", "anorexia", "fever"],
    pivot_clue: "periumbilical pain migrating to right lower quadrant",
    supporting_clues: ["anorexia", "low-grade fever"],
    noise_clues: ["nausea"],
    shared_features: ["abdominal pain", "nausea"],
    discriminator: "Migratory focal RLQ pain supports appendicitis; gastroenteritis is diffuse crampy pain with diarrhea.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Use migration and focal peritoneal localization to prune nonspecific gastroenteritis.",
    commit_rule: "Migratory RLQ pain should commit to appendicitis evaluation.",
    expected_reasoning_sequence: ["abdominal pain", "migration", "RLQ focality", "appendicitis"]
  },
  {
    id: "surgery-bowel-obstruction-sbo",
    shelf: "Surgery",
    clinical_pattern: "bowel obstruction",
    correct_schema: "small_bowel_obstruction",
    plausible_wrong_schema: "ileus",
    nbme_surface_terms: ["colicky abdominal pain", "vomiting", "distention", "prior surgery", "air-fluid levels"],
    pivot_clue: "colicky pain with prior abdominal surgery and air-fluid levels",
    supporting_clues: ["vomiting", "distention"],
    noise_clues: ["postoperative history"],
    shared_features: ["distention", "decreased bowel function"],
    discriminator: "Colicky pain and transition/air-fluid levels support mechanical SBO; ileus is diffuse bowel hypomotility without a transition point.",
    divergence_type: "Failure to prune competing diagnosis",
    repair_operation: "Use colicky pain and obstruction pattern to separate mechanical obstruction from ileus.",
    commit_rule: "Prior surgery plus colicky pain and air-fluid levels should commit to SBO.",
    expected_reasoning_sequence: ["obstructive symptoms", "prior surgery", "mechanical pattern", "SBO"]
  },
  {
    id: "surgery-upper-gi-bleed-variceal",
    shelf: "Surgery",
    clinical_pattern: "upper GI bleed",
    correct_schema: "esophageal_variceal_bleeding",
    plausible_wrong_schema: "peptic_ulcer_bleeding",
    nbme_surface_terms: ["hematemesis", "cirrhosis", "portal hypertension", "octreotide", "endoscopy"],
    pivot_clue: "hematemesis in a patient with cirrhosis",
    supporting_clues: ["ascites", "splenomegaly"],
    noise_clues: ["epigastric discomfort"],
    shared_features: ["upper GI bleeding", "hematemesis"],
    discriminator: "Cirrhosis and portal hypertension support variceal bleed; peptic ulcer bleed needs ulcer risk factors without portal hypertension clues.",
    divergence_type: "Promoted low-information clue",
    repair_operation: "Do not let nonspecific epigastric symptoms outrank portal hypertension in hematemesis.",
    commit_rule: "Upper GI bleed plus cirrhosis should commit to variceal bleeding coverage.",
    expected_reasoning_sequence: ["hematemesis", "cirrhosis", "portal hypertension", "variceal bleed"]
  },
  {
    id: "surgery-lower-gi-bleed-diverticular",
    shelf: "Surgery",
    clinical_pattern: "lower GI bleed",
    correct_schema: "diverticular_bleeding",
    plausible_wrong_schema: "ischemic_colitis",
    nbme_surface_terms: ["painless hematochezia", "older adult", "diverticulosis"],
    pivot_clue: "painless large-volume hematochezia",
    supporting_clues: ["older adult", "known diverticulosis"],
    noise_clues: ["abdominal cramping absent"],
    shared_features: ["hematochezia"],
    discriminator: "Painless large-volume bleeding supports diverticular bleed; ischemic colitis has crampy abdominal pain and bloody diarrhea.",
    divergence_type: "Missed pivot clue",
    repair_operation: "Use pain status to separate diverticular bleeding from ischemic colitis.",
    commit_rule: "Painless hematochezia in an older adult should commit to diverticular bleeding until proven otherwise.",
    expected_reasoning_sequence: ["hematochezia", "painless", "older adult", "diverticular bleed"]
  },
  {
    id: "surgery-trauma-tension-pneumothorax",
    shelf: "Surgery",
    clinical_pattern: "trauma with shock and respiratory distress",
    correct_schema: "tension_pneumothorax",
    plausible_wrong_schema: "hemothorax",
    nbme_surface_terms: ["hypotension", "absent breath sounds", "tracheal deviation", "needle decompression"],
    pivot_clue: "tracheal deviation with absent breath sounds and hypotension",
    supporting_clues: ["respiratory distress", "chest trauma"],
    noise_clues: ["trauma"],
    shared_features: ["trauma", "decreased breath sounds", "shock"],
    discriminator: "Tracheal deviation and obstructive physiology support tension pneumothorax; hemothorax has dullness to percussion and blood loss physiology.",
    divergence_type: "Misweighted discriminator",
    repair_operation: "Use tracheal deviation and obstructive shock to choose decompression before volume-loss schemas.",
    commit_rule: "Trauma plus hypotension, absent breath sounds, and tracheal deviation commits to immediate needle decompression.",
    expected_reasoning_sequence: ["trauma", "respiratory distress", "tracheal deviation", "tension pneumothorax"]
  },
  {
    id: "im-adrenal-insufficiency-crisis",
    shelf: "Internal Medicine",
    clinical_pattern: "shock with electrolyte abnormalities",
    correct_schema: "adrenal_crisis",
    plausible_wrong_schema: "septic_shock",
    nbme_surface_terms: ["hypotension", "hyponatremia", "hyperkalemia", "hyperpigmentation", "hydrocortisone"],
    pivot_clue: "hypotension with hyponatremia and hyperkalemia",
    supporting_clues: ["weight loss", "hyperpigmentation", "abdominal pain"],
    noise_clues: ["fever absent"],
    shared_features: ["hypotension", "shock"],
    discriminator: "Hyponatremia plus hyperkalemia in shock supports adrenal crisis; septic shock needs infectious source and distributive physiology.",
    divergence_type: "Incorrect illness script activation",
    repair_operation: "Do not activate the generic sepsis pathway until electrolyte and adrenal clues have been weighted.",
    commit_rule: "Shock plus hyponatremia and hyperkalemia should commit to adrenal crisis treatment.",
    expected_reasoning_sequence: ["shock", "hyponatremia/hyperkalemia", "adrenal clues", "adrenal crisis"]
  }
];

export const ontologyBenchmarkCases = cases;

function benchmarkCaseToKnowledgeObject(benchmark: OntologyBenchmarkCase): KnowledgeObject {
  const correctName = benchmark.correct_schema.replace(/_/g, " ");
  const wrongName = benchmark.plausible_wrong_schema.replace(/_/g, " ");
  return {
    id: `benchmark-${benchmark.id}`,
    sourceType: "faculty_question_set",
    sourceMetadata: {
      sourceId: "ontology-benchmark-v1",
      segmentId: benchmark.id,
      sourceHash: `benchmark-${benchmark.id}`,
      proprietaryExpressionRetained: false
    },
    subject: benchmark.shelf,
    system: benchmark.clinical_pattern,
    topic: correctName,
    blueprintCategory: benchmark.clinical_pattern,
    estimatedYield: 0.8,
    canonicalAnswer: correctName,
    displayAnswer: correctName,
    literalAnswer: correctName,
    abstractConcept: correctName,
    conceptType: "diagnosis",
    aliases: [correctName, benchmark.correct_schema, ...benchmark.nbme_surface_terms],
    acceptableAnswerPatterns: [correctName, benchmark.correct_schema],
    unacceptableNearMisses: [wrongName, ...benchmark.noise_clues],
    testedDecision: `activate ${correctName} from the pivot clue`,
    discriminatorConcepts: [correctName, wrongName],
    avoidLiteralStorage: true,
    testedConcept: correctName,
    competency: "diagnosis",
    questionArchetype: "Diagnosis",
    managementStage: "diagnosis",
    illnessScript: benchmark.expected_reasoning_sequence,
    epidemiology: benchmark.shared_features,
    context: [benchmark.clinical_pattern, ...benchmark.shared_features],
    pivot: benchmark.pivot_clue,
    supportingClues: benchmark.supporting_clues,
    pertinentNegatives: benchmark.noise_clues,
    discriminatorPair: {
      conceptA: correctName,
      conceptB: wrongName,
      pivot: benchmark.pivot_clue,
      whyPivotSupportsA: benchmark.discriminator,
      whatWouldSupportB: benchmark.discriminator,
      boardRule: benchmark.commit_rule
    },
    semanticLinks: [
      {
        sourceText: benchmark.pivot_clue,
        relationship: "supports",
        targetConcept: benchmark.clinical_pattern,
        targetDiagnosis: correctName
      }
    ],
    commonTrap: benchmark.divergence_type,
    nextTimeRule: benchmark.commit_rule,
    clinicalPearl: benchmark.commit_rule,
    complications: [],
    contraindications: [],
    transferConcepts: [wrongName],
    confidence: 0.9,
    noveltyScore: 1,
    duplicateScore: 0,
    missingFields: [],
    lowConfidenceWarnings: [],
    validationSources: ["RapidRounds manually curated ontology benchmark"]
  };
}

function compareSchema(generated: string, expected: string) {
  return generated === canonicalId(expected);
}

function compareCompetitor(entry: ClinicalReasoningOntologyEntry, expected: string) {
  const expectedId = canonicalId(expected);
  return entry.competing_schemas.some((schema) =>
    schema.canonical_schema_id === expectedId ||
    schema.schema_id === expectedId ||
    containsMeaning(schema.canonical_name, expected)
  );
}

function evaluateCase(benchmark: OntologyBenchmarkCase): OntologyBenchmarkCaseResult {
  const report = buildClinicalReasoningOntology([benchmarkCaseToKnowledgeObject(benchmark)], []);
  const entry = report.entries[0];
  const primaryCompetitor = entry.competing_schemas[0];
  const repair = entry.repair_operations[0]?.repair_statement ?? "";
  const divergence = entry.common_misactivations[0]?.divergence_type;
  const discriminator = primaryCompetitor?.discriminator ?? entry.competing_schemas.map((schema) => schema.discriminator).join(" ");

  const passes: Record<OntologyBenchmarkMetricName, boolean> = {
    clinicalPattern: containsMeaning(entry.clinical_pattern, benchmark.clinical_pattern),
    schemaActivation: compareSchema(entry.schema_activation.canonical_schema_id, benchmark.correct_schema),
    competingSchemaNormalization: compareCompetitor(entry, benchmark.plausible_wrong_schema),
    pivotClue: entry.activation.pivot_clues.some((pivot) => containsMeaning(pivot, benchmark.pivot_clue)),
    discriminator: containsMeaning(discriminator, benchmark.discriminator) || containsMeaning(discriminator, benchmark.pivot_clue),
    divergenceClassification: divergence === benchmark.divergence_type,
    repairOperation: containsMeaning(repair, benchmark.repair_operation) || containsMeaning(repair, benchmark.pivot_clue),
    commitRule: containsMeaning(entry.commit_rule, benchmark.commit_rule)
  };

  const failures: OntologyBenchmarkCaseResult["failures"] = [];
  const addFailure = (metric: OntologyBenchmarkMetricName, expected: string, actual: string, why: string) => {
    if (!passes[metric]) failures.push({ metric, expected, actual, why });
  };
  addFailure("clinicalPattern", benchmark.clinical_pattern, entry.clinical_pattern, "The ontology did not preserve the presenting clinical pattern as the retrieval frame.");
  addFailure("schemaActivation", canonicalId(benchmark.correct_schema), entry.schema_activation.canonical_schema_id, "The ontology activated the wrong canonical reasoning schema.");
  addFailure("competingSchemaNormalization", canonicalId(benchmark.plausible_wrong_schema), entry.competing_schemas.map((schema) => schema.canonical_schema_id).join(", "), "The ontology failed to normalize the plausible wrong branch into a real competing schema.");
  addFailure("pivotClue", benchmark.pivot_clue, entry.activation.pivot_clues.join(", "), "The ontology did not isolate the expected discriminator as the dominant pivot.");
  addFailure("discriminator", benchmark.discriminator, discriminator, "The discriminator did not explain what separates the schemas.");
  addFailure("divergenceClassification", benchmark.divergence_type, divergence ?? "", "The learner reasoning divergence was classified incorrectly.");
  addFailure("repairOperation", benchmark.repair_operation, repair, "The repair did not identify the smallest reasoning correction.");
  addFailure("commitRule", benchmark.commit_rule, entry.commit_rule, "The commit rule did not tell the learner when to stop searching.");

  const passed = Object.values(passes).filter(Boolean).length;
  const score = Math.round((passed / Object.keys(passes).length) * 100);

  return {
    id: benchmark.id,
    shelf: benchmark.shelf,
    clinical_pattern: benchmark.clinical_pattern,
    correct_schema: benchmark.correct_schema,
    plausible_wrong_schema: benchmark.plausible_wrong_schema,
    passes,
    score,
    failures,
    generated: {
      clinical_pattern: entry.clinical_pattern,
      canonical_schema_id: entry.schema_activation.canonical_schema_id,
      competing_schema_ids: entry.competing_schemas.map((schema) => schema.canonical_schema_id),
      pivot_clues: entry.activation.pivot_clues,
      discriminator,
      divergence_type: divergence,
      repair_operation: repair,
      commit_rule: entry.commit_rule
    },
    attending_evaluation: failures.length === 0
      ? "Models a reasoning divergence: pattern, pivot, competing schema, repair, and commit rule are all present."
      : `Needs review: ${failures.map((failure) => failure.metric).join(", ")}. This risks becoming reorganized facts instead of expert reasoning.`
  };
}

export function buildOntologyBenchmarkReport(): OntologyBenchmarkReport {
  const results = ontologyBenchmarkCases.map(evaluateCase);
  const metricNames: OntologyBenchmarkMetricName[] = [
    "clinicalPattern",
    "schemaActivation",
    "competingSchemaNormalization",
    "pivotClue",
    "discriminator",
    "divergenceClassification",
    "repairOperation",
    "commitRule"
  ];
  const summary = Object.fromEntries(metricNames.map((metric) => {
    const passed = results.filter((result) => result.passes[metric]).length;
    return [metric, Math.round((passed / results.length) * 100)];
  })) as Record<OntologyBenchmarkMetricName, number>;
  const totalPasses = results.reduce((sum, result) => sum + Object.values(result.passes).filter(Boolean).length, 0);
  const totalChecks = results.length * metricNames.length;

  return {
    generatedAt: new Date().toISOString(),
    benchmarkCaseCount: results.length,
    summary: {
      ...summary,
      overall: Math.round((totalPasses / totalChecks) * 100),
      failedCaseCount: results.filter((result) => result.failures.length > 0).length
    },
    results
  };
}

export function writeOntologyBenchmarkReport(
  report: OntologyBenchmarkReport,
  outputPath = "reports/ontology-benchmark.json"
) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function formatOntologyBenchmarkSummary(report: OntologyBenchmarkReport) {
  const lines = [
    "RapidRounds Ontology Benchmark",
    `Generated: ${report.generatedAt}`,
    `Benchmark cases: ${report.benchmarkCaseCount}`,
    `Overall: ${report.summary.overall}%`,
    `Failed cases: ${report.summary.failedCaseCount}`,
    "",
    `Clinical pattern: ${report.summary.clinicalPattern}%`,
    `Schema activation: ${report.summary.schemaActivation}%`,
    `Competing schema normalization: ${report.summary.competingSchemaNormalization}%`,
    `Pivot clue: ${report.summary.pivotClue}%`,
    `Discriminator: ${report.summary.discriminator}%`,
    `Divergence classification: ${report.summary.divergenceClassification}%`,
    `Repair operation: ${report.summary.repairOperation}%`,
    `Commit rule: ${report.summary.commitRule}%`,
    ""
  ];

  const failed = report.results.filter((result) => result.failures.length > 0);
  if (failed.length > 0) {
    lines.push("Failed cases:");
    for (const result of failed) {
      lines.push(`- ${result.id} (${result.score}%): ${result.failures.map((failure) => failure.metric).join(", ")}`);
      for (const failure of result.failures.slice(0, 3)) {
        lines.push(`  ${failure.metric}: ${failure.why}`);
      }
    }
  } else {
    lines.push("All benchmark cases passed.");
  }

  return lines.join("\n");
}
