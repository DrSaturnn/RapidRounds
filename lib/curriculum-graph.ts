import { normalizeAnswer } from "@/lib/answer-check";

export type CurriculumPriority = "core" | "high" | "medium" | "low";

export type CurriculumNode = {
  id: string;
  title: string;
  shelfTags: string[];
  clinicalContextTags: string[];
  systemTags: string[];
  disciplineTags: string[];
  decisionTypeTags: string[];
  parentIds?: string[];
  prerequisiteIds?: string[];
  successorIds?: string[];
  relatedIds?: string[];
  commonDistractorIds?: string[];
  guidelineSourceTags?: string[];
  priority: CurriculumPriority;
};

export type CurriculumLearningItem = {
  nodeId: string;
  concept: string;
  reason: string;
  priority: "recommended" | "explore";
};

const shelf = {
  obgyn: "OB/GYN",
  im: "Internal Medicine",
  surgery: "Surgery",
  pediatrics: "Pediatrics",
  psychiatry: "Psychiatry",
  family: "Family Medicine",
  emergency: "Emergency Medicine",
  ethics: "Ethics"
} as const;

function node(input: CurriculumNode): CurriculumNode {
  return input;
}

const topLevelContextNodes: CurriculumNode[] = [
  node({
    id: "pregnancy",
    title: "Pregnancy",
    shelfTags: [shelf.obgyn, shelf.family, shelf.im, shelf.surgery, shelf.psychiatry, shelf.pediatrics, shelf.emergency, shelf.ethics],
    clinicalContextTags: ["pregnancy"],
    systemTags: ["reproductive"],
    disciplineTags: ["cross-disciplinary"],
    decisionTypeTags: ["diagnosis", "management", "prevention", "ethics"],
    successorIds: ["core-obstetrics", "internal-medicine-in-pregnancy", "surgery-acute-abdomen-in-pregnancy", "psychiatry-pregnancy-postpartum"],
    priority: "core"
  }),
  node({
    id: "postpartum",
    title: "Postpartum",
    shelfTags: [shelf.obgyn, shelf.family, shelf.psychiatry, shelf.pediatrics],
    clinicalContextTags: ["postpartum"],
    systemTags: ["reproductive"],
    disciplineTags: ["obstetrics", "family medicine", "psychiatry", "neonatology"],
    decisionTypeTags: ["diagnosis", "management", "prevention"],
    priority: "core"
  }),
  node({
    id: "preventive-care",
    title: "Preventive Care",
    shelfTags: [shelf.family, shelf.im, shelf.obgyn, shelf.pediatrics],
    clinicalContextTags: ["outpatient", "screening", "prevention"],
    systemTags: ["population health"],
    disciplineTags: ["family medicine", "internal medicine", "pediatrics", "obstetrics"],
    decisionTypeTags: ["screening", "counseling", "vaccination"],
    priority: "core"
  }),
  node({
    id: "emergency-presentations",
    title: "Emergency Presentations",
    shelfTags: [shelf.emergency, shelf.im, shelf.surgery, shelf.obgyn, shelf.pediatrics],
    clinicalContextTags: ["emergency", "acute instability"],
    systemTags: ["multi-system"],
    disciplineTags: ["emergency medicine", "surgery", "internal medicine", "obstetrics"],
    decisionTypeTags: ["stabilization", "diagnosis", "management"],
    priority: "core"
  }),
  node({
    id: "inpatient-medicine",
    title: "Inpatient Medicine",
    shelfTags: [shelf.im, shelf.family, shelf.obgyn],
    clinicalContextTags: ["inpatient", "hospital medicine"],
    systemTags: ["multi-system"],
    disciplineTags: ["internal medicine"],
    decisionTypeTags: ["diagnosis", "management", "complication"],
    priority: "high"
  }),
  node({
    id: "pediatrics-neonatology",
    title: "Pediatrics / Neonatology",
    shelfTags: [shelf.pediatrics, shelf.family, shelf.obgyn],
    clinicalContextTags: ["neonate", "child"],
    systemTags: ["pediatrics"],
    disciplineTags: ["pediatrics", "neonatology"],
    decisionTypeTags: ["diagnosis", "management", "prevention"],
    priority: "core"
  }),
  node({
    id: "psychiatry-behavioral-health",
    title: "Psychiatry / Behavioral Health",
    shelfTags: [shelf.psychiatry, shelf.family, shelf.obgyn, shelf.im],
    clinicalContextTags: ["behavioral health"],
    systemTags: ["psychiatry"],
    disciplineTags: ["psychiatry", "family medicine"],
    decisionTypeTags: ["diagnosis", "management", "safety"],
    priority: "core"
  }),
  node({
    id: "surgery-acute-abdomen",
    title: "Surgery / Acute Abdomen",
    shelfTags: [shelf.surgery, shelf.emergency, shelf.obgyn, shelf.im],
    clinicalContextTags: ["acute abdomen", "operative disease"],
    systemTags: ["gastrointestinal", "vascular", "reproductive"],
    disciplineTags: ["surgery", "emergency medicine"],
    decisionTypeTags: ["diagnosis", "management", "operative triage"],
    priority: "core"
  }),
  node({
    id: "womens-health",
    title: "Women's Health",
    shelfTags: [shelf.obgyn, shelf.family, shelf.im],
    clinicalContextTags: ["gynecology", "reproductive health"],
    systemTags: ["reproductive"],
    disciplineTags: ["obstetrics", "gynecology", "family medicine"],
    decisionTypeTags: ["diagnosis", "management", "screening"],
    priority: "core"
  }),
  node({
    id: "geriatrics",
    title: "Geriatrics",
    shelfTags: [shelf.family, shelf.im, shelf.psychiatry],
    clinicalContextTags: ["older adult"],
    systemTags: ["multi-system"],
    disciplineTags: ["family medicine", "internal medicine", "psychiatry"],
    decisionTypeTags: ["diagnosis", "management", "safety"],
    priority: "high"
  }),
  node({
    id: "chronic-disease-management",
    title: "Chronic Disease Management",
    shelfTags: [shelf.im, shelf.family, shelf.pediatrics],
    clinicalContextTags: ["outpatient", "longitudinal care"],
    systemTags: ["multi-system"],
    disciplineTags: ["internal medicine", "family medicine"],
    decisionTypeTags: ["management", "screening", "prevention"],
    priority: "core"
  })
];

