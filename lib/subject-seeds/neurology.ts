import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Neurology" as const;

const topics = [
  ["ischemic stroke", "acute focal neurologic deficit", "last known well and vascular territory", "determine reperfusion eligibility"],
  ["intracranial hemorrhage", "acute neurologic deficit with hemorrhage on imaging", "severe headache or anticoagulation", "separate hemorrhage from ischemic stroke before anticoagulation"],
  ["seizure management", "transient abnormal electrical activity with postictal state", "provoking cause evaluation", "separate seizure from syncope"],
  ["status epilepticus", "prolonged seizure or recurrent seizures without recovery", "airway and benzodiazepine first", "escalate therapy rapidly"],
  ["multiple sclerosis", "relapsing neurologic deficits separated in time and space", "optic neuritis or internuclear ophthalmoplegia", "separate MS from stroke and peripheral neuropathy"],
  ["Guillain-Barre syndrome", "ascending weakness with areflexia", "post-infectious pattern", "monitor respiratory function"],
  ["myasthenia gravis", "fatigable weakness", "ptosis and diplopia", "separate from Lambert-Eaton and botulism"],
  ["Parkinson disease", "resting tremor with bradykinesia and rigidity", "asymmetric onset", "distinguish Parkinsonism causes"],
  ["dementia types", "progressive cognitive decline pattern", "memory, behavior, movement, or vascular clues", "match dementia type to clinical pattern"],
  ["migraine", "recurrent unilateral throbbing headache with photophobia or nausea", "aura when present", "separate from cluster and dangerous secondary headache"],
  ["cluster headache", "unilateral orbital pain with autonomic symptoms", "short attacks in clusters", "treat acutely with oxygen or triptan when appropriate"],
  ["spinal cord compression", "back pain with neurologic deficit or bladder symptoms", "cancer or infection risk", "urgent MRI and decompression pathway"]
] as const;

export const neurologySeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} neurologic localization and time-sensitive decision schema`,
    questionArchetypes: ["Diagnosis", "Initial management", "Mechanism/pathophysiology", "Complication"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["localization, tempo, imaging, and safety determine neurologic decisions"],
    commonTraps: [`missing localization or timing clue for ${topic}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["airway, spinal cord, hemorrhage, and reperfusion windows change urgency"],
    managementRules: [`Localize first, then use time and stability to manage ${topic}.`],
    contraindications: ["avoid thrombolysis when hemorrhage or exclusion criteria are present"],
    relatedConcepts: ["stroke", "seizure", "neuromuscular weakness"],
    guidelineReferences: ["AAN public guidance", "AHA/ASA stroke guidance"]
  })
);
