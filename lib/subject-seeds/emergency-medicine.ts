import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Emergency Medicine" as const;

const topics = [
  ["ACS rule-out", "chest pain risk stratification with ECG and troponin", "serial testing when appropriate", "identify STEMI before rule-out pathway"],
  ["stroke thrombolysis window", "last known well time", "noncontrast head CT excludes hemorrhage", "match reperfusion eligibility to time and contraindications"],
  ["anaphylaxis", "airway or circulatory symptoms after exposure", "epinephrine is first-line", "do not substitute antihistamines for epinephrine"],
  ["sepsis resuscitation", "infection with hypotension or elevated lactate", "early antibiotics and fluids", "restore perfusion while seeking source control"],
  ["DKA emergency management", "hyperglycemia with acidosis and ketones", "fluids and potassium before insulin safety", "avoid insulin before potassium assessment"],
  ["acute asthma", "work of breathing and peak flow reduction", "bronchodilator and steroid escalation", "recognize impending respiratory failure"],
  ["pneumothorax", "sudden pleuritic pain with absent breath sounds", "tension physiology", "decompress unstable tension pneumothorax"],
  ["toxic alcohol ingestion", "anion gap acidosis with osmolar gap", "visual symptoms or renal injury", "recognize antidote and dialysis indications"],
  ["opioid overdose", "respiratory depression with miosis", "naloxone response", "ventilation comes first when needed"],
  ["acetaminophen toxicity", "timing of ingestion and acetaminophen level", "Rumack-Matthew risk assessment", "use NAC when indicated"],
  ["serotonin syndrome", "clonus and hyperreflexia after serotonergic exposure", "autonomic instability", "separate from NMS"],
  ["heat stroke", "hyperthermia with CNS dysfunction", "exertional or environmental heat exposure", "rapid cooling is the key treatment"],
  ["trauma primary survey", "airway, breathing, circulation sequence", "unstable trauma physiology", "treat life threats before detailed diagnosis"]
] as const;

export const emergencyMedicineSeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} emergency stabilization schema`,
    questionArchetypes: ["Initial management", "Diagnosis", "Complication", "Drug adverse effect"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["stability, time window, exposure, and immediate threats guide emergency care"],
    commonTraps: [`choosing diagnostic completeness before stabilizing ${topic}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["airway, breathing, circulation, and time-sensitive contraindications change the first action"],
    managementRules: [`Stabilize immediate threats first, then confirm and refine ${topic}.`],
    contraindications: ["avoid delaying time-sensitive lifesaving treatment for nonessential testing"],
    relatedConcepts: ["shock", "toxidromes", "resuscitation"],
    guidelineReferences: ["ACEP public clinical policy", "AHA emergency cardiovascular care guidance"]
  })
);