const pregnancyBranchNodes: CurriculumNode[] = [
  node({
    id: "core-obstetrics",
    title: "Core Obstetrics",
    shelfTags: [shelf.obgyn, shelf.family],
    clinicalContextTags: ["pregnancy"],
    systemTags: ["reproductive"],
    disciplineTags: ["obstetrics"],
    decisionTypeTags: ["diagnosis", "management"],
    parentIds: ["pregnancy"],
    priority: "core"
  }),
  node({
    id: "internal-medicine-in-pregnancy",
    title: "Internal Medicine in Pregnancy",
    shelfTags: [shelf.obgyn, shelf.im, shelf.family],
    clinicalContextTags: ["pregnancy", "medical disease in pregnancy"],
    systemTags: ["cardiometabolic", "pulmonary", "renal", "endocrine", "hematology"],
    disciplineTags: ["internal medicine", "obstetrics"],
    decisionTypeTags: ["diagnosis", "management", "medication safety"],
    parentIds: ["pregnancy", "inpatient-medicine"],
    priority: "core"
  }),
  node({
    id: "surgery-acute-abdomen-in-pregnancy",
    title: "Surgery / Acute Abdomen in Pregnancy",
    shelfTags: [shelf.obgyn, shelf.surgery, shelf.emergency],
    clinicalContextTags: ["pregnancy", "acute abdomen"],
    systemTags: ["gastrointestinal", "trauma", "reproductive"],
    disciplineTags: ["surgery", "emergency medicine", "obstetrics"],
    decisionTypeTags: ["diagnosis", "operative triage", "imaging choice"],
    parentIds: ["pregnancy", "surgery-acute-abdomen"],
    priority: "high"
  }),
  node({
    id: "psychiatry-pregnancy-postpartum",
    title: "Psychiatry in Pregnancy and Postpartum",
    shelfTags: [shelf.obgyn, shelf.psychiatry, shelf.family],
    clinicalContextTags: ["pregnancy", "postpartum", "behavioral health"],
    systemTags: ["psychiatry"],
    disciplineTags: ["psychiatry", "obstetrics", "family medicine"],
    decisionTypeTags: ["diagnosis", "management", "medication safety", "safety"],
    parentIds: ["pregnancy", "postpartum", "psychiatry-behavioral-health"],
    priority: "high"
  }),
  node({
    id: "neonatology-connected-to-pregnancy",
    title: "Pediatrics / Neonatology Connected to Pregnancy",
    shelfTags: [shelf.obgyn, shelf.pediatrics, shelf.family],
    clinicalContextTags: ["pregnancy", "neonate"],
    systemTags: ["neonatology", "infectious disease", "metabolic"],
    disciplineTags: ["pediatrics", "neonatology", "obstetrics"],
    decisionTypeTags: ["prevention", "diagnosis", "management"],
    parentIds: ["pregnancy", "pediatrics-neonatology"],
    priority: "high"
  }),
  node({
    id: "family-preventive-care-in-pregnancy",
    title: "Family Medicine / Preventive Care in Pregnancy",
    shelfTags: [shelf.obgyn, shelf.family, shelf.im],
    clinicalContextTags: ["pregnancy", "outpatient", "preventive care"],
    systemTags: ["population health", "reproductive"],
    disciplineTags: ["family medicine", "obstetrics"],
    decisionTypeTags: ["screening", "counseling", "vaccination", "prevention"],
    parentIds: ["pregnancy", "preventive-care"],
    priority: "core"
  }),
  node({
    id: "ethics-in-pregnancy",
    title: "Ethics in Pregnancy",
    shelfTags: [shelf.obgyn, shelf.ethics, shelf.family, shelf.emergency],
    clinicalContextTags: ["pregnancy", "ethics"],
    systemTags: ["ethics"],
    disciplineTags: ["ethics", "obstetrics", "emergency medicine"],
    decisionTypeTags: ["capacity", "consent", "confidentiality", "autonomy"],
    parentIds: ["pregnancy"],
    priority: "high"
  })
];

function pregnancyNode(
  id: string,
  title: string,
  parentIds: string[],
  disciplineTags: string[],
  systemTags: string[],
  decisionTypeTags: string[],
  options: Partial<CurriculumNode> = {}
): CurriculumNode {
  return node({
    id,
    title,
    shelfTags: options.shelfTags ?? [shelf.obgyn],
    clinicalContextTags: options.clinicalContextTags ?? ["pregnancy"],
    systemTags,
    disciplineTags,
    decisionTypeTags,
    parentIds,
    priority: options.priority ?? "high",
    prerequisiteIds: options.prerequisiteIds,
    successorIds: options.successorIds,
    relatedIds: options.relatedIds,
    commonDistractorIds: options.commonDistractorIds,
    guidelineSourceTags: options.guidelineSourceTags
  });
}

