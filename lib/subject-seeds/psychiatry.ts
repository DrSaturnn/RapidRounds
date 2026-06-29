import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Psychiatry" as const;

const topics = [
  ["MDD", "at least two weeks of depressed mood or anhedonia", "sleep, appetite, guilt, energy, concentration, suicidality", "separate MDD from bereavement and bipolar disorder"],
  ["bipolar disorder", "manic or hypomanic episode", "decreased need for sleep and elevated or irritable mood", "screen for mania before antidepressant monotherapy"],
  ["schizophrenia", "psychosis for at least six months with functional decline", "delusions, hallucinations, disorganized thought", "separate from brief psychotic and schizophreniform disorder"],
  ["schizoaffective disorder", "psychosis without mood symptoms plus mood episodes", "major mood syndrome overlap", "separate from mood disorder with psychotic features"],
  ["generalized anxiety disorder", "excessive worry for at least six months", "muscle tension and restlessness", "separate from panic disorder"],
  ["panic disorder", "recurrent unexpected panic attacks", "persistent worry about attacks", "separate from physiologic causes and specific phobia"],
  ["PTSD", "trauma exposure with intrusion and avoidance", "hyperarousal and negative mood changes", "separate PTSD from acute stress disorder by timing"],
  ["OCD", "obsessions with compulsions", "ego-dystonic intrusive thoughts", "separate from obsessive-compulsive personality traits"],
  ["anorexia nervosa", "restricted intake with low body weight", "fear of weight gain and body image disturbance", "recognize medical instability"],
  ["bulimia nervosa", "binge eating with compensatory behaviors", "normal or high body weight often present", "separate from binge-eating disorder"],
  ["somatic symptom disorder", "distressing somatic symptoms with excessive thoughts or behaviors", "symptom burden rather than feigning", "separate from illness anxiety disorder"],
  ["conversion disorder", "neurologic symptom incompatible with exam pattern", "functional neurologic deficit", "separate from malingering and factitious disorder"],
  ["substance withdrawal", "autonomic or neurologic symptoms after reduction in substance use", "substance-specific timeline", "recognize withdrawal emergencies"],
  ["neuroleptic malignant syndrome", "rigidity, fever, autonomic instability after dopamine blockade", "elevated CK", "separate from serotonin syndrome"],
  ["serotonin syndrome", "clonus, hyperreflexia, and autonomic instability after serotonergic exposure", "rapid onset", "separate from NMS rigidity"]
] as const;

export const psychiatrySeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} psychiatric diagnostic and safety schema`,
    questionArchetypes: ["Diagnosis", "Initial management", "Drug adverse effect", "Ethics/capacity"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["duration, functional impairment, safety risk, and substance/medication exposure frame the diagnosis"],
    commonTraps: [`missing duration or safety criteria for ${topic}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["suicide risk, psychosis, mania, and medical instability change management"],
    managementRules: [`Prioritize safety, medical stability, and diagnostic duration when managing ${topic}.`],
    contraindications: ["avoid antidepressant monotherapy when bipolar disorder is suspected"],
    relatedConcepts: ["suicide risk", "substance use", "capacity"],
    guidelineReferences: ["APA public practice guidance"]
  })
);
