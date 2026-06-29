import { biostatisticsSeeds } from "@/lib/subject-seeds/biostatistics";
import { emergencyMedicineSeeds } from "@/lib/subject-seeds/emergency-medicine";
import { ethicsSeeds } from "@/lib/subject-seeds/ethics";
import { familyMedicineSeeds } from "@/lib/subject-seeds/family-medicine";
import { internalMedicineSeeds } from "@/lib/subject-seeds/internal-medicine";
import { neurologySeeds } from "@/lib/subject-seeds/neurology";
import { obgynSeeds } from "@/lib/subject-seeds/obgyn";
import { pediatricsSeeds } from "@/lib/subject-seeds/pediatrics";
import { psychiatrySeeds } from "@/lib/subject-seeds/psychiatry";
import { surgerySeeds } from "@/lib/subject-seeds/surgery";
import {
  createDecisionTreeSeed,
  type ClinicalDecisionTreeSeed,
  type RapidRoundsConceptSeed,
  type RapidRoundsSubject
} from "@/lib/subject-seeds/seed-types";

export const SUBJECT_REGISTRY: Record<RapidRoundsSubject, RapidRoundsConceptSeed[]> = {
  "Internal Medicine": internalMedicineSeeds,
  Surgery: surgerySeeds,
  "OB/GYN": obgynSeeds,
  Pediatrics: pediatricsSeeds,
  Psychiatry: psychiatrySeeds,
  "Family Medicine": familyMedicineSeeds,
  "Emergency Medicine": emergencyMedicineSeeds,
  Neurology: neurologySeeds,
  Ethics: ethicsSeeds,
  Biostatistics: biostatisticsSeeds
};

export const SUBJECTS = Object.keys(SUBJECT_REGISTRY) as RapidRoundsSubject[];

export const allSubjectSeeds = SUBJECTS.flatMap((subject) => SUBJECT_REGISTRY[subject]);

const findSeed = (subject: RapidRoundsSubject, topic: string) =>
  SUBJECT_REGISTRY[subject].find((seed) => seed.topic.toLowerCase() === topic.toLowerCase()) ?? SUBJECT_REGISTRY[subject][0];

export const SUBJECT_DECISION_TREE_REGISTRY: Record<RapidRoundsSubject, ClinicalDecisionTreeSeed[]> = {
  "Internal Medicine": [
    createDecisionTreeSeed(findSeed("Internal Medicine", "GI bleed"), {
      illnessScript: "Upper GI bleeding is a staged resuscitation problem before it is an endoscopy problem.",
      initialPresentation: "hematemesis, melena, tachycardia, and concern for active upper GI bleeding",
      pertinentPositives: ["hematemesis", "melena", "tachycardia"],
      pertinentNegatives: ["no protected airway concern after stabilization", "no persistent shock after transfusion"],
      interventions: ["airway/breathing/circulation assessment with IV access, fluids, and type/cross", "packed red blood cell transfusion", "upper endoscopy"],
      downstreamStates: ["unstable bleed", "post-transfusion stabilization", "endoscopic evaluation", "recurrent bleeding escalation"],
      masteryPrerequisites: ["recognize instability", "know resuscitation precedes endoscopy", "recognize variceal features"]
    })
  ],
  Surgery: [createDecisionTreeSeed(findSeed("Surgery", "appendicitis"))],
  "OB/GYN": [createDecisionTreeSeed(findSeed("OB/GYN", "ectopic pregnancy"))],
  Pediatrics: [createDecisionTreeSeed(findSeed("Pediatrics", "bronchiolitis"))],
  Psychiatry: [createDecisionTreeSeed(findSeed("Psychiatry", "MDD"))],
  "Family Medicine": [createDecisionTreeSeed(findSeed("Family Medicine", "hypertension screening"))],
  "Emergency Medicine": [createDecisionTreeSeed(findSeed("Emergency Medicine", "sepsis resuscitation"))],
  Neurology: [createDecisionTreeSeed(findSeed("Neurology", "ischemic stroke"))],
  Ethics: [createDecisionTreeSeed(findSeed("Ethics", "decision-making capacity"))],
  Biostatistics: [createDecisionTreeSeed(findSeed("Biostatistics", "sensitivity"))]
};

export const allDecisionTreeSeeds = SUBJECTS.flatMap((subject) => SUBJECT_DECISION_TREE_REGISTRY[subject]);

export function getSubjectSeeds(subject?: string | null) {
  if (!subject) {
    return allSubjectSeeds;
  }

  return SUBJECT_REGISTRY[subject as RapidRoundsSubject] ?? [];
}

export function getSubjectDecisionTreeSeeds(subject?: string | null) {
  if (!subject) {
    return allDecisionTreeSeeds;
  }

  return SUBJECT_DECISION_TREE_REGISTRY[subject as RapidRoundsSubject] ?? [];
}

export function getSubjectSeedCounts() {
  return SUBJECTS.map((subject) => ({
    subject,
    count: SUBJECT_REGISTRY[subject].length
  }));
}

export function subjectSeedsAsClinicalSchemas() {
  return allSubjectSeeds.map((seed) => ({
    id: seed.id,
    name: seed.topic,
    category: seed.schema,
    clueTerms: [
      seed.topic,
      ...seed.pivotClues,
      ...seed.supportingClues,
      ...seed.contextualClues,
      ...seed.primaryDiscriminators,
      ...seed.managementRules
    ],
    expectedPivots: seed.pivotClues,
    commonConfusions: seed.commonTraps
  }));
}
