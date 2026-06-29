import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Pediatrics" as const;

const topics = [
  ["bronchiolitis", "infant with wheeze after viral prodrome", "supportive care and hydration", "avoid routine bronchodilators when classic bronchiolitis"],
  ["croup", "barky cough with inspiratory stridor", "viral upper airway illness", "separate croup from epiglottitis"],
  ["epiglottitis", "toxic child with drooling and tripod posture", "airway emergency", "do not agitate the airway"],
  ["Kawasaki disease", "fever for at least five days with mucocutaneous findings", "conjunctivitis, rash, extremity changes", "prevent coronary aneurysm"],
  ["congenital heart disease cyanotic lesion", "cyanosis not correcting with oxygen", "ductal-dependent physiology", "recognize need for prostaglandin when ductal-dependent"],
  ["neonatal jaundice", "bilirubin level by age in hours", "risk factors and direct versus indirect bilirubin", "distinguish physiologic from pathologic jaundice"],
  ["pyloric stenosis", "projectile nonbilious vomiting", "hypochloremic metabolic alkalosis", "rehydrate before pyloromyotomy"],
  ["intussusception", "episodic abdominal pain with currant jelly stool", "lead point or viral trigger", "air enema diagnosis and treatment"],
  ["developmental delay", "missed age-based milestone", "domain-specific delay", "screen broadly before labeling behavior"],
  ["child abuse", "injury inconsistent with history", "patterned bruises or fractures", "report suspected abuse"],
  ["febrile seizure", "brief generalized seizure with fever in young child", "return to baseline", "separate simple from complex febrile seizure"],
  ["meningitis", "fever with neck stiffness or altered mental status", "age-specific pathogens", "do not delay empiric therapy when unstable"],
  ["asthma pediatric exacerbation", "child with wheeze and increased work of breathing", "response to bronchodilator", "assess severity before disposition"],
  ["vaccine contraindications", "anaphylaxis or severe immunosuppression context", "live vaccine rules", "separate true contraindication from mild illness"]
] as const;

export const pediatricsSeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} pediatric illness-script decision schema`,
    questionArchetypes: ["Diagnosis", "Initial management", "Screening/prevention", "Complication"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["age, vaccination status, toxicity, hydration, and airway risk shape pediatric decisions"],
    commonTraps: [`missing the age-specific discriminator for ${topic}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["appearance, airway, hydration, and age determine urgency"],
    managementRules: [`Use age, stability, and the pivot clue to manage ${topic}.`],
    contraindications: ["avoid delaying airway or sepsis treatment in toxic children"],
    relatedConcepts: ["pediatric fever", "respiratory distress", "development"],
    guidelineReferences: ["AAP public clinical guidance"]
  })
);
