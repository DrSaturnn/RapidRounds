import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Surgery" as const;

const topics = [
  ["appendicitis", "migratory right lower quadrant pain", "anorexia and fever", "distinguish appendicitis from gastroenteritis or ovarian pathology"],
  ["cholecystitis", "right upper quadrant pain with fever", "positive Murphy sign", "distinguish cholecystitis from biliary colic"],
  ["ascending cholangitis", "fever, jaundice, and right upper quadrant pain", "hypotension or altered mental status", "recognize biliary infection needing urgent drainage"],
  ["pancreatitis", "epigastric pain radiating to the back", "elevated lipase", "separate pancreatitis from biliary disease or perforation"],
  ["bowel obstruction", "vomiting, distention, and obstipation", "prior abdominal surgery", "distinguish obstruction from ileus"],
  ["mesenteric ischemia", "pain out of proportion to exam", "atrial fibrillation or vascular disease", "recognize vascular emergency before peritonitis"],
  ["diverticulitis", "left lower quadrant pain with fever", "colonic inflammation on imaging", "separate uncomplicated from complicated diverticulitis"],
  ["breast mass workup", "new dominant breast mass", "age-appropriate imaging", "choose imaging before reassurance"],
  ["trauma shock", "hypotension after trauma", "unstable trauma primary survey", "prioritize hemorrhage control and resuscitation"],
  ["compartment syndrome", "pain out of proportion after injury", "pain with passive stretch", "recognize fasciotomy emergency"],
  ["necrotizing fasciitis", "severe pain with systemic toxicity", "rapid progression or crepitus", "do not delay surgery for imaging when unstable"],
  ["postoperative fever", "timing after surgery", "atelectasis, infection, VTE, or drug cause", "use postoperative day timing as the discriminator"],
  ["hernia complications", "irreducible painful hernia", "obstruction or strangulation signs", "separate incarcerated from strangulated hernia"]
] as const;

export const surgerySeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} surgical decision schema`,
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Complication"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["acute surgical presentation", "stability and peritoneal signs guide urgency"],
    commonTraps: [`missing ${pivot} as the discriminator`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["hemodynamic instability and peritonitis escalate management"],
    managementRules: [`Use stability, imaging need, and operative urgency to manage ${topic}.`],
    contraindications: ["avoid delaying operative management when instability or peritonitis is present"],
    relatedConcepts: ["acute abdomen", "sepsis", "perioperative complications"],
    guidelineReferences: ["Public surgical education and society guidance"]
  })
);