const pregnancyDetailNodes: CurriculumNode[] = [
  pregnancyNode("hypertensive-disorders-pregnancy", "Hypertensive disorders of pregnancy", ["core-obstetrics", "internal-medicine-in-pregnancy"], ["obstetrics", "internal medicine"], ["cardiovascular", "renal"], ["diagnosis", "management"], {
    shelfTags: [shelf.obgyn, shelf.im, shelf.family, shelf.emergency],
    successorIds: ["gestational-hypertension", "preeclampsia-without-severe-features", "preeclampsia-with-severe-features"],
    priority: "core"
  }),
  pregnancyNode("gestational-hypertension", "Gestational hypertension", ["hypertensive-disorders-pregnancy"], ["obstetrics", "internal medicine"], ["cardiovascular"], ["diagnosis"], {
    successorIds: ["preeclampsia-without-severe-features"],
    commonDistractorIds: ["preeclampsia-without-severe-features", "chronic-hypertension-pregnancy"],
    priority: "core"
  }),
  pregnancyNode("chronic-hypertension-pregnancy", "Chronic hypertension in pregnancy", ["hypertensive-disorders-pregnancy", "internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["cardiovascular"], ["diagnosis", "management"], {
    commonDistractorIds: ["gestational-hypertension", "superimposed-preeclampsia"],
    priority: "high"
  }),
  pregnancyNode("superimposed-preeclampsia", "Superimposed preeclampsia", ["hypertensive-disorders-pregnancy", "internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["cardiovascular", "renal"], ["diagnosis", "management"], {
    prerequisiteIds: ["chronic-hypertension-pregnancy"],
    commonDistractorIds: ["gestational-hypertension", "preeclampsia-without-severe-features"],
    priority: "high"
  }),
  pregnancyNode("preeclampsia-without-severe-features", "Preeclampsia without severe features", ["hypertensive-disorders-pregnancy"], ["obstetrics", "internal medicine"], ["cardiovascular", "renal"], ["diagnosis", "delivery timing"], {
    prerequisiteIds: ["gestational-hypertension"],
    successorIds: ["preeclampsia-with-severe-features"],
    commonDistractorIds: ["gestational-hypertension"],
    priority: "core"
  }),
  pregnancyNode("preeclampsia-with-severe-features", "Preeclampsia with severe features", ["hypertensive-disorders-pregnancy", "emergency-presentations"], ["obstetrics", "internal medicine", "emergency medicine"], ["cardiovascular", "renal", "neurologic"], ["diagnosis", "management", "stabilization"], {
    prerequisiteIds: ["preeclampsia-without-severe-features"],
    successorIds: ["magnesium-sulfate", "severe-hypertension-treatment", "hellp-syndrome"],
    commonDistractorIds: ["gestational-hypertension", "hellp-syndrome"],
    priority: "core"
  }),
  pregnancyNode("magnesium-sulfate", "Magnesium sulfate", ["hypertensive-disorders-pregnancy"], ["obstetrics", "pharmacology"], ["neurologic", "pharmacology"], ["management", "prevention"], {
    successorIds: ["eclampsia", "magnesium-toxicity"],
    relatedIds: ["calcium-gluconate", "severe-hypertension-treatment"],
    priority: "core"
  }),
  pregnancyNode("magnesium-toxicity", "Magnesium toxicity", ["hypertensive-disorders-pregnancy"], ["obstetrics", "pharmacology", "emergency medicine"], ["neurologic", "pharmacology"], ["complication", "management"], {
    relatedIds: ["calcium-gluconate"],
    priority: "high"
  }),
  pregnancyNode("calcium-gluconate", "Calcium gluconate", ["hypertensive-disorders-pregnancy"], ["obstetrics", "pharmacology", "emergency medicine"], ["pharmacology"], ["antidote", "management"], {
    prerequisiteIds: ["magnesium-toxicity"],
    priority: "high"
  }),
  pregnancyNode("severe-hypertension-treatment", "Severe hypertension treatment", ["hypertensive-disorders-pregnancy", "emergency-presentations"], ["obstetrics", "internal medicine", "emergency medicine"], ["cardiovascular", "pharmacology"], ["management", "stabilization"], {
    relatedIds: ["magnesium-sulfate"],
    commonDistractorIds: ["magnesium-sulfate"],
    priority: "core"
  }),
  pregnancyNode("hellp-syndrome", "HELLP syndrome", ["hypertensive-disorders-pregnancy"], ["obstetrics", "internal medicine"], ["hematology", "hepatic"], ["diagnosis", "management"], {
    prerequisiteIds: ["preeclampsia-with-severe-features"],
    successorIds: ["eclampsia"],
    commonDistractorIds: ["acute-fatty-liver-pregnancy", "preeclampsia-with-severe-features"],
    priority: "core"
  }),
  pregnancyNode("eclampsia", "Eclampsia", ["hypertensive-disorders-pregnancy", "emergency-presentations"], ["obstetrics", "emergency medicine", "neurology"], ["neurologic"], ["diagnosis", "stabilization", "management"], {
    prerequisiteIds: ["preeclampsia-with-severe-features", "magnesium-sulfate"],
    priority: "core"
  }),
  pregnancyNode("third-trimester-bleeding", "Third-trimester bleeding", ["core-obstetrics", "emergency-presentations"], ["obstetrics", "emergency medicine"], ["reproductive", "vascular"], ["diagnosis", "stabilization"], {
    successorIds: ["placenta-previa", "placental-abruption", "vasa-previa", "uterine-rupture"],
    priority: "core"
  }),
  pregnancyNode("placenta-previa", "Placenta previa", ["third-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive"], ["diagnosis", "imaging choice"], {
    successorIds: ["placenta-previa-evaluation"],
    commonDistractorIds: ["placental-abruption", "vasa-previa"],
    priority: "core"
  }),
  pregnancyNode("placenta-previa-evaluation", "Placenta previa evaluation", ["third-trimester-bleeding"], ["obstetrics", "radiology"], ["reproductive"], ["initial test", "contraindication"], {
    prerequisiteIds: ["placenta-previa"],
    relatedIds: ["digital-exam-placenta-previa"],
    priority: "core"
  }),
  pregnancyNode("digital-exam-placenta-previa", "Digital exam in placenta previa", ["third-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive"], ["contraindication"], {
    prerequisiteIds: ["placenta-previa"],
    priority: "core"
  }),
  pregnancyNode("placental-abruption", "Placental abruption", ["third-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive", "vascular"], ["diagnosis", "stabilization"], {
    commonDistractorIds: ["placenta-previa", "uterine-rupture"],
    priority: "core"
  }),
  pregnancyNode("vasa-previa", "Vasa previa", ["third-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive", "fetal circulation"], ["diagnosis", "emergency delivery"], {
    commonDistractorIds: ["placenta-previa", "placental-abruption"],
    priority: "high"
  }),
  pregnancyNode("uterine-rupture", "Uterine rupture", ["third-trimester-bleeding", "emergency-presentations"], ["obstetrics", "surgery", "emergency medicine"], ["reproductive", "trauma"], ["diagnosis", "emergency surgery"], {
    commonDistractorIds: ["placental-abruption"],
    priority: "high"
  }),
  pregnancyNode("first-trimester-bleeding", "First-trimester bleeding", ["core-obstetrics"], ["obstetrics", "emergency medicine"], ["reproductive"], ["diagnosis", "management"], {
    successorIds: ["threatened-abortion", "inevitable-abortion", "incomplete-abortion", "ectopic-pregnancy", "molar-pregnancy"],
    priority: "core"
  }),
  pregnancyNode("threatened-abortion", "Threatened abortion", ["first-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive"], ["diagnosis", "reassurance"], { commonDistractorIds: ["inevitable-abortion"], priority: "core" }),
  pregnancyNode("inevitable-abortion", "Inevitable abortion", ["first-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive"], ["diagnosis", "management"], { commonDistractorIds: ["threatened-abortion", "incomplete-abortion"], priority: "core" }),
  pregnancyNode("incomplete-abortion", "Incomplete abortion", ["first-trimester-bleeding"], ["obstetrics", "emergency medicine"], ["reproductive"], ["diagnosis", "management"], { commonDistractorIds: ["inevitable-abortion"], priority: "core" }),
  pregnancyNode("ectopic-pregnancy", "Ectopic pregnancy", ["first-trimester-bleeding", "emergency-presentations"], ["obstetrics", "emergency medicine", "surgery"], ["reproductive"], ["diagnosis", "stability assessment", "management"], {
    successorIds: ["methotrexate-ectopic-pregnancy", "surgical-management-ectopic-pregnancy", "rh-alloimmunization"],
    commonDistractorIds: ["threatened-abortion", "molar-pregnancy"],
    priority: "core"
  }),
  pregnancyNode("methotrexate-ectopic-pregnancy", "Methotrexate criteria", ["first-trimester-bleeding"], ["obstetrics", "emergency medicine", "pharmacology"], ["reproductive", "pharmacology"], ["management"], { prerequisiteIds: ["ectopic-pregnancy"], priority: "core" }),
  pregnancyNode("surgical-management-ectopic-pregnancy", "Surgical management of ectopic pregnancy", ["first-trimester-bleeding"], ["obstetrics", "surgery", "emergency medicine"], ["reproductive"], ["management", "stabilization"], { prerequisiteIds: ["ectopic-pregnancy"], priority: "core" }),
  pregnancyNode("molar-pregnancy", "Molar pregnancy", ["first-trimester-bleeding"], ["obstetrics"], ["reproductive", "oncology"], ["diagnosis", "management"], { commonDistractorIds: ["ectopic-pregnancy"], priority: "high" }),
  pregnancyNode("labor-abnormalities", "Labor abnormalities", ["core-obstetrics"], ["obstetrics"], ["reproductive"], ["diagnosis", "management"], { successorIds: ["active-labor", "shoulder-dystocia", "tachysystole", "cord-prolapse"], priority: "core" }),
  pregnancyNode("active-labor", "Active labor", ["labor-abnormalities"], ["obstetrics"], ["reproductive"], ["diagnosis"], { priority: "core" }),
  pregnancyNode("shoulder-dystocia", "Shoulder dystocia", ["labor-abnormalities", "neonatology-connected-to-pregnancy"], ["obstetrics", "pediatrics"], ["reproductive", "musculoskeletal"], ["management", "neonatal injury prevention"], { relatedIds: ["shoulder-dystocia-neonatal-injury"], priority: "core" }),
  pregnancyNode("cord-prolapse", "Cord prolapse", ["labor-abnormalities", "emergency-presentations"], ["obstetrics", "emergency medicine"], ["fetal monitoring"], ["management", "emergency delivery"], { priority: "core" }),
  pregnancyNode("tachysystole", "Tachysystole", ["labor-abnormalities", "fetal-heart-tracing"], ["obstetrics"], ["reproductive", "pharmacology"], ["management"], { priority: "core" }),
  pregnancyNode("fetal-heart-tracing", "Fetal heart tracing", ["core-obstetrics"], ["obstetrics", "pediatrics"], ["fetal monitoring"], ["diagnosis", "management"], { successorIds: ["category-i-fetal-tracing", "late-decelerations", "variable-decelerations"], priority: "core" }),
  pregnancyNode("category-i-fetal-tracing", "Category I fetal tracing", ["fetal-heart-tracing"], ["obstetrics"], ["fetal monitoring"], ["diagnosis"], { commonDistractorIds: ["category-ii-fetal-tracing"], priority: "core" }),
  pregnancyNode("category-ii-fetal-tracing", "Category II tracing", ["fetal-heart-tracing"], ["obstetrics"], ["fetal monitoring"], ["diagnosis", "intrauterine resuscitation"], { priority: "core" }),
  pregnancyNode("category-iii-fetal-tracing", "Category III tracing", ["fetal-heart-tracing"], ["obstetrics", "emergency medicine"], ["fetal monitoring"], ["diagnosis", "emergency delivery"], { priority: "high" }),
  pregnancyNode("late-decelerations", "Late decelerations", ["fetal-heart-tracing"], ["obstetrics"], ["fetal monitoring"], ["diagnosis", "management"], { commonDistractorIds: ["variable-decelerations"], priority: "core" }),
  pregnancyNode("variable-decelerations", "Variable decelerations", ["fetal-heart-tracing"], ["obstetrics"], ["fetal monitoring"], ["diagnosis", "management"], { commonDistractorIds: ["late-decelerations"], priority: "core" }),
  pregnancyNode("postpartum-hemorrhage", "Postpartum hemorrhage", ["core-obstetrics", "postpartum", "emergency-presentations"], ["obstetrics", "emergency medicine"], ["reproductive", "vascular"], ["diagnosis", "stabilization", "management"], { successorIds: ["uterine-atony", "retained-placenta", "carboprost-contraindication", "methylergonovine-contraindication"], priority: "core" }),
  pregnancyNode("uterine-atony", "Uterine atony", ["postpartum-hemorrhage"], ["obstetrics", "emergency medicine"], ["reproductive"], ["diagnosis", "management"], { successorIds: ["initial-postpartum-hemorrhage-management"], commonDistractorIds: ["retained-placenta"], priority: "core" }),
  pregnancyNode("initial-postpartum-hemorrhage-management", "Initial postpartum hemorrhage management", ["postpartum-hemorrhage"], ["obstetrics", "emergency medicine"], ["reproductive"], ["next best step", "management"], { prerequisiteIds: ["uterine-atony"], priority: "core" }),
  pregnancyNode("retained-placenta", "Retained placenta", ["postpartum-hemorrhage"], ["obstetrics"], ["reproductive"], ["diagnosis", "management"], { commonDistractorIds: ["uterine-atony"], priority: "core" }),
  pregnancyNode("methylergonovine-contraindication", "Methylergonovine contraindication", ["postpartum-hemorrhage"], ["obstetrics", "internal medicine", "pharmacology"], ["cardiovascular", "pharmacology"], ["contraindication"], { commonDistractorIds: ["carboprost-contraindication"], priority: "core" }),
  pregnancyNode("carboprost-contraindication", "Carboprost contraindication", ["postpartum-hemorrhage"], ["obstetrics", "internal medicine", "pharmacology"], ["pulmonary", "pharmacology"], ["contraindication"], { commonDistractorIds: ["methylergonovine-contraindication"], priority: "core" }),
  pregnancyNode("prenatal-testing", "Prenatal testing", ["core-obstetrics", "family-preventive-care-in-pregnancy"], ["obstetrics", "family medicine"], ["genetics", "screening"], ["screening", "counseling"], { priority: "core" }),
  pregnancyNode("infections-in-pregnancy", "Infections in pregnancy", ["core-obstetrics", "internal-medicine-in-pregnancy"], ["obstetrics", "internal medicine", "infectious disease"], ["infectious disease"], ["diagnosis", "management", "prevention"], { successorIds: ["gbs-prophylaxis", "torch-infections", "congenital-syphilis", "congenital-cmv"], priority: "core" }),
  pregnancyNode("rh-alloimmunization", "Rh alloimmunization", ["core-obstetrics", "family-preventive-care-in-pregnancy"], ["obstetrics", "family medicine", "pediatrics"], ["hematology", "immunology"], ["prevention", "management"], { priority: "core" }),
  pregnancyNode("multiple-gestation", "Multiple gestation", ["core-obstetrics"], ["obstetrics"], ["reproductive"], ["diagnosis", "management", "risk assessment"], { priority: "medium" }),
  pregnancyNode("prom-pprom", "PROM / PPROM", ["core-obstetrics"], ["obstetrics", "pediatrics"], ["reproductive", "infectious disease"], ["diagnosis", "management"], { priority: "core" }),
  pregnancyNode("preterm-labor", "Preterm labor", ["core-obstetrics", "pediatrics-neonatology"], ["obstetrics", "pediatrics"], ["reproductive", "neonatology"], ["diagnosis", "management"], { relatedIds: ["gbs-prophylaxis", "antenatal-corticosteroids"], priority: "core" }),
  pregnancyNode("antenatal-corticosteroids", "Antenatal corticosteroids", ["core-obstetrics", "neonatology-connected-to-pregnancy"], ["obstetrics", "pediatrics"], ["neonatology", "pharmacology"], ["management", "prevention"], { prerequisiteIds: ["preterm-labor"], priority: "core" }),
  pregnancyNode("diabetes-in-pregnancy", "Diabetes in pregnancy", ["internal-medicine-in-pregnancy", "family-preventive-care-in-pregnancy"], ["internal medicine", "obstetrics", "family medicine"], ["endocrine", "cardiometabolic"], ["screening", "management"], { successorIds: ["gestational-diabetes-screening", "neonatal-hypoglycemia"], priority: "core" }),
  pregnancyNode("thyroid-disease-pregnancy", "Thyroid disease in pregnancy", ["internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["endocrine"], ["diagnosis", "management"], { priority: "high" }),
  pregnancyNode("asthma-in-pregnancy", "Asthma in pregnancy", ["internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["pulmonary"], ["management", "medication safety"], { relatedIds: ["carboprost-contraindication"], priority: "high" }),
  pregnancyNode("dvt-pe-pregnancy", "DVT / PE in pregnancy", ["internal-medicine-in-pregnancy", "emergency-presentations"], ["internal medicine", "obstetrics", "emergency medicine"], ["hematology", "pulmonary", "vascular"], ["diagnosis", "management"], { priority: "core" }),
  pregnancyNode("cardiac-disease-pregnancy", "Cardiac disease in pregnancy", ["internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["cardiovascular"], ["risk assessment", "management"], { priority: "high" }),
  pregnancyNode("lupus-aps-pregnancy", "Lupus / antiphospholipid syndrome in pregnancy", ["internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics", "rheumatology"], ["rheumatology", "hematology"], ["diagnosis", "management"], { priority: "high" }),
  pregnancyNode("pyelonephritis-pregnancy", "Pyelonephritis in pregnancy", ["internal-medicine-in-pregnancy", "inpatient-medicine"], ["internal medicine", "obstetrics"], ["renal", "infectious disease"], ["diagnosis", "management"], { priority: "core" }),
  pregnancyNode("nephrolithiasis-pregnancy", "Nephrolithiasis in pregnancy", ["internal-medicine-in-pregnancy", "surgery-acute-abdomen-in-pregnancy"], ["internal medicine", "obstetrics", "emergency medicine"], ["renal"], ["diagnosis", "management"], { priority: "medium" }),
  pregnancyNode("liver-disease-pregnancy", "Liver disease in pregnancy", ["internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["hepatic"], ["diagnosis", "management"], { relatedIds: ["hellp-syndrome", "acute-fatty-liver-pregnancy"], priority: "high" }),
  pregnancyNode("acute-fatty-liver-pregnancy", "Acute fatty liver of pregnancy", ["internal-medicine-in-pregnancy"], ["internal medicine", "obstetrics"], ["hepatic"], ["diagnosis", "management"], { commonDistractorIds: ["hellp-syndrome"], priority: "high" }),
  pregnancyNode("seizures-pregnancy", "Seizures in pregnancy", ["internal-medicine-in-pregnancy", "emergency-presentations"], ["internal medicine", "obstetrics", "neurology"], ["neurologic"], ["diagnosis", "management"], { relatedIds: ["eclampsia", "magnesium-sulfate"], priority: "high" }),
  pregnancyNode("appendicitis-pregnancy", "Appendicitis in pregnancy", ["surgery-acute-abdomen-in-pregnancy"], ["surgery", "obstetrics", "emergency medicine"], ["gastrointestinal"], ["diagnosis", "management"], { priority: "core" }),
  pregnancyNode("cholecystitis-gallstones-pregnancy", "Cholecystitis / gallstones in pregnancy", ["surgery-acute-abdomen-in-pregnancy"], ["surgery", "obstetrics"], ["gastrointestinal", "hepatobiliary"], ["diagnosis", "management"], { priority: "high" }),
  pregnancyNode("trauma-pregnancy", "Trauma in pregnancy", ["surgery-acute-abdomen-in-pregnancy", "emergency-presentations"], ["surgery", "emergency medicine", "obstetrics"], ["trauma"], ["stabilization", "monitoring"], { relatedIds: ["fetal-monitoring-maternal-autonomy"], priority: "high" }),
  pregnancyNode("acute-abdomen-pregnancy", "Acute abdomen in pregnancy", ["surgery-acute-abdomen-in-pregnancy"], ["surgery", "emergency medicine", "obstetrics"], ["gastrointestinal", "reproductive"], ["diagnosis", "imaging choice"], { priority: "high" }),
  pregnancyNode("bowel-obstruction-pregnancy", "Bowel obstruction in pregnancy", ["surgery-acute-abdomen-in-pregnancy"], ["surgery", "obstetrics"], ["gastrointestinal"], ["diagnosis", "management"], { priority: "medium" }),
  pregnancyNode("depression-pregnancy", "Depression in pregnancy", ["psychiatry-pregnancy-postpartum"], ["psychiatry", "obstetrics", "family medicine"], ["psychiatry"], ["diagnosis", "management"], { relatedIds: ["ssri-use-pregnancy", "postpartum-depression"], priority: "core" }),
  pregnancyNode("ssri-use-pregnancy", "SSRI use in pregnancy", ["psychiatry-pregnancy-postpartum"], ["psychiatry", "obstetrics", "family medicine"], ["psychiatry", "pharmacology"], ["medication safety", "management"], { priority: "high" }),
  pregnancyNode("bipolar-disorder-pregnancy", "Bipolar disorder in pregnancy", ["psychiatry-pregnancy-postpartum"], ["psychiatry", "obstetrics"], ["psychiatry"], ["diagnosis", "management", "medication safety"], { relatedIds: ["lithium-pregnancy", "valproate-contraindication", "postpartum-psychosis"], priority: "high" }),
  pregnancyNode("lithium-pregnancy", "Lithium in pregnancy", ["psychiatry-pregnancy-postpartum"], ["psychiatry", "obstetrics", "pharmacology"], ["psychiatry", "pharmacology"], ["medication safety"], { priority: "medium" }),
  pregnancyNode("valproate-contraindication", "Valproate contraindication", ["psychiatry-pregnancy-postpartum"], ["psychiatry", "obstetrics", "pharmacology"], ["psychiatry", "pharmacology"], ["contraindication"], { priority: "core" }),
  pregnancyNode("postpartum-depression", "Postpartum depression", ["psychiatry-pregnancy-postpartum", "postpartum"], ["psychiatry", "obstetrics", "family medicine"], ["psychiatry"], ["diagnosis", "management", "safety"], { commonDistractorIds: ["postpartum-psychosis"], priority: "core" }),
  pregnancyNode("postpartum-psychosis", "Postpartum psychosis", ["psychiatry-pregnancy-postpartum", "postpartum"], ["psychiatry", "obstetrics", "emergency medicine"], ["psychiatry"], ["diagnosis", "safety", "management"], { commonDistractorIds: ["postpartum-depression"], priority: "core" }),
  pregnancyNode("substance-use-pregnancy", "Substance use in pregnancy", ["psychiatry-pregnancy-postpartum", "family-preventive-care-in-pregnancy"], ["psychiatry", "obstetrics", "family medicine"], ["psychiatry", "population health"], ["screening", "counseling", "management"], { priority: "high" }),
  pregnancyNode("gbs-prophylaxis", "GBS prophylaxis", ["neonatology-connected-to-pregnancy", "infections-in-pregnancy"], ["obstetrics", "pediatrics", "infectious disease"], ["infectious disease", "neonatology"], ["prevention", "management"], { priority: "core" }),
  pregnancyNode("neonatal-jaundice", "Neonatal jaundice", ["neonatology-connected-to-pregnancy"], ["pediatrics", "obstetrics"], ["neonatology", "hematology"], ["diagnosis", "management"], { relatedIds: ["rh-alloimmunization"], priority: "core" }),
  pregnancyNode("apgar", "APGAR", ["neonatology-connected-to-pregnancy"], ["pediatrics", "obstetrics"], ["neonatology"], ["assessment"], { priority: "core" }),
  pregnancyNode("neonatal-hypoglycemia", "Neonatal hypoglycemia", ["neonatology-connected-to-pregnancy"], ["pediatrics", "obstetrics", "internal medicine"], ["neonatology", "endocrine"], ["diagnosis", "management"], { relatedIds: ["diabetes-in-pregnancy"], priority: "core" }),
  pregnancyNode("torch-infections", "TORCH infections", ["neonatology-connected-to-pregnancy", "infections-in-pregnancy"], ["pediatrics", "obstetrics", "infectious disease"], ["infectious disease", "neonatology"], ["diagnosis", "prevention"], { successorIds: ["congenital-syphilis", "congenital-cmv"], priority: "high" }),
  pregnancyNode("congenital-syphilis", "Congenital syphilis", ["neonatology-connected-to-pregnancy", "infections-in-pregnancy"], ["pediatrics", "obstetrics", "infectious disease"], ["infectious disease", "neonatology"], ["diagnosis", "prevention"], { priority: "high" }),
  pregnancyNode("congenital-cmv", "Congenital CMV", ["neonatology-connected-to-pregnancy", "infections-in-pregnancy"], ["pediatrics", "obstetrics", "infectious disease"], ["infectious disease", "neonatology"], ["diagnosis"], { priority: "medium" }),
  pregnancyNode("breastfeeding-complications", "Breastfeeding complications", ["neonatology-connected-to-pregnancy", "postpartum"], ["pediatrics", "obstetrics", "family medicine"], ["neonatology", "breast"], ["diagnosis", "counseling"], { relatedIds: ["mastitis"], priority: "high" }),
  pregnancyNode("mastitis", "Mastitis", ["postpartum", "neonatology-connected-to-pregnancy"], ["obstetrics", "family medicine", "pediatrics"], ["breast", "infectious disease"], ["diagnosis", "management"], { relatedIds: ["breastfeeding-complications"], priority: "core" }),
  pregnancyNode("shoulder-dystocia-neonatal-injury", "Shoulder dystocia neonatal injury", ["neonatology-connected-to-pregnancy", "labor-abnormalities"], ["pediatrics", "obstetrics"], ["neonatology", "musculoskeletal"], ["complication"], { prerequisiteIds: ["shoulder-dystocia"], priority: "high" }),
  pregnancyNode("vaccination-pregnancy", "Vaccination in pregnancy", ["family-preventive-care-in-pregnancy"], ["family medicine", "obstetrics"], ["preventive care", "infectious disease"], ["vaccination", "counseling"], { priority: "core" }),
  pregnancyNode("prenatal-screening", "Prenatal screening", ["family-preventive-care-in-pregnancy", "prenatal-testing"], ["family medicine", "obstetrics"], ["screening", "genetics"], ["screening", "counseling"], { priority: "core" }),
  pregnancyNode("gestational-diabetes-screening", "Gestational diabetes screening", ["family-preventive-care-in-pregnancy", "diabetes-in-pregnancy"], ["family medicine", "obstetrics", "internal medicine"], ["endocrine", "screening"], ["screening"], { priority: "core" }),
  pregnancyNode("ipv-screening-pregnancy", "IPV screening", ["family-preventive-care-in-pregnancy"], ["family medicine", "obstetrics", "psychiatry"], ["preventive care", "safety"], ["screening", "counseling"], { priority: "high" }),
  pregnancyNode("smoking-cessation-pregnancy", "Smoking cessation", ["family-preventive-care-in-pregnancy"], ["family medicine", "obstetrics"], ["preventive care"], ["counseling"], { priority: "high" }),
  pregnancyNode("nutrition-weight-gain-pregnancy", "Nutrition and weight gain", ["family-preventive-care-in-pregnancy"], ["family medicine", "obstetrics"], ["preventive care"], ["counseling"], { priority: "medium" }),
  pregnancyNode("exercise-counseling-pregnancy", "Exercise counseling", ["family-preventive-care-in-pregnancy"], ["family medicine", "obstetrics"], ["preventive care"], ["counseling"], { priority: "medium" }),
  pregnancyNode("postpartum-contraception", "Postpartum contraception", ["family-preventive-care-in-pregnancy", "postpartum"], ["family medicine", "obstetrics"], ["reproductive", "preventive care"], ["counseling", "prevention"], { priority: "core" }),
  pregnancyNode("breastfeeding-counseling", "Breastfeeding counseling", ["family-preventive-care-in-pregnancy", "neonatology-connected-to-pregnancy"], ["family medicine", "obstetrics", "pediatrics"], ["preventive care", "neonatology"], ["counseling"], { priority: "core" }),
  pregnancyNode("maternal-refusal", "Maternal refusal", ["ethics-in-pregnancy"], ["ethics", "obstetrics"], ["ethics"], ["autonomy", "consent"], { priority: "core" }),
  pregnancyNode("capacity-pregnancy", "Capacity", ["ethics-in-pregnancy"], ["ethics", "obstetrics", "psychiatry"], ["ethics"], ["capacity"], { priority: "core" }),
  pregnancyNode("minor-consent-pregnancy", "Minor consent", ["ethics-in-pregnancy"], ["ethics", "obstetrics", "family medicine"], ["ethics"], ["consent", "confidentiality"], { priority: "high" }),
  pregnancyNode("confidentiality-pregnancy", "Confidentiality", ["ethics-in-pregnancy"], ["ethics", "obstetrics", "family medicine"], ["ethics"], ["confidentiality"], { priority: "high" }),
  pregnancyNode("emergency-delivery-decisions", "Emergency delivery decisions", ["ethics-in-pregnancy", "emergency-presentations"], ["ethics", "obstetrics", "emergency medicine"], ["ethics"], ["emergency consent", "stabilization"], { priority: "high" }),
  pregnancyNode("fetal-monitoring-maternal-autonomy", "Fetal monitoring and maternal autonomy", ["ethics-in-pregnancy", "fetal-heart-tracing"], ["ethics", "obstetrics"], ["ethics", "fetal monitoring"], ["autonomy", "monitoring"], { priority: "high" })
];

export const curriculumNodes: CurriculumNode[] = [
  ...topLevelContextNodes,
  ...pregnancyBranchNodes,
  ...pregnancyDetailNodes
];

export const questionCurriculumMap: Record<string, string[]> = {
  "gestational-hypertension": ["pregnancy", "hypertensive-disorders-pregnancy", "gestational-hypertension", "internal-medicine-in-pregnancy"],
  "preeclampsia-without-severe-features": ["pregnancy", "hypertensive-disorders-pregnancy", "preeclampsia-without-severe-features", "internal-medicine-in-pregnancy"],
  "preeclampsia-without-severe-feature": ["pregnancy", "hypertensive-disorders-pregnancy", "preeclampsia-without-severe-features", "internal-medicine-in-pregnancy"],
  "preeclampsia-with-severe-features": ["pregnancy", "hypertensive-disorders-pregnancy", "preeclampsia-with-severe-features", "emergency-presentations", "internal-medicine-in-pregnancy"],
  "preeclampsia-with-severe-feature": ["pregnancy", "hypertensive-disorders-pregnancy", "preeclampsia-with-severe-features", "emergency-presentations", "internal-medicine-in-pregnancy"],
  "magnesium-sulfate": ["pregnancy", "hypertensive-disorders-pregnancy", "magnesium-sulfate", "pharmacology-in-pregnancy", "emergency-presentations"],
  "placental-abruption": ["pregnancy", "third-trimester-bleeding", "placental-abruption", "emergency-presentations"],
  "uterine-atony": ["postpartum", "postpartum-hemorrhage", "uterine-atony", "emergency-presentations"],
  "initial-postpartum-hemorrhage-management": ["postpartum", "postpartum-hemorrhage", "initial-postpartum-hemorrhage-management", "emergency-presentations"],
  "retained-placenta": ["postpartum", "postpartum-hemorrhage", "retained-placenta"],
  "gbs-prophylaxis": ["pregnancy", "infections-in-pregnancy", "gbs-prophylaxis", "neonatology-connected-to-pregnancy", "pediatrics-neonatology"],
  "postpartum-psychosis": ["postpartum", "psychiatry-pregnancy-postpartum", "postpartum-psychosis", "psychiatry-behavioral-health", "emergency-presentations"],
  "ectopic-pregnancy": ["pregnancy", "first-trimester-bleeding", "ectopic-pregnancy", "surgery-acute-abdomen-in-pregnancy", "emergency-presentations"],
  "rh-immune-globulin": ["pregnancy", "first-trimester-bleeding", "rh-alloimmunization", "preventive-care"],
  "category-i-fetal-tracing": ["pregnancy", "fetal-heart-tracing", "category-i-fetal-tracing", "pediatrics-neonatology"],
  "carboprost-contraindication": ["postpartum", "postpartum-hemorrhage", "carboprost-contraindication", "internal-medicine-in-pregnancy"],
  "bacterial-vaginosis": ["womens-health", "infections-in-pregnancy", "internal-medicine-in-pregnancy"],
  "vulvovaginal-candidiasis": ["womens-health", "infections-in-pregnancy", "internal-medicine-in-pregnancy"]
};

export const shelfViewFilters: Record<string, string[]> = {
  [shelf.obgyn]: [
    "core-obstetrics",
    "internal-medicine-in-pregnancy",
    "surgery-acute-abdomen-in-pregnancy",
    "psychiatry-pregnancy-postpartum",
    "neonatology-connected-to-pregnancy",
    "family-preventive-care-in-pregnancy",
    "ethics-in-pregnancy",
    "womens-health",
    "postpartum"
  ],
  [shelf.family]: [
    "preventive-care",
    "chronic-disease-management",
    "womens-health",
    "pediatrics-neonatology",
    "psychiatry-behavioral-health",
    "family-preventive-care-in-pregnancy",
    "geriatrics"
  ],
  [shelf.im]: [
    "inpatient-medicine",
    "chronic-disease-management",
    "preventive-care",
    "internal-medicine-in-pregnancy",
    "psychiatry-behavioral-health",
    "emergency-presentations"
  ]
};

const curriculumNodeById = new Map(curriculumNodes.map((item) => [item.id, item]));

const conceptToNodeId = new Map(
  curriculumNodes.map((item) => [normalizeAnswer(item.title), item.id])
);

function slugify(value: string) {
  return normalizeAnswer(value).replace(/\s+/g, "-");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getCurriculumNode(id: string) {
  return curriculumNodeById.get(id);
}

export function getCurriculumNodeForConcept(concept: string) {
  return getCurriculumNode(conceptToNodeId.get(normalizeAnswer(concept)) ?? slugify(concept));
}

export function getCurriculumNodesForQuestion(questionKey: string) {
  return (questionCurriculumMap[slugify(questionKey)] ?? [])
    .map((id) => getCurriculumNode(id))
    .filter((item): item is CurriculumNode => Boolean(item));
}

export function getShelfViewNodes(shelfTag: string) {
  const filterIds = new Set(shelfViewFilters[shelfTag] ?? []);

  return curriculumNodes.filter((item) =>
    item.shelfTags.includes(shelfTag) ||
    item.parentIds?.some((parentId) => filterIds.has(parentId)) ||
    filterIds.has(item.id)
  );
}

function relationshipItems(
  nodeIds: string[] | undefined,
  reasonFor: (node: CurriculumNode) => string,
  priority: "recommended" | "explore"
): CurriculumLearningItem[] {
  return (nodeIds ?? [])
    .map((id) => getCurriculumNode(id))
    .filter((item): item is CurriculumNode => Boolean(item))
    .map((item) => ({
      nodeId: item.id,
      concept: item.title,
      reason: reasonFor(item),
      priority
    }));
}

function crossShelfParentItems(nodeForConcept: CurriculumNode): CurriculumLearningItem[] {
  return (nodeForConcept.parentIds ?? [])
    .map((id) => getCurriculumNode(id))
    .filter((item): item is CurriculumNode => Boolean(item))
    .filter((item) =>
      item.disciplineTags.some((tag) =>
        ["internal medicine", "surgery", "psychiatry", "pediatrics", "family medicine", "emergency medicine", "ethics"].includes(tag)
      )
    )
    .map((item) => ({
      nodeId: item.id,
      concept: item.title,
      reason: `Cross-shelf overlap: ${item.title}.`,
      priority: "explore" as const
    }));
}

export function getCurriculumLearningItems(correctAnswer: string, wasCorrect?: boolean) {
  const nodeForConcept = getCurriculumNodeForConcept(correctAnswer);
  if (!nodeForConcept) {
    return {
      node: undefined,
      items: [] as CurriculumLearningItem[]
    };
  }

  const successorReason = (_nextNode: CurriculumNode) => {
    if (wasCorrect === false) {
      return `Recommended because you missed ${nodeForConcept.title}.`;
    }

    return `Builds directly on ${nodeForConcept.title}.`;
  };

  const items = [
    ...relationshipItems(nodeForConcept.successorIds, successorReason, "recommended"),
    ...relationshipItems(
      nodeForConcept.commonDistractorIds,
      (item) => `Frequently confused with ${nodeForConcept.title}.`,
      "explore"
    ),
    ...relationshipItems(
      nodeForConcept.relatedIds,
      (item) => `Cross-shelf overlap: ${item.disciplineTags[0] ?? item.title}.`,
      "explore"
    ),
    ...crossShelfParentItems(nodeForConcept),
    ...relationshipItems(
      nodeForConcept.prerequisiteIds,
      (item) => `Prerequisite for ${nodeForConcept.title}.`,
      "explore"
    )
  ];

  return {
    node: nodeForConcept,
    items: unique(items.map((item) => item.nodeId))
      .map((id) => items.find((item) => item.nodeId === id))
      .filter((item): item is CurriculumLearningItem => Boolean(item))
  };
}
