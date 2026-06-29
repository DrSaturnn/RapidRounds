import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "OB/GYN" as const;

const topics = [
  ["ectopic pregnancy", "first-trimester pain with no intrauterine pregnancy", "positive pregnancy test", "distinguish ectopic pregnancy from early intrauterine pregnancy loss"],
  ["spontaneous abortion", "first-trimester bleeding with pregnancy tissue or cervical change", "cramping and declining pregnancy viability", "classify threatened, inevitable, incomplete, complete, or missed abortion"],
  ["placenta previa", "painless third-trimester bleeding", "placental location near cervical os", "separate previa from painful abruption"],
  ["placental abruption", "painful third-trimester bleeding", "tender or rigid uterus", "separate abruption from painless previa"],
  ["preeclampsia", "hypertension after 20 weeks with proteinuria or severe features", "headache, LFTs, platelets, or renal dysfunction", "separate from gestational hypertension"],
  ["eclampsia", "seizure in a patient with preeclampsia features", "pregnancy or postpartum hypertension", "recognize seizure treatment with magnesium sulfate"],
  ["postpartum hemorrhage", "excessive bleeding after delivery", "boggy uterus or retained tissue clues", "identify cause before choosing uterotonic or procedure"],
  ["endometritis", "postpartum fever with uterine tenderness", "foul lochia", "separate from mastitis or wound infection"],
  ["septic pelvic thrombophlebitis", "persistent postpartum fever despite antibiotics", "pelvic thrombus physiology", "recognize diagnosis of exclusion after treatment failure"],
  ["PID", "pelvic pain with cervical motion tenderness", "mucopurulent discharge or STI risk", "separate PID from cervicitis"],
  ["ovarian torsion", "sudden unilateral pelvic pain", "adnexal mass or nausea", "treat as surgical emergency"],
  ["PCOS", "oligo-ovulation with hyperandrogenism", "polycystic ovaries or metabolic risk", "separate PCOS from thyroid or prolactin disorders"],
  ["endometriosis", "cyclic pelvic pain", "dyspareunia or infertility", "separate endometriosis from primary dysmenorrhea"],
  ["cervical cancer screening", "age and prior screening history", "HPV/Pap result pattern", "choose follow-up by age and result"],
  ["abnormal uterine bleeding", "bleeding pattern by age and pregnancy status", "structural versus ovulatory clues", "first exclude pregnancy and instability"]
] as const;

export const obgynSeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} reproductive and obstetric decision schema`,
    questionArchetypes: ["Diagnosis", "Next best step", "Initial management", "Complication"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["pregnancy status, timing, stability, and exam findings frame the decision"],
    commonTraps: [`choosing a nearby OB/GYN diagnosis before checking ${pivot}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["gestational age, hemodynamic stability, and contraindications refine management"],
    managementRules: [`Use timing, stability, and the pivot clue to manage ${topic}.`],
    contraindications: ["avoid unsafe procedures or medications when the pivot clue contraindicates them"],
    relatedConcepts: ["pregnancy bleeding", "pelvic pain", "postpartum infection"],
    guidelineReferences: ["ACOG public clinical guidance"]
  })
);
