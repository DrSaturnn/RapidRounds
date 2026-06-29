import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Family Medicine" as const;

const topics = [
  ["hypertension screening", "accurate repeated blood pressure measurement", "out-of-office confirmation when appropriate", "separate screening from treatment escalation"],
  ["diabetes management", "A1c and comorbidity-driven therapy", "lifestyle plus medication selection", "match therapy to ASCVD, CKD, weight, and hypoglycemia risk"],
  ["hyperlipidemia prevention", "ASCVD risk and statin benefit group", "LDL and risk enhancers", "choose prevention intensity by risk"],
  ["USPSTF cancer screening", "age and risk-based screening interval", "average-risk versus high-risk status", "do not screen outside beneficial windows"],
  ["osteoporosis screening", "age or fracture-risk indication", "DEXA threshold", "screen postmenopausal risk appropriately"],
  ["adult vaccination", "age, pregnancy, immune status, and risk indications", "live vaccine precautions", "separate contraindication from precaution"],
  ["smoking cessation", "readiness and pharmacotherapy choice", "nicotine replacement, varenicline, or bupropion", "combine counseling and medication when ready"],
  ["contraception counseling", "patient priorities and contraindications", "estrogen risk factors", "match method to safety and goals"],
  ["prenatal counseling", "preconception risks and early pregnancy prevention", "folic acid and medication safety", "optimize before conception when possible"],
  ["depression screening", "validated screening with follow-up diagnostic assessment", "PHQ symptoms and safety", "positive screen is not the end of evaluation"],
  ["obesity counseling", "BMI with comorbidity assessment", "behavioral intervention and medication/surgery eligibility", "match intensity to risk and readiness"],
  ["chronic pain management", "function-focused treatment plan", "opioid risk assessment", "avoid opioid-first chronic noncancer pain approach"]
] as const;

export const familyMedicineSeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} primary care prevention and longitudinal management schema`,
    questionArchetypes: ["Screening/prevention", "Next best step", "Prognosis/counseling", "Risk factor"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["age, risk factors, patient goals, and contraindications guide primary care decisions"],
    commonTraps: [`applying ${topic} rules without checking age, risk, or contraindications`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["shared decision-making and risk category refine management"],
    managementRules: [`Use guideline thresholds and patient context to apply ${topic}.`],
    contraindications: ["avoid screening or therapy when harms exceed expected benefit"],
    relatedConcepts: ["prevention", "counseling", "chronic disease management"],
    guidelineReferences: ["USPSTF recommendations", "CDC adult immunization schedule"]
  })
);
